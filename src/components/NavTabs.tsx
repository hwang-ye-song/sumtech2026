'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// 메뉴마다 '지금 화면'으로 칠할 주소 앞부분
const ITEMS: { href: string; label: React.ReactNode; match: string[] }[] = [
  {
    href: '/explore',
    label: (
      <>
        <span className="nl">약·영양제 알아보기</span>
        <span className="ns">알아보기</span>
      </>
    ),
    match: ['/explore'],
  },
  { href: '/list', label: '복용 목록', match: ['/list', '/add'] },
  { href: '/check', label: '검진하기', match: ['/check', '/rules', '/report'] },
  { href: '/recommend', label: '영양제 추천', match: ['/recommend'] },
]

function isCurrent(pathname: string, match: string[]): boolean {
  return match.some((m) => pathname === m || pathname.startsWith(`${m}/`))
}

export function NavTabs({ authed }: { authed: boolean }) {
  const pathname = usePathname()
  // 로그인해도 '홈' 탭은 두지 않는다. 내 계정으로는 헤더 오른쪽의 마이 페이지 아이콘으로 간다.
  const items = ITEMS
  return (
    <nav className={`tabs ${authed ? '' : 'tabs-pub'}`} aria-label="주 메뉴">
      {items.map((t) => {
        const current = t.href === '/' ? pathname === '/' : isCurrent(pathname, t.match)
        return (
          <Link key={t.href} href={t.href} aria-current={current ? 'page' : undefined} data-testid={`tab-${t.href.slice(1) || 'home'}`}>
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
