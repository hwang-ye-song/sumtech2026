// 서비스의 AI 호출 두 곳: (1) 사진에서 약·영양제 이름 읽기, (2) 설문을 읽고 비타민 후보 중 고르기.
// 서버에서만 부르고, 키는 환경변수 AI_GATEWAY_API_KEY 하나로 읽는다(Vercel AI Gateway).
// 위험 조합 판정에는 AI를 쓰지 않는다.
import { generateObject } from 'ai'
import { z } from 'zod'

// 모델 식별자는 data/seed/README.md의 'AI 모델' 절에서 확인한 값을 기본으로 두고, 환경변수로 바꿀 수 있다.
export const DEFAULT_VISION_MODEL = process.env.AI_VISION_MODEL || 'google/gemini-3.8-flash'
export const DEFAULT_TEXT_MODEL = process.env.AI_TEXT_MODEL || 'google/gemini-3.8-flash'

const TIMEOUT_MS = 60_000

export class AiUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AiUnavailableError'
  }
}

export function aiConfigured(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY)
}

function requireModel(model: string, what: string, fallbackHint: string): string {
  if (!aiConfigured()) throw new AiUnavailableError(`AI 키가 설정되지 않아 지금은 ${what} 기능을 쓸 수 없어요. ${fallbackHint}`)
  if (!model) throw new AiUnavailableError(`${what} 모델이 아직 정해지지 않았어요.`)
  return model
}

/** 사용자에게 보여 줄 말로 바꾼다. 키 값이나 내부 주소는 담지 않는다. */
export function describeAiError(err: unknown): string {
  if (err instanceof AiUnavailableError) return err.message
  const msg = err instanceof Error ? err.message : String(err)
  const status = (err as { statusCode?: number; status?: number })?.statusCode ?? (err as { status?: number })?.status
  if (status === 401 || status === 403 || /unauthorized|forbidden|invalid.*key/i.test(msg)) return 'AI 키가 맞지 않거나 접근이 거부됐어요. 키 설정을 확인해 주세요.'
  if (status === 402 || /insufficient|budget|credit|quota/i.test(msg)) return 'AI 사용 예산이 부족해요. 운영진에게 문의해 주세요.'
  if (status === 429 || /rate limit/i.test(msg)) return '요청이 몰려 잠시 기다려야 해요. 조금 뒤 다시 시도해 주세요.'
  if (/abort|timeout|timed out/i.test(msg)) return 'AI 응답이 늦어요. 다시 시도해 주세요.'
  return 'AI 호출에 실패했어요. 다시 시도해 주세요.'
}

const photoSchema = z.object({
  readable: z.boolean().describe('사진이 흐리거나 흔들리거나 너무 어두워서 제품 이름 글자를 읽을 수 없으면 false'),
  names: z.array(z.string().min(1)).max(10).describe('사진에서 읽은 약·영양제 제품 이름이나 성분 이름. 글자를 읽은 그대로.'),
})

export interface PhotoReading {
  readable: boolean
  names: string[]
}

/** 약 상자·약 봉투·영양제 통 사진에서 제품 이름/성분 이름 후보를 읽는다. 흐린 사진이면 readable=false. */
export async function readNamesFromPhoto(image: Uint8Array, mediaType: string): Promise<PhotoReading> {
  const model = requireModel(DEFAULT_VISION_MODEL, '사진 인식', '검색으로 추가해 주세요.')
  const { object } = await generateObject({
    model,
    schema: photoSchema,
    abortSignal: AbortSignal.timeout(TIMEOUT_MS),
    maxRetries: 1,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              '이 사진은 처방전, 약 봉투, 약 상자, 알약, 또는 영양제 통이다. 여기에 적힌 약·영양제를 한 줄에 하나씩, 제품 이름 그대로(예: 비맥스제트정, 훼로바-유서방정) 적어라. 처방전·약 봉투처럼 약이 여러 개면 적힌 약을 모두 적되, 처방전·봉투에 적힌 약 말고 다른 글자(병원·약국 이름, 복용법, 효능 설명)는 적지 마라. 제품 이름이 안 보이고 성분만 보이면 성분 이름(예: 칼슘, 레보티록신)을 적어라. ‘정’·‘서방정’·‘30정’ 같은 제형·수량 글자만 따로 적지 마라. 사진이 흐리거나 흔들려서 글자를 읽을 수 없으면 readable을 false로 하고 names는 빈 목록으로 답하라. 보이지 않는 것은 지어내지 마라.',
          },
          { type: 'image', image, mediaType },
        ],
      },
    ],
  })
  const names = object.names.map((n) => n.trim()).filter(Boolean)
  return { readable: object.readable && names.length > 0, names }
}

export interface RecommendCandidate {
  id: string
  name: string
  function_claim: string
}

export interface RecommendSurvey {
  symptoms: string[]
  goals: string[]
}

const pickSchema = z.object({
  picks: z
    .array(
      z.object({
        id: z.string().describe('후보 목록에 있는 id 그대로'),
        why: z.string().max(120).describe('설문의 어떤 점과 맞는지 한 문장. 질병 치료·예방 표현은 쓰지 않는다.'),
      }),
    )
    .max(3),
})

/** 설문과 후보 목록을 주고 후보 안에서만 고르게 한다. 후보에 없는 id는 버린다. */
export async function pickRecommendations(
  survey: RecommendSurvey,
  candidates: RecommendCandidate[],
  maxPicks: number,
): Promise<{ id: string; why: string }[]> {
  const model = requireModel(DEFAULT_TEXT_MODEL, '추천', '검진 결과와 복용 리포트는 그대로 쓸 수 있어요.')
  const candidateText = candidates.map((c) => `- id: ${c.id} / 이름: ${c.name} / 식약처 기능성 내용: ${c.function_claim}`).join('\n')
  const { object } = await generateObject({
    model,
    schema: pickSchema,
    abortSignal: AbortSignal.timeout(TIMEOUT_MS),
    maxRetries: 1,
    prompt: `너는 영양제 종류를 고르는 도우미다. 아래 후보 목록 안에서만 최대 ${maxPicks}개를 고른다. 후보 목록은 사용자가 지금 먹는 약·영양제와 겹치거나 부딪친다는 기록이 없는 것만 남긴 것이다.
고르는 기준: 사용자의 '개선하고 싶은 점'과 '현재 겪는 증상'에 각 후보의 식약처 기능성 내용이 맞는 것. 후보에 없는 것, 제품 이름, 구매 정보, 질병 진단·치료·예방 표현은 쓰지 않는다. 맞는 후보가 없으면 빈 목록으로 답한다.

[사용자 설문]
현재 겪는 증상: ${survey.symptoms.join(', ') || '(선택 없음)'}
개선하고 싶은 점: ${survey.goals.join(', ') || '(선택 없음)'}

[후보 목록]
${candidateText}`,
  })
  const allowed = new Set(candidates.map((c) => c.id))
  const seen = new Set<string>()
  const picks: { id: string; why: string }[] = []
  for (const p of object.picks) {
    if (!allowed.has(p.id) || seen.has(p.id)) continue
    seen.add(p.id)
    picks.push(p)
    if (picks.length >= maxPicks) break
  }
  return picks
}
