import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { ensureReady } from '@/lib/ready'
import { RecommendForm } from '@/components/RecommendForm'

export const metadata = { title: '비타민 추천' }

export default async function RecommendPage() {
  await ensureReady()
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <section className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">비타민 추천</h1>
        <p className="text-sm text-muted">
          간단한 설문에 답하면, 지금 드시는 약·영양제와 겹치거나 부딪친다는 기록이 없는 비타민·영양 성분 종류를 골라 드려요.
        </p>
      </div>
      <RecommendForm />
      <Link href="/check" className="self-start text-sm font-medium text-brand-strong underline">
        ← 검진 결과로
      </Link>
    </section>
  )
}
