import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { ensureReady } from '@/lib/ready'
import { listUserItems } from '@/lib/items'
import { checkItems, SAFE_MESSAGE } from '@/lib/check'
import { itemKey, parseItemKey } from '@/lib/catalog'
import { removeItemAction, runCheckAction } from '@/app/actions/items'
import { WarningCard } from '@/components/WarningCard'

export const metadata = { title: '내 목록' }

export default async function ListPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await ensureReady()
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const addedKey = typeof params.added === 'string' ? params.added : null
  const added = addedKey ? parseItemKey(addedKey) : null
  const items = await listUserItems(user.id)
  const inUse = user.first_checked_at !== null
  const addedItem = added ? items.find((i) => itemKey(i) === itemKey(added)) : undefined

  // 사용 중(첫 검진을 마친 사람)이면 방금 더한 항목을 바로 점검한다(F3 자동 검진).
  const autoWarnings = inUse && addedItem ? await checkItems(items, addedItem) : []

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">내 목록</h1>
          <p className="text-sm text-muted">{user.display_name ?? user.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/add" className="rounded-xl bg-brand px-4 py-3 font-semibold text-white hover:bg-brand-strong">
            약·영양제 추가
          </Link>
          <Link href="/add/photo" className="rounded-xl border border-brand px-4 py-3 font-semibold text-brand-strong hover:bg-brand-soft">
            사진으로 추가
          </Link>
        </div>
      </div>

      {addedItem ? (
        <div aria-live="polite" className="flex flex-col gap-3">
          {inUse ? (
            autoWarnings.length > 0 ? (
              <>
                <h2 className="text-lg font-bold text-danger">
                  방금 넣은 &lsquo;{addedItem.name}&rsquo;에 조심할 조합이 있어요
                </h2>
                {autoWarnings.map((w) => (
                  <WarningCard key={w.ruleId} w={w} />
                ))}
              </>
            ) : (
              <div className="rounded-2xl border border-ok/30 bg-ok-soft p-5">
                <p className="font-semibold text-ok">&lsquo;{addedItem.name}&rsquo;을(를) 넣었어요. {SAFE_MESSAGE}</p>
                <p className="mt-1 text-sm text-muted">확인한 자료(식약처 e약은요·논문)에서 지금 목록과 겹친다는 기록이 없다는 뜻이에요.</p>
              </div>
            )
          ) : (
            <div className="rounded-2xl border border-line bg-card p-5">
              <p className="font-semibold">&lsquo;{addedItem.name}&rsquo;을(를) 넣었어요.</p>
              <p className="mt-1 text-sm text-muted">지금 먹는 약과 영양제를 다 넣었으면 아래 &lsquo;검진하기&rsquo;를 눌러 한 번에 확인하세요.</p>
            </div>
          )}
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-card p-8 text-center">
          <p className="mb-2 text-lg font-semibold">아직 넣은 약·영양제가 없어요</p>
          <p className="text-muted">
            &lsquo;약·영양제 추가&rsquo;를 눌러 지금 먹는 것을 모두 넣어 주세요. 일반의약품은 제품 이름(예: 비맥스), 처방약은 성분 이름(예: 레보티록신),
            영양제는 성분 이름(예: 칼슘)으로 찾아요.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-muted">{item.sub}</p>
              </div>
              <form action={removeItemAction}>
                <input type="hidden" name="id" value={item.id} />
                <button type="submit" aria-label={`${item.name} 삭제`} className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-gray-100">
                  삭제
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <form action={runCheckAction}>
          <button
            type="submit"
            disabled={items.length === 0}
            className="rounded-xl bg-brand-strong px-6 py-3 text-lg font-semibold text-white hover:bg-brand disabled:cursor-not-allowed disabled:opacity-50"
          >
            검진하기
          </button>
        </form>
        {inUse ? (
          <>
            <Link href="/report" className="rounded-xl border border-line bg-card px-4 py-3 font-semibold hover:bg-gray-50">
              복용 리포트
            </Link>
            <p className="text-sm text-muted">사용 중: 새로 더할 때마다 자동으로 점검해요.</p>
          </>
        ) : (
          <p className="text-sm text-muted">다 넣은 뒤 한 번 검진하면, 그 뒤로는 더할 때마다 자동으로 점검해요.</p>
        )}
      </div>
    </section>
  )
}
