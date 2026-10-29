// 화면 문구. 서버·브라우저 컴포넌트가 함께 쓰므로 DB 모듈을 가져오지 않는다.

export type Relation = 'avoid' | 'separate_timing' | 'consult' | 'caution'

export const RELATION_LABEL: Record<Relation, string> = {
  avoid: '함께 먹지 마세요',
  separate_timing: '시간을 띄워 드세요',
  consult: '의사·약사와 상의하세요',
  caution: '주의하세요',
}

/** 규칙이 없는 조합에 쓰는 말. '안전'이라고 단정하지 않는다(docs/scenarios.yaml S3). */
export const NO_RECORD_MESSAGE = '확인한 자료에서는 보고된 문제가 없어요. 걱정되면 약사에게 확인하세요'
export const CHECKED_SOURCES = '식약처 e약은요 원문, 논문, MedlinePlus(미국 국립의학도서관)'
export const DATA_CHECKED_ON = '2026-10-29'

export const CONSULT_NOTE = '복용을 바꾸기 전에 약사·의사와 상담하세요'
export const RECOMMEND_DISCLAIMER = '이 추천은 진단이나 처방이 아니에요. 새로 드시기 전에 약사·의사와 상담하세요'

export function sourceKindLabel(kind: string): string {
  switch (kind) {
    case 'mfds_easy_drug':
      return '식약처 e약은요'
    case 'mfds_approval':
      return '식약처 허가사항'
    case 'mfds_health_food':
      return '식약처 건강기능식품'
    case 'mfds_other':
      return '식약처'
    case 'gov':
      return '해외 정부기관'
    case 'paper':
      return '논문'
    default:
      return '공식 자료'
  }
}

const JOSA: Record<string, [string, string]> = { '을/를': ['을', '를'], '이/가': ['이', '가'], '은/는': ['은', '는'], '와/과': ['과', '와'] }
// 숫자로 끝나는 이름(예: …500)은 읽는 소리의 받침으로 고른다: 0 영, 1 일, 3 삼, 6 육, 7 칠, 8 팔은 받침이 있다.
const DIGIT_HAS_BATCHIM: Record<string, boolean> = { '0': true, '1': true, '2': false, '3': true, '4': false, '5': false, '6': true, '7': true, '8': true, '9': false }

/**
 * 단어 뒤에 붙일 조사를 고른다. '을(를)'처럼 둘 다 적지 않게 한다.
 * 끝의 괄호 설명(예: 타이레놀정500밀리그람(아세트아미노펜))과 따옴표는 빼고 마지막 글자로 판단한다.
 */
export function josa(word: string, pair: keyof typeof JOSA): string {
  const [withBatchim, without] = JOSA[pair]
  const core = word.replace(/\s*\([^)]*\)\s*$/, '').replace(/['"’‘”“\s]+$/, '')
  const last = core.charAt(core.length - 1)
  const code = last.charCodeAt(0)
  let hasBatchim: boolean
  if (code >= 0xac00 && code <= 0xd7a3) hasBatchim = (code - 0xac00) % 28 !== 0
  else if (last in DIGIT_HAS_BATCHIM) hasBatchim = DIGIT_HAS_BATCHIM[last]
  else hasBatchim = false
  return hasBatchim ? withBatchim : without
}
