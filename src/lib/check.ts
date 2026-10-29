// 조합 점검(F3). 판정은 DB의 interaction_rule 조회로만 한다. 같은 조합은 몇 번을 해도 같은 결과가 나온다.
import { getDb } from './db'
import { itemKey, nameItems, type ItemRef } from './catalog'
import type { Relation } from './labels'

export { RELATION_LABEL, SAFE_MESSAGE, sourceLinkLabel, type Relation } from './labels'

export interface Warning {
  ruleId: string
  relation: Relation
  a: ItemRef & { name: string }
  b: ItemRef & { name: string }
  effect: string | null
  quote: string
  quote_ko: string | null
  action: string
  pharmacist_question: string
  source_id: string
  source_title: string
  source_url: string
  source_kind: string
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
}

const SEVERITY: Record<Relation, number> = { avoid: 0, separate_timing: 1, consult: 2, caution: 3 }

/**
 * 목록 전체(또는 focus 항목이 끼는 조합만)의 경고를 돌려준다.
 * 규칙 표가 작으므로 전부 읽어 메모리에서 짝을 맞춘다.
 */
export async function checkItems(items: ItemRef[], focus?: ItemRef): Promise<Warning[]> {
  if (items.length < 2) return []
  const db = await getDb()
  const keys = new Set(items.map(itemKey))
  const rules = await db.query<RuleRow>('SELECT * FROM interaction_rule')
  const focusKey = focus ? itemKey(focus) : null

  const matched = rules.filter((r) => {
    const ka = `${r.a_type}:${r.a_ref}`
    const kb = `${r.b_type}:${r.b_ref}`
    if (!keys.has(ka) || !keys.has(kb)) return false
    if (focusKey && ka !== focusKey && kb !== focusKey) return false
    return true
  })
  if (matched.length === 0) return []

  const refs: ItemRef[] = []
  for (const r of matched) refs.push({ type: r.a_type, ref: r.a_ref }, { type: r.b_type, ref: r.b_ref })
  const named = await nameItems(refs)
  const nameOf = new Map(named.map((n) => [itemKey(n), n.name]))

  const warnings: Warning[] = matched.map((r) => ({
    ruleId: r.id,
    relation: r.relation,
    a: { type: r.a_type, ref: r.a_ref, name: nameOf.get(`${r.a_type}:${r.a_ref}`) ?? r.a_ref },
    b: { type: r.b_type, ref: r.b_ref, name: nameOf.get(`${r.b_type}:${r.b_ref}`) ?? r.b_ref },
    effect: r.effect,
    quote: r.quote,
    quote_ko: r.quote_ko,
    action: r.action,
    pharmacist_question: r.pharmacist_question,
    source_id: r.source_id,
    source_title: r.source_title,
    source_url: r.source_url,
    source_kind: r.source_kind,
  }))
  warnings.sort((x, y) => SEVERITY[x.relation] - SEVERITY[y.relation] || x.ruleId.localeCompare(y.ruleId))
  return warnings
}

/** 어떤 항목이 목록의 다른 항목 중 하나라도와 규칙이 있는지(추천 후보 거르기용) */
export async function itemsWithAnyRuleAgainst(items: ItemRef[], candidates: ItemRef[]): Promise<Set<string>> {
  if (items.length === 0 || candidates.length === 0) return new Set()
  const db = await getDb()
  const rules = await db.query<RuleRow>('SELECT a_type, a_ref, b_type, b_ref FROM interaction_rule')
  const have = new Set(items.map(itemKey))
  const cand = new Set(candidates.map(itemKey))
  const blocked = new Set<string>()
  for (const r of rules) {
    const ka = `${r.a_type}:${r.a_ref}`
    const kb = `${r.b_type}:${r.b_ref}`
    if (have.has(ka) && cand.has(kb)) blocked.add(kb)
    if (have.has(kb) && cand.has(ka)) blocked.add(ka)
  }
  return blocked
}
