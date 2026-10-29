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
    case 'paper':
      return '논문'
    default:
      return '공식 자료'
  }
}
