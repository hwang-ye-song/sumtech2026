// 약·영양제 검색과 이름 조회. 목록에 넣을 수 있는 것은 세 종류다.
//   drug(약 제품) · health_food(건강기능식품 제품) · substance(성분 이름으로 등록: 칼슘, 레보티록신 …)
// 제품은 product_substance로 이어진 성분을 통해 조합 규칙에 걸린다.
import { getDb } from './db'

export type ItemType = 'drug' | 'health_food' | 'substance'
const ITEM_TYPES: ItemType[] = ['drug', 'health_food', 'substance']

export interface ItemRef {
  type: ItemType
  ref: string
}

export interface CatalogHit extends ItemRef {
  name: string
  /** 화면에 작게 보여 줄 보조 설명(구분·회사 또는 성분 종류) */
  sub: string
}

export function itemKey(item: ItemRef): string {
  return `${item.type}:${item.ref}`
}

export function parseItemKey(key: string): ItemRef | null {
  const idx = key.indexOf(':')
  if (idx < 0) return null
  const type = key.slice(0, idx) as ItemType
  const ref = key.slice(idx + 1)
  if (!ITEM_TYPES.includes(type) || !ref) return null
  return { type, ref }
}

const escapeLike = (q: string) => q.replace(/[\\%_]/g, (m) => `\\${m}`)

function likePattern(q: string): string {
  return `%${escapeLike(q)}%`
}

function prefixPattern(q: string): string {
  return `${escapeLike(q)}%`
}

export const HEALTH_FOOD_LABEL = '건강기능식품'

export function kindLabel(kind: string): string {
  if (kind === 'rx_ingredient') return '처방약 성분'
  if (kind === 'otc_ingredient') return '일반의약품 성분'
  if (kind === 'nutrient') return '영양제 성분'
  return kind
}

/** 목록을 '약'·'영양제' 두 칸으로 나눌 때 쓴다. 영양제 성분과 건강기능식품은 영양제, 나머지는 약이다. */
export function isSupplement(item: Pick<CatalogHit, 'type' | 'sub'>): boolean {
  return item.type === 'health_food' || (item.type === 'substance' && item.sub === kindLabel('nutrient'))
}

const drugSub = (category: string | null, company: string | null) => [category ?? '의약품', company].filter(Boolean).join(' · ')
const foodSub = (company: string | null) => [HEALTH_FOOD_LABEL, company].filter(Boolean).join(' · ')

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

/** 성분 → 제품 순으로 찾는다. 성분 이름과 똑같은 검색어(예: 칼슘)는 그 성분이 맨 위에 온다. */
export async function searchCatalog(rawQuery: string, limit = 20): Promise<CatalogHit[]> {
  const q = normalizeQuery(rawQuery)
  if (!q) return []
  const db = await getDb()
  const pattern = likePattern(q)

  // 이름·다른 이름·쉬운 이름(예: 레보티록신(갑상선약) → '갑상선약')으로 찾는다.
  const substances = await db.query<{ id: string; name: string; kind: string }>(
    `SELECT id, name, kind
       FROM substance
      WHERE ${norm('name')} LIKE $1
         OR ${norm("coalesce(display_name, '')")} LIKE $1
         OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(aliases) AS a WHERE ${norm('a')} LIKE $1)
      ORDER BY (${norm('name')} = $2) DESC, length(name), name
      LIMIT $3`,
    [pattern, q, limit],
  )
  // 약은 제품명으로, 성분명으로도 찾는다(예: '레보티록신' → 씬지로이드정, '아세트아미노펜' → 판콜에이내복액).
  // '칼슘'으로 크레스토정(로수바스타틴칼슘)이 나오지 않게, 성분명은 앞부분이 맞을 때만(아세트아미노펜 → 아세트아미노펜미분화) 찾고
  // 이어진 성분 검색은 약 성분(처방약·일반의약품 성분)으로만 한다.
  const drugs = await db.query<{ item_seq: string; name: string; company: string | null; category: string | null }>(
    `SELECT item_seq, name, company, category
       FROM drug d
      WHERE ${norm('name')} LIKE $1
         OR EXISTS (SELECT 1 FROM product_substance ps JOIN substance s ON s.id = ps.substance_id
                     WHERE ps.product_type = 'drug' AND ps.product_ref = d.item_seq AND s.kind <> 'nutrient' AND ${norm('s.name')} LIKE $1)
         OR EXISTS (SELECT 1 FROM drug_ingredient di WHERE di.item_seq = d.item_seq AND ${norm('di.ingredient_name')} LIKE $3)
      ORDER BY (${norm('name')} LIKE $1) DESC, length(name), name
      LIMIT $2`,
    [pattern, limit, prefixPattern(q)],
  )
  const foods = await db.query<{ report_no: string; name: string; company: string | null }>(
    `SELECT report_no, name, company
       FROM health_food
      WHERE ${norm('name')} LIKE $1 OR ${norm("coalesce(pick_category, '')")} LIKE $1
      ORDER BY (${norm('name')} LIKE $1) DESC, length(name), name
      LIMIT $2`,
    [pattern, limit],
  )

  // 순서: 성분 → 이름이 맞는 제품 → 범주·성분으로만 맞는 제품. '칼슘'이면 칼슘, 광동 칼슘…, 크레스토정(로수바스타틴칼슘) 순.
  const nameHit = (name: string) => normalizeQuery(name).includes(q)
  const drugHits = drugs.map((d) => ({ type: 'drug' as const, ref: d.item_seq, name: d.name, sub: drugSub(d.category, d.company) }))
  const foodHits = foods.map((f) => ({ type: 'health_food' as const, ref: f.report_no, name: f.name, sub: foodSub(f.company) }))
  const isRx = (h: CatalogHit) => h.sub.startsWith('전문의약품')
  const products = [...drugHits.filter((h) => !isRx(h)), ...foodHits, ...drugHits.filter(isRx)]
  const hits: CatalogHit[] = [
    ...substances.map((s) => ({ type: 'substance' as const, ref: s.id, name: s.name, sub: kindLabel(s.kind) })),
    ...products.filter((h) => nameHit(h.name)),
    ...products.filter((h) => !nameHit(h.name)),
  ]
  return hits.slice(0, limit)
}

/** 검색어 없이 보여 줄 전체 목록(알아보기 화면) */
export async function listCatalog(): Promise<CatalogHit[]> {
  const db = await getDb()
  const [subs, drugs, foods] = await Promise.all([
    db.query<{ id: string; name: string; kind: string }>('SELECT id, name, kind FROM substance ORDER BY kind DESC, name'),
    db.query<{ item_seq: string; name: string; category: string | null; company: string | null }>('SELECT item_seq, name, category, company FROM drug ORDER BY name'),
    db.query<{ report_no: string; name: string; company: string | null }>('SELECT report_no, name, company FROM health_food ORDER BY name'),
  ])
  return [
    ...subs.map((s) => ({ type: 'substance' as const, ref: s.id, name: s.name, sub: kindLabel(s.kind) })),
    ...drugs.map((d) => ({ type: 'drug' as const, ref: d.item_seq, name: d.name, sub: drugSub(d.category, d.company) })),
    ...foods.map((f) => ({ type: 'health_food' as const, ref: f.report_no, name: f.name, sub: foodSub(f.company) })),
  ]
}

export interface NamedItem extends ItemRef {
  name: string
  sub: string
  /** 경고에 보일 이름. 처방약 성분은 무슨 약인지 붙인다(예: 레보티록신(갑상선약)). */
  label: string
  /** 개수 단위: 약은 '정', 영양제는 '알' */
  countUnit: '정' | '알'
}

// 참조 값(품목코드·신고번호·성분 id)에는 쉼표가 없으므로 쉼표로 이어 넘기고 DB에서 배열로 푼다(pg·PGlite 공통).
const refsOf = (items: ItemRef[], type: ItemType) => items.filter((i) => i.type === type).map((i) => i.ref)

/** 여러 항목의 이름을 한 번에 가져온다. 없는 참조는 이름 대신 참조 값을 보여 준다. */
export async function nameItems(items: ItemRef[]): Promise<NamedItem[]> {
  if (items.length === 0) return []
  const db = await getDb()
  const names = new Map<string, Omit<NamedItem, keyof ItemRef>>()

  const drugRefs = refsOf(items, 'drug')
  if (drugRefs.length) {
    const rows = await db.query<{ item_seq: string; name: string; category: string | null; company: string | null }>(
      `SELECT item_seq, name, category, company FROM drug WHERE item_seq = ANY(string_to_array($1, ','))`,
      [drugRefs.join(',')],
    )
    for (const r of rows) names.set(`drug:${r.item_seq}`, { name: r.name, sub: drugSub(r.category, r.company), label: r.name, countUnit: '정' })
  }
  const foodRefs = refsOf(items, 'health_food')
  if (foodRefs.length) {
    const rows = await db.query<{ report_no: string; name: string; company: string | null }>(
      `SELECT report_no, name, company FROM health_food WHERE report_no = ANY(string_to_array($1, ','))`,
      [foodRefs.join(',')],
    )
    for (const r of rows) names.set(`health_food:${r.report_no}`, { name: r.name, sub: foodSub(r.company), label: r.name, countUnit: '알' })
  }
  const subRefs = refsOf(items, 'substance')
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
        countUnit: r.kind === 'nutrient' ? '알' : '정',
      })
    }
  }
  return items.map((i) => {
    const n = names.get(itemKey(i))
    return { ...i, name: n?.name ?? i.ref, sub: n?.sub ?? '', label: n?.label ?? n?.name ?? i.ref, countUnit: n?.countUnit ?? '알' }
  })
}

/** 참조가 실제로 있는 항목인지 */
export async function itemExists(item: ItemRef): Promise<boolean> {
  const db = await getDb()
  const sql =
    item.type === 'drug'
      ? 'SELECT 1 FROM drug WHERE item_seq = $1'
      : item.type === 'health_food'
        ? 'SELECT 1 FROM health_food WHERE report_no = $1'
        : 'SELECT 1 FROM substance WHERE id = $1'
  return (await db.query(sql, [item.ref])).length > 0
}

/**
 * 제품(약·건강기능식품)에 든 성분 id. 키는 itemKey(예: 'health_food:200400200142074' → ['calcium']).
 * 성분 규칙(레보티록신×칼슘 등)을 제품에도 적용하고, 추천에서 이미 먹는 성분을 빼는 데 쓴다.
 */
export async function substancesInProducts(items: ItemRef[]): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>()
  const products = items.filter((i) => i.type !== 'substance')
  if (products.length === 0) return out
  const db = await getDb()
  const rows = await db.query<{ product_type: string; product_ref: string; substance_id: string }>(
    `SELECT product_type, product_ref, substance_id FROM product_substance
      WHERE (product_type || ':' || product_ref) = ANY(string_to_array($1, ','))
      ORDER BY product_type, product_ref, substance_id`,
    [products.map(itemKey).join(',')],
  )
  for (const r of rows) {
    const key = `${r.product_type}:${r.product_ref}`
    out.set(key, [...(out.get(key) ?? []), r.substance_id])
  }
  return out
}

/** 약 설명서 주의 문장의 대상 종류. 화면에 작은 배지로 보인다. */
export const CAUTION_TYPE_LABEL: Record<string, string> = {
  duplicate: '같은 성분',
  alcohol: '음주',
  drug: '다른 약',
  supplement_nutrient: '영양제',
  food_drink: '음식·음료',
  caffeine: '카페인',
  other: '기타',
}
// 화면 순서: 음주·같은 성분 중복처럼 누구에게나 해당하는 것부터
const CAUTION_ORDER = ['alcohol', 'duplicate', 'drug', 'supplement_nutrient', 'food_drink', 'caffeine', 'other']

export interface ProductNote {
  /** 약 설명서(식약처 e약은요)의 주의 문장. 같은 문장은 한 번만 */
  cautions: { type: string; quote: string }[]
  /** 이 제품의 원문 주소(약: e약은요, 없으면 의약품 허가정보) */
  sourceUrl: string | null
  sourceTitle: string | null
  /** 건강기능식품의 '섭취 시 주의사항'(식약처 신고 문구) */
  precautions: string | null
}

/**
 * 알아보기 화면용: 제품 설명서에 적힌 주의사항. 조합 규칙과 별개로 원문을 그대로 보여 준다.
 * (예: 타이레놀은 영양제 조합 기록은 없지만 e약은요에 '복용 중에 음주하지 마십시오'가 있다)
 */
export async function productNotes(items: ItemRef[]): Promise<Map<string, ProductNote>> {
  const out = new Map<string, ProductNote>()
  const db = await getDb()
  const drugRefs = refsOf(items, 'drug')
  if (drugRefs.length) {
    const [drugs, cautions] = await Promise.all([
      db.query<{ item_seq: string; easy_source_url: string | null; source_url: string }>(
        `SELECT item_seq, easy_source_url, source_url FROM drug WHERE item_seq = ANY(string_to_array($1, ','))`,
        [drugRefs.join(',')],
      ),
      db.query<{ item_seq: string; counterpart_type: string; relation: string; quote: string }>(
        `SELECT item_seq, counterpart_type, relation, quote FROM drug_caution WHERE item_seq = ANY(string_to_array($1, ',')) ORDER BY item_seq, id`,
        [drugRefs.join(',')],
      ),
    ])
    for (const d of drugs) {
      const sorted = cautions
        .filter((c) => c.item_seq === d.item_seq)
        .map((c) => ({ type: c.relation === 'duplicate_ingredient' ? 'duplicate' : c.counterpart_type, quote: c.quote }))
        .sort((x, y) => CAUTION_ORDER.indexOf(x.type) - CAUTION_ORDER.indexOf(y.type))
      const seen = new Set<string>()
      const unique = sorted.filter((c) => !seen.has(c.quote) && seen.add(c.quote))
      // 카드에는 몇 줄만 보이므로 종류마다 하나씩 먼저 두고(음주 → 같은 성분 → 다른 약 …) 나머지를 뒤에 둔다.
      const firstOfType = unique.filter((c, i) => unique.findIndex((x) => x.type === c.type) === i)
      out.set(`drug:${d.item_seq}`, {
        cautions: [...firstOfType, ...unique.filter((c) => !firstOfType.includes(c))],
        sourceUrl: d.easy_source_url ?? d.source_url,
        sourceTitle: d.easy_source_url ? '식약처 e약은요 원문' : '식약처 의약품 허가정보',
        precautions: null,
      })
    }
  }
  const foodRefs = refsOf(items, 'health_food')
  if (foodRefs.length) {
    const rows = await db.query<{ report_no: string; precautions: string | null }>(
      `SELECT report_no, precautions FROM health_food WHERE report_no = ANY(string_to_array($1, ','))`,
      [foodRefs.join(',')],
    )
    for (const r of rows) {
      out.set(`health_food:${r.report_no}`, { cautions: [], sourceUrl: null, sourceTitle: null, precautions: r.precautions?.trim() || null })
    }
  }
  return out
}
