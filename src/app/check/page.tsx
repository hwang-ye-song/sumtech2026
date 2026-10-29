import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { ensureReady } from '@/lib/ready'
import { listUserItems } from '@/lib/items'
import { checkItems, SAFE_MESSAGE } from '@/lib/check'
import { WarningCard } from '@/components/WarningCard'

export const metadata = { title: '검진 결과' }

export default async function CheckPage() {
  await ensureReady()
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const items = await listUserItems(user.id)
  const warnings = await checkItems(items)

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">검진 결과</h1>
        <p className="text-sm text-muted">
          목록 {items.length}개를 서로 맞춰 봤어요. 판정은 식약처 e약은요 원문과 논문에서 확인한 규칙으로만 해요.
        </p>
      </div>

      {items.length < 2 ? (
        <div className="rounded-2xl border border-line bg-card p-5">
          <p className="font-semibold">맞춰 볼 조합이 아직 없어요</p>
          <p className="mt-1 text-sm text-muted">약이나 영양제를 두 개 이상 넣으면 서로 맞춰 봐요.</p>
        </div>
      ) : warnings.length > 0 ? (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-danger">조심할 조합 {warnings.length}개</h2>
          {warnings.map((w) => (
            <WarningCard key={w.ruleId} w={w} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-ok/30 bg-ok-soft p-6">
          <p className="text-lg font-bold text-ok">{SAFE_MESSAGE}</p>
          <p className="mt-2 text-sm text-muted">
            확인한 자료(식약처 e약은요·논문)에서 지금 목록끼리 겹친다는 기록이 없다는 뜻이에요. 자료에 없는 조합이 모두 안전하다는 뜻은 아니에요.
          </p>
        </div>
      )}

      <div className="no-print flex flex-wrap gap-3">
        <Link href="/report" className="rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-strong">
          복용 리포트
        </Link>
        <Link href="/recommend" className="rounded-xl border border-brand px-5 py-3 font-semibold text-brand-strong hover:bg-brand-soft">
          비타민 추천받기
        </Link>
        <Link href="/add" className="rounded-xl border border-line bg-card px-5 py-3 font-semibold hover:bg-gray-50">
          약·영양제 추가
        </Link>
        <Link href="/list" className="rounded-xl border border-line bg-card px-5 py-3 font-semibold hover:bg-gray-50">
          내 목록으로
        </Link>
      </div>
    </section>
  )
}
