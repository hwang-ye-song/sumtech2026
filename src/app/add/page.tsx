import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { ensureReady } from '@/lib/ready'
import { SearchAdd } from '@/components/SearchAdd'

export const metadata = { title: '약·영양제 추가' }

export default async function AddPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await ensureReady()
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const params = await searchParams
  const error = typeof params.error === 'string' ? params.error : null
  const q = typeof params.q === 'string' ? params.q : ''

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">약·영양제 추가</h1>
        <Link href="/add/photo" className="rounded-xl border border-brand px-4 py-2 font-semibold text-brand-strong hover:bg-brand-soft">
          사진으로 추가
        </Link>
      </div>
      <p className="text-muted">일반의약품은 제품 이름, 처방약과 영양제는 성분 이름으로 찾아요.</p>
      {error === 'notfound' ? (
        <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-danger">
          그 항목을 찾지 못했어요. 다시 검색해 주세요.
        </p>
      ) : null}
      <SearchAdd initialQuery={q} />
      <Link href="/list" className="self-start text-sm font-medium text-brand-strong underline">
        ← 내 목록으로
      </Link>
    </section>
  )
}
