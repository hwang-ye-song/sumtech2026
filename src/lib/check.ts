// 조합 점검(F3)과 하루 기준량 확인. 판정은 DB의 interaction_rule·substance 조회로만 한다.
// 같은 목록은 몇 번을 점검해도 같은 결과가 나온다.
import { getDb } from './db'
import { itemKey, nameItems, substancesInDrugs, type ItemRef } from './catalog'
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
}

interface RuleRow {
  id: string
  a_type: 'drug' | 'substance'
  a_ref: string
  b_type: 'drug' | 'substance'
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
}

const SEVERITY: Record<Relation, number> = { avoid: 0, separate_timing: 1, consult: 2, caution: 3 }

/** 목록 항목 하나가 판정에 내놓는 대상: 자기 자신과(약이면) 그 약에 든 영양 성분 */
interface Provider {
  index: number
  key: string
  /** 약에 든 성분으로 내놓은 것이면 그 약 이름 */
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

function toWarning(r: RuleRow, a: WarningSide, b: WarningSide): Warning {
  return {
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
  const drugs = items.filter((i) => i.type === 'drug')
  const [inDrugs, named] = await Promise.all([substancesInDrugs(drugs.map((i) => i.ref)), nameItems(drugs)])
  const drugName = new Map(named.map((n) => [n.ref, n.name]))
  const out: Provider[] = []
  items.forEach((item, index) => {
    out.push({ index, key: itemKey(item), viaDrug: null })
    if (item.type === 'drug') {
      for (const id of inDrugs.get(item.ref) ?? []) {
        out.push({ index, key: `substance:${id}`, viaDrug: drugName.get(item.ref) ?? item.ref })
      }
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
  const db = await getDb()
  const rules = await db.query<RuleRow>('SELECT * FROM interaction_rule')
  const providers = await providersFor(items)
  const byKey = new Map<string, Provider[]>()
  for (const p of providers) byKey.set(p.key, [...(byKey.get(p.key) ?? []), p])
  const focusIndex = focus ? items.findIndex((i) => itemKey(i) === itemKey(focus)) : -1

  const matched: { rule: RuleRow; pa: Provider; pb: Provider }[] = []
  for (const rule of rules) {
    const as = byKey.get(`${rule.a_type}:${rule.a_ref}`) ?? []
    const bs = byKey.get(`${rule.b_type}:${rule.b_ref}`) ?? []
    let found: { pa: Provider; pb: Provider } | null = null
    for (const pa of as) {
      for (const pb of bs) {
        if (pa.index === pb.index) continue
        if (focus && pa.index !== focusIndex && pb.index !== focusIndex) continue
        // 직접 등록한 항목끼리 걸린 것을 약 성분으로 걸린 것보다 먼저 쓴다.
        if (!found || (!pa.viaDrug && !pb.viaDrug)) found = { pa, pb }
      }
    }
    if (found) matched.push({ rule, ...found })
  }
  if (matched.length === 0) return []

  const refs: ItemRef[] = []
  for (const { rule } of matched) refs.push({ type: rule.a_type, ref: rule.a_ref }, { type: rule.b_type, ref: rule.b_ref })
  const named = await nameItems(refs)
  const labelOf = new Map(named.map((n) => [itemKey(n), n.label]))
  const side = (type: 'drug' | 'substance', ref: string, p: Provider): WarningSide => {
    const label = labelOf.get(`${type}:${ref}`) ?? ref
    return { type, ref, name: p.viaDrug ? `${label}(${p.viaDrug} 성분)` : label }
  }

  const warnings = matched.map(({ rule: r, pa, pb }) => toWarning(r, side(r.a_type, r.a_ref, pa), side(r.b_type, r.b_ref, pb)))
  warnings.sort((x, y) => SEVERITY[x.relation] - SEVERITY[y.relation] || x.ruleId.localeCompare(y.ruleId))
  return warnings
}

/** 근거 화면('자세히')용: 규칙 하나 */
export async function getRule(id: string): Promise<Warning | null> {
  const db = await getDb()
  const rows = await db.query<RuleRow>('SELECT * FROM interaction_rule WHERE id = $1', [id])
  const r = rows[0]
  if (!r) return null
  const named = await nameItems([
    { type: r.a_type, ref: r.a_ref },
    { type: r.b_type, ref: r.b_ref },
  ])
  return toWarning(r, { type: r.a_type, ref: r.a_ref, name: named[0].label }, { type: r.b_type, ref: r.b_ref, name: named[1].label })
}

/** '약·영양제 알아보기'용: 규칙 전체(양쪽 이름은 경고에 쓰는 이름 그대로) */
export async function listAllRules(): Promise<Warning[]> {
  const db = await getDb()
  const rows = await db.query<RuleRow>('SELECT * FROM interaction_rule ORDER BY id')
  const named = await nameItems(rows.flatMap((r) => [{ type: r.a_type, ref: r.a_ref }, { type: r.b_type, ref: r.b_ref }]))
  const labelOf = new Map(named.map((n) => [itemKey(n), n.label]))
  const out = rows.map((r) =>
    toWarning(
      r,
      { type: r.a_type, ref: r.a_ref, name: labelOf.get(`${r.a_type}:${r.a_ref}`) ?? r.a_ref },
      { type: r.b_type, ref: r.b_ref, name: labelOf.get(`${r.b_type}:${r.b_ref}`) ?? r.b_ref },
    ),
  )
  out.sort((x, y) => SEVERITY[x.relation] - SEVERITY[y.relation] || x.ruleId.localeCompare(y.ruleId))
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
