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
  { href: '/check', label: '분석하기', match: ['/check', '/rules', '/report'] },
  { href: '/recommend', label: '영양제 추천', match: ['/recommend'] },
]

function isCurrent(pathname: string, match: string[]): boolean {
  return match.some((m) => pathname === m || pathname.startsWith(`${m}/`))
}

export function NavTabs({ authed }: { authed: boolean }) {
  const pathname = usePathname()
  const items = authed ? [{ href: '/', label: '홈', match: [] as string[] }, ...ITEMS] : ITEMS
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

/** 휴대폰 화면 아래 탭(로그인한 사람만). PRD NFR-3: '홈'·'복용 목록'·'분석하기' 3개 고정 */
export function BottomBar() {
  const pathname = usePathname()
  const tabs = [
    { href: '/', label: '홈', current: pathname === '/' },
    { href: '/list', label: '복용 목록', current: isCurrent(pathname, ['/list', '/add']) },
    { href: '/check', label: '분석하기', current: isCurrent(pathname, ['/check', '/rules', '/report']) },
  ]
  return (
    <nav className="bottombar" aria-label="아래 탭">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} aria-current={t.current ? 'page' : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  )
}
