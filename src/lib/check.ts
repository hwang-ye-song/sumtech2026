// 조합 점검(F3)과 하루 기준량 확인. 판정은 DB의 interaction_rule·substance 조회로만 한다.
// 같은 목록은 몇 번을 점검해도 같은 결과가 나온다.
import { getDb } from './db'
import { itemKey, nameItems, substancesInProducts, type ItemRef, type ItemType } from './catalog'
import type { Relation } from './labels'
import type { UserItem } from './items'

export { RELATION_LABEL, type Relation } from './labels'

export interface RuleSource {
  source_id: string
  source_title: string
  source_url: string
  source_kind: string
  source_note: string | null
  quote: string
  quote_ko: string | null
}

export interface WarningSide extends ItemRef {
  /** 화면에 보일 이름. 약에 든 성분으로 걸렸으면 '철분(훼로바-유서방정 성분)'처럼 적는다. */
  name: string
}

export interface Warning {
  ruleId: string
  relation: Relation
  a: WarningSide
  b: WarningSide
  effect: string | null
  action: string
  pharmacist_question: string
  /** 첫 번째가 대표 출처다. */
  sources: RuleSource[]
  checked_on: string | null
  /** 팀원 조합 모음의 심각도(major/moderate/minor). 원래 규칙은 null */
  severity: string | null
  /** 문제가 되는 용량·형태 조건 */
  condition: string | null
  /** 이 규칙 양쪽에 걸리는 항목 키(알아보기 화면용) */
  members: { a: string[]; b: string[] }
}

/** a_type·b_type: 원래 규칙은 drug/substance, 팀원 조합 모음은 group(양쪽 멤버는 rule_member) */
type RuleSideType = ItemType | 'group'

interface RuleRow {
  id: string
  a_type: RuleSideType
  a_ref: string
  b_type: RuleSideType
  b_ref: string
  relation: Relation
  effect: string | null
  quote: string
  quote_ko: string | null
  action: string
  pharmacist_question: string
  source_id: string
  source_title: string
  source_url: string
  source_kind: string
  source_note: string | null
  more_sources: RuleSource[] | string | null
  checked_on: string | null
  a_label: string | null
  b_label: string | null
  severity: string | null
  condition: string | null
}

/** 규칙과 양쪽에 걸리는 항목 키 */
interface LoadedRule {
  row: RuleRow
  a: string[]
  b: string[]
}

async function loadRules(where = '', params: unknown[] = []): Promise<LoadedRule[]> {
  const db = await getDb()
  const rows = await db.query<RuleRow>(`SELECT * FROM interaction_rule ${where} ORDER BY id`, params)
  const members = await db.query<{ rule_id: string; side: 'a' | 'b'; item_type: string; item_ref: string }>(
    `SELECT rule_id, side, item_type, item_ref FROM rule_member`,
  )
  const bySide = new Map<string, string[]>()
  for (const m of members) {
    const k = `${m.rule_id}|${m.side}`
    bySide.set(k, [...(bySide.get(k) ?? []), `${m.item_type}:${m.item_ref}`])
  }
  return rows.map((row) => ({
    row,
    a: row.a_type === 'group' ? (bySide.get(`${row.id}|a`) ?? []) : [`${row.a_type}:${row.a_ref}`],
    b: row.b_type === 'group' ? (bySide.get(`${row.id}|b`) ?? []) : [`${row.b_type}:${row.b_ref}`],
  }))
}

const SEVERITY: Record<Relation, number> = { avoid: 0, separate_timing: 1, consult: 2, caution: 3 }
const RULE_SEVERITY: Record<string, number> = { major: 0, moderate: 1, minor: 2 }

/** 화면 순서: 행동이 무거운 것 → 심각도 → 원래 규칙(식약처·논문 직접 확인) → id */
function compareWarnings(x: Warning, y: Warning): number {
  return (
    SEVERITY[x.relation] - SEVERITY[y.relation] ||
    (RULE_SEVERITY[x.severity ?? 'moderate'] ?? 1) - (RULE_SEVERITY[y.severity ?? 'moderate'] ?? 1) ||
    Number(x.ruleId.startsWith('ni-')) - Number(y.ruleId.startsWith('ni-')) ||
    x.ruleId.localeCompare(y.ruleId)
  )
}

/** 목록 항목 하나가 판정에 내놓는 대상: 자기 자신과(제품이면) 그 제품에 든 성분 */
interface Provider {
  index: number
  key: string
  /** 제품에 든 성분으로 내놓은 것이면 그 제품 이름 */
  viaDrug: string | null
}

function parseSources(v: RuleRow['more_sources']): RuleSource[] {
  if (!v) return []
  if (typeof v === 'string') {
    try {
      return JSON.parse(v) as RuleSource[]
    } catch {
      return []
    }
  }
  return v
}

function toWarning(r: RuleRow, a: WarningSide, b: WarningSide, members: { a: string[]; b: string[] } = { a: [], b: [] }): Warning {
  return {
    severity: r.severity,
    condition: r.condition,
    members,
    ruleId: r.id,
    relation: r.relation,
    a,
    b,
    effect: r.effect,
    action: r.action,
    pharmacist_question: r.pharmacist_question,
    sources: [
      {
        source_id: r.source_id,
        source_title: r.source_title,
        source_url: r.source_url,
        source_kind: r.source_kind,
        source_note: r.source_note,
        quote: r.quote,
        quote_ko: r.quote_ko,
      },
      ...parseSources(r.more_sources),
    ],
    checked_on: r.checked_on,
  }
}

async function providersFor(items: ItemRef[]): Promise<Provider[]> {
  const products = items.filter((i) => i.type !== 'substance')
  const [inProducts, named] = await Promise.all([substancesInProducts(products), nameItems(products)])
  const productName = new Map(named.map((n) => [itemKey(n), n.name]))
  const out: Provider[] = []
  items.forEach((item, index) => {
    const key = itemKey(item)
    out.push({ index, key, viaDrug: null })
    for (const id of inProducts.get(key) ?? []) {
      out.push({ index, key: `substance:${id}`, viaDrug: productName.get(key) ?? item.ref })
    }
  })
  return out
}

/**
 * 목록 전체(또는 focus 항목이 끼는 조합만)의 경고를 돌려준다.
 * 약 품목은 그 약에 든 영양 성분으로도 성분 규칙에 걸린다. 같은 항목 안의 성분끼리는 맞춰 보지 않는다.
 */
export async function checkItems(items: ItemRef[], focus?: ItemRef): Promise<Warning[]> {
  if (items.length < 2) return []
  const rules = await loadRules()
  const providers = await providersFor(items)
  const byKey = new Map<string, Provider[]>()
  for (const p of providers) byKey.set(p.key, [...(byKey.get(p.key) ?? []), p])
  const focusIndex = focus ? items.findIndex((i) => itemKey(i) === itemKey(focus)) : -1

  const matched: { rule: LoadedRule; pa: Provider; pb: Provider }[] = []
  for (const rule of rules) {
    const as = rule.a.flatMap((k) => byKey.get(k) ?? [])
    const bs = rule.b.flatMap((k) => byKey.get(k) ?? [])
    let found: { pa: Provider; pb: Provider } | null = null
    for (const pa of as) {
      for (const pb of bs) {
        if (pa.index === pb.index) continue
        if (focus && pa.index !== focusIndex && pb.index !== focusIndex) continue
        // 직접 등록한 항목끼리 걸린 것을 제품 성분으로 걸린 것보다 먼저 쓴다.
        if (!found || (!pa.viaDrug && !pb.viaDrug)) found = { pa, pb }
      }
    }
    if (found) matched.push({ rule, ...found })
  }
  if (matched.length === 0) return []

  // 경고 양쪽 이름: 걸린 항목(성분이면 쉬운 이름, 제품 성분으로 걸렸으면 '철분(광동 철분 성분)')
  const keys = [...new Set(matched.flatMap(({ pa, pb }) => [pa.key, pb.key]))]
  const named = await nameItems(keys.map((k) => parseKey(k)))
  const labelOf = new Map(named.map((n) => [itemKey(n), n.label]))
  const side = (p: Provider): WarningSide => {
    const ref = parseKey(p.key)
    const label = labelOf.get(p.key) ?? ref.ref
    return { ...ref, name: p.viaDrug ? `${label}(${p.viaDrug} 성분)` : label }
  }

  // 같은 두 항목에 규칙이 여럿 걸리면(원래 규칙과 조합 모음이 겹치는 등) 가장 무거운 하나만 보여 주고 출처를 합친다.
  const byPair = new Map<string, Warning[]>()
  for (const { rule, pa, pb } of matched) {
    const w = toWarning(rule.row, side(pa), side(pb), { a: rule.a, b: rule.b })
    const pair = [pa.index, pb.index].sort((x, y) => x - y).join('-')
    byPair.set(pair, [...(byPair.get(pair) ?? []), w])
  }
  // 대표는 원래 규칙(식약처·논문 원문을 직접 대조한 것)을 먼저 쓰고, 팀원 조합 모음의 출처는 그 아래에 더한다.
  const curatedFirst = (x: Warning, y: Warning) => Number(x.ruleId.startsWith('ni-')) - Number(y.ruleId.startsWith('ni-')) || compareWarnings(x, y)
  const warnings = [...byPair.values()].map((ws) => {
    const [top, ...rest] = ws.sort(curatedFirst)
    const urls = new Set(top.sources.map((s) => s.source_url))
    for (const s of rest.flatMap((w) => w.sources)) {
      if (urls.has(s.source_url) || top.sources.length >= 5) continue
      urls.add(s.source_url)
      top.sources.push(s)
    }
    return top
  })
  warnings.sort(compareWarnings)
  return warnings
}

function parseKey(key: string): ItemRef {
  const idx = key.indexOf(':')
  return { type: key.slice(0, idx) as ItemType, ref: key.slice(idx + 1) }
}

/** 규칙 하나를 화면용으로(목록과 상관없이 규칙 자체의 양쪽 이름) */
async function describeRules(rules: LoadedRule[]): Promise<Warning[]> {
  const plain = rules.filter((r) => r.row.a_type !== 'group')
  const named = await nameItems(
    plain.flatMap(({ row }) => [
      { type: row.a_type as ItemType, ref: row.a_ref },
      { type: row.b_type as ItemType, ref: row.b_ref },
    ]),
  )
  const labelOf = new Map(named.map((n) => [itemKey(n), n.label]))
  const sideOf = (type: RuleSideType, ref: string, label: string | null): WarningSide =>
    type === 'group'
      ? { type: 'substance', ref, name: label ?? ref }
      : { type, ref, name: labelOf.get(`${type}:${ref}`) ?? ref }
  return rules.map(({ row, a, b }) => toWarning(row, sideOf(row.a_type, row.a_ref, row.a_label), sideOf(row.b_type, row.b_ref, row.b_label), { a, b }))
}

/** 근거 화면('자세히')용: 규칙 하나 */
export async function getRule(id: string): Promise<Warning | null> {
  const rules = await loadRules('WHERE id = $1', [id])
  if (rules.length === 0) return null
  return (await describeRules(rules))[0]
}

/** '약·영양제 알아보기'용: 규칙 전체 */
export async function listAllRules(): Promise<Warning[]> {
  const out = await describeRules(await loadRules())
  out.sort(compareWarnings)
  return out
}

/** 추천 후보(성분)마다 지금 목록과 걸리는 경고. 걸리지 않는 후보는 결과에 없다. */
export async function warningsForCandidates(items: ItemRef[], candidateIds: string[]): Promise<Map<string, Warning[]>> {
  const out = new Map<string, Warning[]>()
  for (const id of candidateIds) {
    const cand: ItemRef = { type: 'substance', ref: id }
    const ws = await checkItems([...items, cand], cand)
    if (ws.length > 0) out.set(id, ws)
  }
  return out
}

export interface IntakeWarning {
  substanceId: string
  name: string
  unit: string
  total: number
  /** 예: '2알 × 1500mg' */
  breakdown: string
  limits: { label: string; amount: number }[]
  /** 모든 나이 기준을 넘으면 true, 일부 나이 기준만 넘으면 false */
  overAll: boolean
  quote: string
  source_title: string
  source_url: string
  checked_on: string | null
}

interface UpperLimit {
  unit: string
  limits: { label: string; amount: number }[]
  quote: string
  source_title: string
  source_url: string
  checked_on?: string
}

/** 한 알 함량을 넣은 영양제의 하루 양이 출처의 하루 기준량을 넘는지 본다(S8). */
export async function checkIntake(items: UserItem[]): Promise<IntakeWarning[]> {
  const withAmount = items.filter((i) => i.type === 'substance' && i.unit_amount !== null)
  if (withAmount.length === 0) return []
  const db = await getDb()
  const rows = await db.query<{ id: string; name: string; upper_limit: UpperLimit | string | null }>(
    `SELECT id, name, upper_limit FROM substance WHERE upper_limit IS NOT NULL AND id = ANY(string_to_array($1, ','))`,
    [withAmount.map((i) => i.ref).join(',')],
  )
  const out: IntakeWarning[] = []
  for (const row of rows) {
    const limit: UpperLimit = typeof row.upper_limit === 'string' ? JSON.parse(row.upper_limit) : (row.upper_limit as UpperLimit)
    const mine = withAmount.filter((i) => i.ref === row.id && (i.unit ?? 'mg') === limit.unit)
    if (mine.length === 0) continue
    const total = mine.reduce((sum, i) => sum + i.daily_count * (i.unit_amount ?? 0), 0)
    const lowest = Math.min(...limit.limits.map((l) => l.amount))
    const highest = Math.max(...limit.limits.map((l) => l.amount))
    if (total <= lowest) continue
    out.push({
      substanceId: row.id,
      name: row.name,
      unit: limit.unit,
      total,
      breakdown: mine.map((i) => `${i.daily_count}${i.countUnit} × ${i.unit_amount}${limit.unit}`).join(' + '),
      limits: limit.limits,
      overAll: total > highest,
      quote: limit.quote,
      source_title: limit.source_title,
      source_url: limit.source_url,
      checked_on: limit.checked_on ?? null,
    })
  }
  return out
}
