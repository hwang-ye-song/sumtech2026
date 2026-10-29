'use server'

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { ensureReady } from '@/lib/ready'
import { getDb } from '@/lib/db'
import { listUserItems } from '@/lib/items'
import { warningsForCandidates, type Warning } from '@/lib/check'
import { substancesInProducts } from '@/lib/catalog'
import { aiConfigured, pickRecommendations, DEFAULT_TEXT_MODEL, type RecommendSurvey } from '@/lib/ai'
import { GOAL_WORDS, GOALS, MAX_GOALS, MAX_PICKS, SYMPTOMS } from '@/lib/survey'
import { josa } from '@/lib/labels'

export interface RecommendedItem {
  id: string
  name: string
  why: string
  function_claim: string
  function_source_title: string | null
  function_source_url: string
}

export interface CautionItem {
  id: string
  name: string
  function_claim: string
  warnings: Warning[]
}

export interface RecommendState {
  error?: string
  result?: RecommendedItem[]
  cautions?: CautionItem[]
  /** ai: AI가 후보 안에서 고름 / rule: AI를 못 써서 기능성 문구가 설문과 맞는 후보로 고름 */
  basis?: 'ai' | 'rule'
}

interface CandidateRow {
  id: string
  name: string
  is_vitamin: boolean
  function_claim: string
  function_source_title: string | null
  function_source_url: string
}

export async function requestRecommendation(_prev: RecommendState, formData: FormData): Promise<RecommendState> {
  await ensureReady()
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const symptoms = formData.getAll('symptom').map(String).filter((s) => (SYMPTOMS as readonly string[]).includes(s))
  const goals = formData.getAll('goal').map(String).filter((g) => GOALS.includes(g))
  if (goals.length === 0) return { error: '개선하고 싶은 점을 하나 이상 골라 주세요.' }
  if (goals.length > MAX_GOALS) return { error: `개선하고 싶은 점은 ${MAX_GOALS}개까지 고를 수 있어요.` }
  const survey: RecommendSurvey = { symptoms, goals }
  const pills = MAX_PICKS

  const db = await getDb()
  const items = await listUserItems(user.id)
  // 이미 먹는 성분: 성분으로 넣은 것 + 넣은 제품(약·건강기능식품)에 든 성분
  const have = new Set(items.filter((i) => i.type === 'substance').map((i) => i.ref))
  for (const ids of (await substancesInProducts(items)).values()) for (const id of ids) have.add(id)

  const rows = await db.query<CandidateRow>(
    `SELECT id, name, is_vitamin, function_claim, function_source_title, function_source_url
       FROM substance
      WHERE recommendable = true AND function_claim IS NOT NULL AND function_source_url IS NOT NULL
      ORDER BY name`,
  )
  // 이미 먹는 것은 후보에서 뺀다.
  const fresh = rows.filter((r) => !have.has(r.id))
  const conflicts = await warningsForCandidates(items, fresh.map((r) => r.id))

  // 추천 후보: 지금 먹는 것과 부딪친다는 기록이 없는 비타민
  const candidates = fresh.filter((r) => r.is_vitamin && !conflicts.has(r.id))
  // 주의: 고른 부분과 맞는 성분인데 지금 먹는 것과 부딪치는 것(예: 피로 → 철분, 레보티록신·칼슘과 부딪힘)
  const words = goals.flatMap((g) => GOAL_WORDS[g] ?? [])
  const cautions: CautionItem[] = fresh
    .filter((r) => conflicts.has(r.id) && words.some((w) => r.function_claim.includes(w)))
    .map((r) => ({ id: r.id, name: r.name, function_claim: r.function_claim, warnings: conflicts.get(r.id) ?? [] }))

  if (candidates.length === 0) return { error: '지금 목록과 부딪치지 않는 추천 후보가 없어요. 약사와 상의해 주세요.', cautions }

  // AI 키가 없거나 호출이 실패하면 추천을 멈추지 않고, 아래 채우기 규칙(기능성 문구가 설문과 맞는 후보)만으로 고른다.
  let picks: { id: string; why: string }[] = []
  let basis: 'ai' | 'rule' = 'rule'
  if (aiConfigured()) {
    try {
      picks = await pickRecommendations(
        survey,
        candidates.map((c) => ({ id: c.id, name: c.name, function_claim: c.function_claim })),
        pills,
      )
      basis = 'ai'
    } catch (err) {
      console.warn('[recommend] AI 호출 실패, 규칙으로 고릅니다:', err instanceof Error ? err.message : err)
    }
  }

  // AI가 최대 개수보다 적게 고르면, 개선하고 싶은 점과 기능성 내용이 맞는 후보로 채운다.
  const chosen = new Set(picks.map((p) => p.id))
  for (const c of candidates) {
    if (picks.length >= pills) break
    if (chosen.has(c.id) || !words.some((w) => c.function_claim.includes(w))) continue
    picks.push({ id: c.id, why: `고르신 '${goals.join(', ')}'${josa(goals[goals.length - 1] ?? '', '와/과')} 식약처 기능성 내용이 맞아요.` })
    chosen.add(c.id)
  }

  const byId = new Map(candidates.map((c) => [c.id, c]))
  const result: RecommendedItem[] = picks.slice(0, pills).flatMap((p) => {
    const c = byId.get(p.id)
    return c
      ? [{ id: c.id, name: c.name, why: p.why, function_claim: c.function_claim, function_source_title: c.function_source_title, function_source_url: c.function_source_url }]
      : []
  })

  // 고른 증상·개선하고 싶은 점과 결과만 남긴다.
  await db.query(`INSERT INTO recommendation (user_id, survey, result, model) VALUES ($1, $2::jsonb, $3::jsonb, $4)`, [
    user.id,
    JSON.stringify({ symptoms, goals }),
    JSON.stringify({ result, cautions: cautions.map((c) => c.id) }),
    basis === 'ai' ? DEFAULT_TEXT_MODEL || null : 'rule',
  ])

  return { result, cautions, basis }
}
