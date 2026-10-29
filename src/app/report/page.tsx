import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { ensureReady } from '@/lib/ready'
import { listUserItems } from '@/lib/items'
import { checkItems } from '@/lib/check'
import { WarningCard } from '@/components/WarningCard'
import { SERVICE_NAME } from '@/lib/brand'

export const metadata = { title: '복용 리포트' }

export default async function ReportPage() {
  await ensureReady()
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const items = await listUserItems(user.id)
  const warnings = await checkItems(items)
  const today = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long', timeZone: 'Asia/Seoul' }).format(new Date())

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">복용 리포트</h1>
        <p className="text-sm text-muted">
          {today} · {SERVICE_NAME} · 약사·의사에게 보여 주세요
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">조심할 조합</h2>
        {warnings.length === 0 ? (
          <p className="rounded-2xl border border-line bg-card p-5 text-muted">
            확인한 자료(식약처 e약은요·논문)에서 겹친다는 기록이 있는 조합이 없어요. 약사에게도 확인하세요.
          </p>
        ) : (
          warnings.map((w) => <WarningCard key={w.ruleId} w={w} compact />)
        )}
      </div>

      {warnings.length > 0 ? (
        <div className="rounded-2xl border border-line bg-card p-5">
          <h2 className="mb-2 text-lg font-bold">약사에게 물을 질문</h2>
          <ol className="list-decimal space-y-1 pl-5">
            {warnings.map((w) => (
              <li key={w.ruleId}>{w.pharmacist_question}</li>
            ))}
          </ol>
        </div>
      ) : null}

      <div>
        <h2 className="mb-3 text-lg font-bold">복용 중인 약·영양제</h2>
        {items.length === 0 ? (
          <p className="text-muted">아직 넣은 항목이 없어요.</p>
        ) : (
          <ul aria-label="복용 중인 약·영양제" className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
            {items.map((item) => (
              <li key={item.id} className="px-4 py-3">
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-muted">{item.sub}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs leading-relaxed text-muted">
        이 리포트는 식약처 e약은요 원문과 논문에서 확인한 조합만 보여 줘요. 자료에 없는 조합이 안전하다는 뜻은 아니며, 처방이나 복용 지시가 아니에요.
      </p>

      <div className="no-print flex flex-wrap gap-3">
        <Link href="/check" className="rounded-xl border border-line bg-card px-5 py-3 font-semibold hover:bg-gray-50">
          검진 결과로
        </Link>
        <Link href="/list" className="rounded-xl border border-line bg-card px-5 py-3 font-semibold hover:bg-gray-50">
          내 목록으로
        </Link>
      </div>
    </section>
  )
}
