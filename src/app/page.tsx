import Link from 'next/link'
import { getCurrentUser } from '@/lib/session'
import { SERVICE_DESCRIPTION, SERVICE_NAME, SERVICE_TAGLINE } from '@/lib/brand'

export default async function HomePage() {
  const user = await getCurrentUser()
  return (
    <section className="flex flex-col gap-10">
      <div className="rounded-3xl bg-brand-soft px-6 py-10 text-center">
        <p className="mb-2 text-sm font-semibold tracking-wide text-brand-strong">{SERVICE_NAME}</p>
        <h1 className="mb-4 text-3xl font-bold leading-tight">{SERVICE_TAGLINE}</h1>
        <p className="mx-auto max-w-md text-base leading-relaxed text-foreground/80">{SERVICE_DESCRIPTION}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {user ? (
            <Link href="/list" className="rounded-xl bg-brand px-6 py-3 text-lg font-semibold text-white hover:bg-brand-strong">
              내 목록 보기
            </Link>
          ) : (
            <>
              <Link href="/signup" className="rounded-xl bg-brand px-6 py-3 text-lg font-semibold text-white hover:bg-brand-strong">
                회원가입
              </Link>
              <Link href="/login" className="rounded-xl border border-brand px-6 py-3 text-lg font-semibold text-brand-strong hover:bg-white">
                로그인
              </Link>
            </>
          )}
        </div>
      </div>

      <ol className="grid gap-4 sm:grid-cols-3">
        <li className="rounded-2xl border border-line bg-card p-5">
          <p className="mb-1 text-sm font-semibold text-brand-strong">1. 등록</p>
          <p className="font-medium">지금 먹는 약과 영양제를 검색하거나 사진으로 넣어요.</p>
        </li>
        <li className="rounded-2xl border border-line bg-card p-5">
          <p className="mb-1 text-sm font-semibold text-brand-strong">2. 검진</p>
          <p className="font-medium">같이 먹으면 위험한 조합을 식약처 원문과 논문 근거로 알려 드려요.</p>
        </li>
        <li className="rounded-2xl border border-line bg-card p-5">
          <p className="mb-1 text-sm font-semibold text-brand-strong">3. 자동 점검</p>
          <p className="font-medium">그 뒤로 하나 더할 때마다 묻지 않아도 먼저 경고해요.</p>
        </li>
      </ol>

      <p className="text-sm leading-relaxed text-muted">
        약과 영양제, 영양제끼리의 조합만 살펴봐요. 약과 약 사이의 조합은 다루지 않고, 처방이나 복용 지시를 하지 않아요. 확인한 자료에 없는 조합도
        &quot;안전&quot;이라고 단정하지 않으니 약사에게도 꼭 확인하세요.
      </p>
    </section>
  )
}
