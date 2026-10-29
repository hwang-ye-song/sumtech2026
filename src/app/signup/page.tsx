import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/AuthForm'
import { signUp } from '@/app/actions/auth'
import { getCurrentUser } from '@/lib/session'

export const metadata = { title: '회원가입' }

export default async function SignupPage() {
  if (await getCurrentUser()) redirect('/list')
  return (
    <section className="mx-auto max-w-md">
      <h1 className="mb-2 text-2xl font-bold">회원가입</h1>
      <p className="mb-6 text-muted">가입하고 지금 먹는 약과 영양제를 등록해 보세요.</p>
      <AuthForm action={signUp} submitLabel="가입하기" autoCompletePassword="new-password" />
      <p className="mt-6 text-center text-sm text-muted">
        이미 계정이 있나요?{' '}
        <Link href="/login" className="font-medium text-brand-strong underline">
          로그인
        </Link>
      </p>
    </section>
  )
}
