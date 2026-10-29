import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/AuthForm'
import { logIn } from '@/app/actions/auth'
import { getCurrentUser } from '@/lib/session'

export const metadata = { title: '로그인' }

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/list')
  return (
    <section className="mx-auto max-w-md">
      <h1 className="mb-2 text-2xl font-bold">로그인</h1>
      <p className="mb-6 text-muted">등록해 둔 약·영양제 목록을 다시 볼 수 있어요.</p>
      <AuthForm action={logIn} submitLabel="로그인" autoCompletePassword="current-password" />
      <p className="mt-6 text-center text-sm text-muted">
        처음이신가요?{' '}
        <Link href="/signup" className="font-medium text-brand-strong underline">
          회원가입
        </Link>
      </p>
    </section>
  )
}
