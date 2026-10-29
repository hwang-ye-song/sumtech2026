import Link from 'next/link'
import { getCurrentUser } from '@/lib/session'
import { SERVICE_NAME } from '@/lib/brand'
import { logOut } from '@/app/actions/auth'

export async function Header() {
  const user = await getCurrentUser()
  return (
    <header className="border-b border-line bg-card">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-bold text-brand-strong">
          {SERVICE_NAME}
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          {user ? (
            <>
              <Link href="/list" className="rounded-lg px-3 py-2 font-medium text-brand-strong hover:bg-brand-soft">
                내 목록
              </Link>
              <form action={logOut}>
                <button type="submit" className="rounded-lg px-3 py-2 text-muted hover:bg-gray-100">
                  로그아웃
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-lg px-3 py-2 font-medium text-brand-strong hover:bg-brand-soft">
                로그인
              </Link>
              <Link href="/signup" className="rounded-lg bg-brand px-3 py-2 font-medium text-white hover:bg-brand-strong">
                회원가입
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
