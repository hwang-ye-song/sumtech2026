import Link from 'next/link'
import { getCurrentUser } from '@/lib/session'
import { logOut } from '@/app/actions/auth'
import { NavTabs } from '@/components/NavTabs'
import { ThemeToggle } from '@/components/ThemeToggle'

export function Logo() {
  return (
    <Link className="logo" href="/" aria-label="TwoPills 홈">
      <span className="word">TwoPills</span>
    </Link>
  )
}

/** 상단 내비: 로고 · 메뉴 · (로그인 전) 로그인·회원가입 / (로그인 뒤) 이름·로그아웃. */
export async function Header() {
  const user = await getCurrentUser()
  return (
    <header className="nav">
      <div className="wrap">
        <Logo />
        <NavTabs authed={Boolean(user)} />
        <span className="spacer" />
        <ThemeToggle />
        {user ? (
          <>
            <Link
              href="/mypage"
              className="nav-account"
              aria-label={`마이 페이지 (${user.display_name ?? user.email})`}
              title={user.display_name ?? user.email}
              data-testid="nav-account"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </Link>
            <form action={logOut}>
              <button type="submit" className="btn btn-ghost btn-sm">
                로그아웃
              </button>
            </form>
          </>
        ) : (
          <>
            <Link className="btn btn-ghost btn-sm" href="/login" data-testid="nav-login">
              로그인
            </Link>
            <Link className="btn btn-ghost btn-sm" href="/signup" data-testid="nav-signup">
              회원가입
            </Link>
          </>
        )}
      </div>
    </header>
  )
}
