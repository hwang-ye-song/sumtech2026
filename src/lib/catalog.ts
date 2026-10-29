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

/** 목록을 '약'·'영양제' 두 칸으로 나눌 때 쓴다. 영양제 성분만 영양제, 일반의약품·처방약 성분은 약이다. */
export function isSupplement(item: Pick<CatalogHit, 'type' | 'sub'>): boolean {
  return item.type === 'substance' && item.sub === kindLabel('nutrient')
}

// '비타민씨'처럼 영문 글자를 한글로 적은 검색어
const VITAMIN_LETTER: Record<string, string> = { 에이: 'a', 비: 'b', 씨: 'c', 디: 'd', 이: 'e', 케이: 'k' }

/** 검색어를 비교용으로 맞춘다: 소문자, 띄어쓰기·하이픈 제거, '비타민씨' → '비타민c' */
export function normalizeQuery(raw: string): string {
  const q = raw.trim().toLowerCase().replace(/[\s-]+/g, '')
  const m = q.match(/^비타민(에이|케이|비|씨|디|이)(.*)$/)
  return m ? `비타민${VITAMIN_LETTER[m[1]]}${m[2]}` : q
}

// DB 쪽 값도 같은 규칙(소문자, 띄어쓰기·하이픈 제거)으로 맞춰 비교한다.
const norm = (col: string) => `replace(replace(lower(${col}), ' ', ''), '-', '')`

export async function searchCatalog(rawQuery: string, limit = 20): Promise<CatalogHit[]> {
  const q = normalizeQuery(rawQuery)
  if (!q) return []
  const db = await getDb()
  const pattern = likePattern(q)

  // 이름·다른 이름·쉬운 이름(예: 레보티록신(갑상선약) → '갑상선약')으로 찾는다.
  const substances = await db.query<{ id: string; name: string; kind: string; exact: boolean }>(
    `SELECT id, name, kind, (${norm('name')} = $2) AS exact
       FROM substance
      WHERE ${norm('name')} LIKE $1
         OR ${norm("coalesce(display_name, '')")} LIKE $1
         OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(aliases) AS a WHERE ${norm('a')} LIKE $1)
      ORDER BY (${norm('name')} = $2) DESC, length(name), name
      LIMIT $3`,
    [pattern, q, limit],
  )
  const drugs = await db.query<{ item_seq: string; item_name: string; company: string | null; category: string | null }>(
    `SELECT item_seq, item_name, company, category
       FROM drug
      WHERE ${norm('item_name')} LIKE $1
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
  /** 경고에 보일 이름. 처방약 성분은 무슨 약인지 붙인다(예: 레보티록신(갑상선약)). */
  label: string
  /** 개수 단위: 약은 '정', 영양제는 '알' */
  countUnit: '정' | '알'
}

/** 여러 항목의 이름을 한 번에 가져온다. 없는 참조는 이름 대신 참조 값을 보여 준다. */
export async function nameItems(items: ItemRef[]): Promise<NamedItem[]> {
  if (items.length === 0) return []
  const db = await getDb()
  const drugRefs = items.filter((i) => i.type === 'drug').map((i) => i.ref)
  const subRefs = items.filter((i) => i.type === 'substance').map((i) => i.ref)
  const names = new Map<string, { name: string; sub: string; label: string; countUnit: '정' | '알' }>()

  // 참조 값(품목코드·성분 id)에는 쉼표가 없으므로 쉼표로 이어 넘기고 DB에서 배열로 푼다(pg·PGlite 공통).
  if (drugRefs.length) {
    const rows = await db.query<{ item_seq: string; item_name: string; category: string | null }>(
      `SELECT item_seq, item_name, category FROM drug WHERE item_seq = ANY(string_to_array($1, ','))`,
      [drugRefs.join(',')],
    )
    for (const r of rows) {
      names.set(`drug:${r.item_seq}`, { name: r.item_name, sub: ['일반의약품', r.category].filter(Boolean).join(' · '), label: r.item_name, countUnit: '정' })
    }
  }
  if (subRefs.length) {
    const rows = await db.query<{ id: string; name: string; kind: string; display_name: string | null }>(
      `SELECT id, name, kind, display_name FROM substance WHERE id = ANY(string_to_array($1, ','))`,
      [subRefs.join(',')],
    )
    for (const r of rows) {
      names.set(`substance:${r.id}`, {
        name: r.name,
        sub: kindLabel(r.kind),
        label: r.display_name ?? r.name,
        countUnit: r.kind === 'rx_ingredient' ? '정' : '알',
      })
    }
  }
  return items.map((i) => {
    const n = names.get(itemKey(i))
    return { ...i, name: n?.name ?? i.ref, sub: n?.sub ?? '', label: n?.label ?? n?.name ?? i.ref, countUnit: n?.countUnit ?? '알' }
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

/**
 * 일반의약품에 든 영양 성분을 성분 id로 바꾼다(drug_ingredient.nutrient ↔ substance.nutrient_keys).
 * 예: 훼로바-유서방정(건조황산제일철) → iron. 성분 규칙(레보티록신×철분 등)을 약 품목에도 적용하는 데 쓴다.
 */
export async function substancesInDrugs(drugRefs: string[]): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>()
  if (drugRefs.length === 0) return out
  const db = await getDb()
  const rows = await db.query<{ item_seq: string; id: string }>(
    `SELECT DISTINCT di.item_seq, s.id
       FROM drug_ingredient di
       JOIN substance s ON EXISTS (SELECT 1 FROM jsonb_array_elements_text(s.nutrient_keys) AS k WHERE k = di.nutrient)
      WHERE di.item_seq = ANY(string_to_array($1, ','))`,
    [drugRefs.join(',')],
  )
  for (const r of rows) out.set(r.item_seq, [...(out.get(r.item_seq) ?? []), r.id])
  return out
}
