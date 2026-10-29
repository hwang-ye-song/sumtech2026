import Link from 'next/link'
import { getCurrentUser } from '@/lib/session'
import { logOut } from '@/app/actions/auth'
import { BottomBar, NavTabs } from '@/components/NavTabs'

export function Logo() {
  return (
    <Link className="logo" href="/" aria-label="TwoPills 홈">
      <span className="mark" />
      <span className="word">TwoPills</span>
    </Link>
  )
}

/** 상단 내비: 로고 · 메뉴 · (로그인 전) 로그인·회원가입 / (로그인 뒤) 이름·로그아웃. 휴대폰에서는 아래 탭이 따로 뜬다. */
export async function Header() {
  const user = await getCurrentUser()
  return (
    <>
      <header className="nav">
        <div className="wrap">
          <Logo />
          <NavTabs authed={Boolean(user)} />
          <span className="spacer" />
          {user ? (
            <>
              <span className="who">{user.display_name ?? user.email}</span>
              <form action={logOut}>
                <button type="submit" className="btn btn-ghost btn-sm">
                  로그아웃
                </button>
              </form>
            </>
          ) : (
            <>
              <Link className="btn btn-ghost" href="/login" data-testid="nav-login">
                로그인
              </Link>
              <Link className="btn btn-primary" href="/signup" data-testid="nav-signup">
                회원가입
              </Link>
            </>
          )}
        </div>
      </header>
      {user ? <BottomBar /> : null}
    </>
  )
}
