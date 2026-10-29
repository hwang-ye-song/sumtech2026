import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/AuthForm'
import { signUp } from '@/app/actions/auth'
import { getCurrentUser } from '@/lib/session'

export const metadata = { title: '회원가입' }

export default async function SignupPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = (await searchParams).next
  const next = typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//') ? raw : undefined
  if (await getCurrentUser()) redirect(next ?? '/')
  return (
    <main className="page">
      <div className="wrap" style={{ maxWidth: 488 }}>
        <div className="page-head">
          <h2>회원가입</h2>
          <p className="muted">이메일과 비밀번호만 있으면 돼요.</p>
        </div>
        <AuthForm action={signUp} submitLabel="가입하기" mode="signup" next={next} />
        <p className="muted" style={{ marginTop: 16 }}>
          이미 계정이 있나요? <Link href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}>로그인</Link>
        </p>
      </div>
    </main>
  )
}
