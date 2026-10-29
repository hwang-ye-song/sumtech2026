'use server'

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { ensureReady } from '@/lib/ready'
import { getDb } from '@/lib/db'
import { listUserItems } from '@/lib/items'
import { itemsWithAnyRuleAgainst } from '@/lib/check'
import { nutrientsInDrugs } from '@/lib/catalog'
import { describeAiError, pickRecommendations, DEFAULT_TEXT_MODEL, type RecommendSurvey } from '@/lib/ai'

export interface RecommendedItem {
  id: string
  name: string
  why: string
  function_claim: string
  function_source_title: string | null
  function_source_url: string
}

export interface RecommendState {
  error?: string
  result?: RecommendedItem[]
  excluded?: string[]
  candidateCount?: number
  survey?: RecommendSurvey
}

interface CandidateRow {
  id: string
  name: string
  function_claim: string
  function_source_title: string | null
  function_source_url: string
  nutrient_keys: string[]
}

const GOALS = ['피로', '눈', '뼈', '피부', '면역', '기타'] as const
const PILLS = ['1알', '2~3알', '상관없어요'] as const

function maxPicksFor(pills: string): number {
  if (pills === '1알') return 1
  return 3
}

export async function requestRecommendation(_prev: RecommendState, formData: FormData): Promise<RecommendState> {
  await ensureReady()
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const goals = formData.getAll('goal').map(String).filter((g): g is (typeof GOALS)[number] => (GOALS as readonly string[]).includes(g))
  const other = String(formData.get('other') ?? '').trim().slice(0, 200)
  const pillsRaw = String(formData.get('pills') ?? '')
  const pills = (PILLS as readonly string[]).includes(pillsRaw) ? pillsRaw : ''
  const note = String(formData.get('note') ?? '').trim().slice(0, 300)
  const survey: RecommendSurvey = { goals, other, pills, note }

  if (goals.length === 0 && !other) return { error: '좋아지고 싶은 부분을 하나 이상 골라 주세요.', survey }
  if (goals.includes('기타') && !other) return { error: "'기타'를 골랐으면 내용을 적어 주세요.", survey }

  const db = await getDb()
  const items = await listUserItems(user.id)
  const have = new Set(items.map((i) => `${i.type}:${i.ref}`))

  const rows = await db.query<CandidateRow>(
    `SELECT id, name, function_claim, function_source_title, function_source_url, nutrient_keys
       FROM substance
      WHERE recommendable = true AND function_claim IS NOT NULL AND function_source_url IS NOT NULL
      ORDER BY name`,
  )

  // 1) 이미 목록에 있는 성분 제외 2) 목록과 조합 규칙이 있는 성분 제외 3) 먹는 약에 이미 든 성분 제외
  const blocked = await itemsWithAnyRuleAgainst(items, rows.map((r) => ({ type: 'substance' as const, ref: r.id })))
  const inDrugs = await nutrientsInDrugs(items.filter((i) => i.type === 'drug').map((i) => i.ref))
  const excluded: string[] = []
  const candidates = rows.filter((r) => {
    const key = `substance:${r.id}`
    if (have.has(key)) {
      excluded.push(`${r.name} (이미 목록에 있음)`)
      return false
    }
    if (blocked.has(key)) {
      excluded.push(`${r.name} (지금 먹는 것과 조합 기록 있음)`)
      return false
    }
    if ((r.nutrient_keys ?? []).some((k) => inDrugs.has(k))) {
      excluded.push(`${r.name} (지금 먹는 약에 이미 든 성분)`)
      return false
    }
    return true
  })

  if (candidates.length === 0) {
    return { error: '지금 목록과 겹치지 않는 추천 후보가 없어요. 약사와 상의해 주세요.', excluded, candidateCount: 0, survey }
  }

  let picks: { id: string; why: string }[]
  try {
    picks = await pickRecommendations(
      survey,
      candidates.map((c) => ({ id: c.id, name: c.name, function_claim: c.function_claim })),
      maxPicksFor(pills),
    )
  } catch (err) {
    return { error: describeAiError(err), excluded, candidateCount: candidates.length, survey }
  }

  const byId = new Map(candidates.map((c) => [c.id, c]))
  const result: RecommendedItem[] = picks
    .map((p) => {
      const c = byId.get(p.id)
      if (!c) return null
      return {
        id: c.id,
        name: c.name,
        why: p.why,
        function_claim: c.function_claim,
        function_source_title: c.function_source_title,
        function_source_url: c.function_source_url,
      }
    })
    .filter((r): r is RecommendedItem => r !== null)

  await db.query(
    `INSERT INTO recommendation (user_id, survey, result, model) VALUES ($1, $2::jsonb, $3::jsonb, $4)`,
    [user.id, JSON.stringify(survey), JSON.stringify(result), DEFAULT_TEXT_MODEL || null],
  )

  return { result, excluded, candidateCount: candidates.length, survey }
}
