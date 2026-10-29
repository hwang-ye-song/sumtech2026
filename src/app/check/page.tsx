import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { ensureReady } from '@/lib/ready'
import { listUserItems } from '@/lib/items'
import { startCheckAction } from '@/app/actions/items'
import { SubmitButton } from '@/components/SubmitButton'

export const metadata = { title: '분석하기' }

export default async function CheckPage() {
  await ensureReady()
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const items = await listUserItems(user.id)

  return (
    <main className="page">
      <div className="wrap prose">
        <div className="page-head">
          <div className="eyebrow">분석하기</div>
          <h2>
            목록 전체를 <b>DB로만</b> 점검해요
          </h2>
          <p className="muted">
            해로운 조합과 같은 성분의 하루 합계를 식약처 e약은요 원문·논문·공식 자료에서 확인한 규칙으로만 찾아, 약사·의사에게 보여 줄 리포트로 만들어요.
          </p>
        </div>
        {items.length === 0 ? (
          <div className="empty">
            먹고 있는 약이나 영양제를 추가해 보세요
            <div style={{ marginTop: 16 }}>
              <Link className="btn" href="/list">
                복용 목록
              </Link>
            </div>
          </div>
        ) : (
          <>
            <p className="muted">
              등록된 항목 <span className="num">{items.length}</span>개: {items.map((i) => i.name).join(', ')}
            </p>
            <form action={startCheckAction}>
              <SubmitButton className="btn btn-primary btn-lg" pendingLabel="분석 중…" data-testid="analyze-start">
                분석 시작
              </SubmitButton>
            </form>
          </>
        )}
      </div>
    </main>
  )
}
