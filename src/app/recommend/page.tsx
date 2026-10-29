import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { ensureReady } from '@/lib/ready'
import { RecommendForm } from '@/components/RecommendForm'
import { RECOMMEND_DISCLAIMER } from '@/lib/labels'

export const metadata = { title: '영양제 추천' }

export default async function RecommendPage() {
  await ensureReady()
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/recommend')

  return (
    <main className="page">
      <div className="wrap" style={{ maxWidth: 800 }}>
        <div className="disclaimer" data-testid="rec-disclaimer-top">
          {RECOMMEND_DISCLAIMER}
        </div>
        <div className="page-head" style={{ marginTop: 24 }}>
          <div className="eyebrow">영양제 추천</div>
          <h2>
            무엇을 <b>원하세요?</b>
          </h2>
          <p className="muted">
            지금 드시는 약·영양제와 부딪친다는 기록이 없는 비타민만 골라 드려요. 부딪치는 성분은 추천 대신 &lsquo;주의&rsquo;로 보여 드려요. 추천은 성분 단위로만 보여 드려요.
          </p>
        </div>
        <RecommendForm />
      </div>
    </main>
  )
}
