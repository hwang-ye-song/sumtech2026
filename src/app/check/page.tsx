import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { ensureReady } from '@/lib/ready'
import { listUserItems } from '@/lib/items'
import { startCheckAction } from '@/app/actions/items'
import { AutoCheck } from '@/components/AutoCheck'

export const metadata = { title: '검진하기' }

export default async function CheckPage() {
  await ensureReady()
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/check')
  const items = await listUserItems(user.id)

  return (
    <main className="page">
      <div className="wrap prose">
        <div className="page-head">
          <h2>
            목록 전체를 <b>DB로만</b> 점검해요
          </h2>
          <p className="muted">
            해로운 조합과 같은 성분의 하루 합계를 식약처 e약은요 원문·논문·공식 자료에서 확인한 규칙으로만 찾아, 한 장의 리포트로 정리해요.
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
            <AutoCheck action={startCheckAction} />
          </>
        )}
      </div>
    </main>
  )
}
