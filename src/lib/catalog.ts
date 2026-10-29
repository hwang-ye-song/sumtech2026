// 약·성분 검색과 이름 조회. 판정 대상은 drug(일반의약품 품목)과 substance(성분) 두 종류다.
import { getDb } from './db'

export type ItemType = 'drug' | 'substance'

export interface ItemRef {
  type: ItemType
  ref: string
}

export interface CatalogHit extends ItemRef {
  name: string
  /** 화면에 작게 보여 줄 보조 설명(분류·회사 또는 성분 종류) */
  sub: string
}

export function itemKey(item: ItemRef): string {
  return `${item.type}:${item.ref}`
}

export function parseItemKey(key: string): ItemRef | null {
  const idx = key.indexOf(':')
  if (idx < 0) return null
  const type = key.slice(0, idx)
  const ref = key.slice(idx + 1)
  if ((type !== 'drug' && type !== 'substance') || !ref) return null
  return { type, ref }
}

function likePattern(q: string): string {
  const escaped = q.replace(/[\\%_]/g, (m) => `\\${m}`)
  return `%${escaped}%`
}

export function kindLabel(kind: string): string {
  if (kind === 'rx_ingredient') return '처방약 성분'
  if (kind === 'nutrient') return '영양제 성분'
  return kind
}

export async function searchCatalog(rawQuery: string, limit = 20): Promise<CatalogHit[]> {
  const q = rawQuery.trim().replace(/\s+/g, '')
  if (!q) return []
  const db = await getDb()
  const pattern = likePattern(q)

  const substances = await db.query<{ id: string; name: string; kind: string; exact: boolean }>(
    `SELECT id, name, kind, (lower(name) = lower($2)) AS exact
       FROM substance
      WHERE name ILIKE $1
         OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(aliases) AS a WHERE a ILIKE $1)
      ORDER BY (lower(name) = lower($2)) DESC, length(name), name
      LIMIT $3`,
    [pattern, q, limit],
  )
  const drugs = await db.query<{ item_seq: string; item_name: string; company: string | null; category: string | null }>(
    `SELECT item_seq, item_name, company, category
       FROM drug
      WHERE replace(item_name, ' ', '') ILIKE $1
      ORDER BY length(item_name), item_name
      LIMIT $2`,
    [pattern, limit],
  )

  const hits: CatalogHit[] = [
    ...substances.map((s) => ({ type: 'substance' as const, ref: s.id, name: s.name, sub: kindLabel(s.kind) })),
    ...drugs.map((d) => ({
      type: 'drug' as const,
      ref: d.item_seq,
      name: d.item_name,
      sub: ['일반의약품', d.category, d.company].filter(Boolean).join(' · '),
    })),
  ]
  return hits.slice(0, limit)
}

export interface NamedItem extends ItemRef {
  name: string
  sub: string
}

/** 여러 항목의 이름을 한 번에 가져온다. 없는 참조는 이름 대신 참조 값을 보여 준다. */
export async function nameItems(items: ItemRef[]): Promise<NamedItem[]> {
  if (items.length === 0) return []
  const db = await getDb()
  const drugRefs = items.filter((i) => i.type === 'drug').map((i) => i.ref)
  const subRefs = items.filter((i) => i.type === 'substance').map((i) => i.ref)
  const names = new Map<string, { name: string; sub: string }>()

  // 참조 값(품목코드·성분 id)에는 쉼표가 없으므로 쉼표로 이어 넘기고 DB에서 배열로 푼다(pg·PGlite 공통).
  if (drugRefs.length) {
    const rows = await db.query<{ item_seq: string; item_name: string; category: string | null }>(
      `SELECT item_seq, item_name, category FROM drug WHERE item_seq = ANY(string_to_array($1, ','))`,
      [drugRefs.join(',')],
    )
    for (const r of rows) names.set(`drug:${r.item_seq}`, { name: r.item_name, sub: ['일반의약품', r.category].filter(Boolean).join(' · ') })
  }
  if (subRefs.length) {
    const rows = await db.query<{ id: string; name: string; kind: string }>(
      `SELECT id, name, kind FROM substance WHERE id = ANY(string_to_array($1, ','))`,
      [subRefs.join(',')],
    )
    for (const r of rows) names.set(`substance:${r.id}`, { name: r.name, sub: kindLabel(r.kind) })
  }
  return items.map((i) => {
    const n = names.get(itemKey(i))
    return { ...i, name: n?.name ?? i.ref, sub: n?.sub ?? '' }
  })
}

/** 사용자가 먹는 일반의약품에 든 영양 성분 표기(drug_ingredient.nutrient) 집합 */
export async function nutrientsInDrugs(drugRefs: string[]): Promise<Set<string>> {
  if (drugRefs.length === 0) return new Set()
  const db = await getDb()
  const rows = await db.query<{ nutrient: string }>(
    `SELECT DISTINCT nutrient FROM drug_ingredient WHERE nutrient IS NOT NULL AND item_seq = ANY(string_to_array($1, ','))`,
    [drugRefs.join(',')],
  )
  return new Set(rows.map((r) => r.nutrient))
}
