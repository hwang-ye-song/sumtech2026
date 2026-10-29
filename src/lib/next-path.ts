// 로그인 전에 누른 메뉴(?next=)로 돌려보낼 때 쓰는 주소 검사. 화면(서버 컴포넌트)과 서버 액션이 함께 쓴다.
// 외부 주소·'//'·역슬래시·탭 같은 변형으로 다른 사이트로 튕기지 않도록, 앱 안의 정해진 화면만 받는다.
const ALLOWED = /^\/(?:mypage|list|check|check\/report|recommend|explore|rules\/[A-Za-z0-9_.~%-]+)$/

export function safeNext(value: unknown): string | undefined {
  return typeof value === 'string' && value.length <= 200 && ALLOWED.test(value) ? value : undefined
}
