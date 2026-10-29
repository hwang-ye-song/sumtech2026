// 화면 문구. 서버·브라우저 컴포넌트가 함께 쓰므로 DB 모듈을 가져오지 않는다.

export type Relation = 'avoid' | 'separate_timing' | 'consult' | 'caution'

export const RELATION_LABEL: Record<Relation, string> = {
  avoid: '함께 먹지 마세요',
  separate_timing: '시간을 띄워 드세요',
  consult: '의사·약사와 상의하세요',
  caution: '주의하세요',
}

export const SAFE_MESSAGE = '현재 기준으로 안전해요. 약사에게도 확인하세요'

export function sourceLinkLabel(w: { source_kind: string; source_id: string }): string {
  switch (w.source_kind) {
    case 'mfds_easy_drug':
      return '식약처 e약은요 원문 보기'
    case 'mfds_approval':
      return '식약처 허가사항 원문 보기'
    case 'paper':
      return `논문 원문 보기 (${w.source_id})`
    default:
      return `출처 보기 (${w.source_id})`
  }
}
