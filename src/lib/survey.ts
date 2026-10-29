// 영양제 추천 설문 항목. 화면(RecommendForm)과 서버 액션(recommend)이 같은 목록을 쓴다.

export const RANGES = {
  age: { min: 10, max: 90, initial: 40, unit: '세' },
  heightCm: { min: 120, max: 200, initial: 165, unit: 'cm' },
  weightKg: { min: 30, max: 130, initial: 60, unit: 'kg' },
} as const

export const SEXES = ['남성', '여성'] as const

export const SYMPTOMS = ['쉽게 피곤함', '잦은 감기', '눈 피로·건조', '뼈·관절 불편', '피부 건조·트러블', '입안 염증', '손발 저림·근육 경련', '어지러움'] as const

// 개선하고 싶은 점마다 식약처 기능성 내용에서 찾을 말. 규칙 추천과 '주의' 칸 고르기에 쓴다.
export const GOAL_WORDS: Record<string, string[]> = {
  '피로 회복': ['에너지', '피로'],
  면역력: ['면역'],
  '눈 건강': ['눈', '시각', '황반'],
  '뼈 건강': ['뼈', '골다공증'],
  '피부·점막': ['피부', '결합조직', '점막'],
  '혈액 생성': ['혈액생성', '산소운반'],
  '신경·근육': ['신경', '근육'],
  항산화: ['항산화', '유해산소'],
}
export const GOALS = Object.keys(GOAL_WORDS)

export const MAX_PICKS = 3
