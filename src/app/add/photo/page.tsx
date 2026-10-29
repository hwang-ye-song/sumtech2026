import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { ensureReady } from '@/lib/ready'
import { aiConfigured } from '@/lib/ai'
import { PhotoAdd } from '@/components/PhotoAdd'

export const metadata = { title: '사진으로 추가' }

export default async function PhotoAddPage() {
  await ensureReady()
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">사진으로 추가</h1>
        <Link href="/add" className="rounded-xl border border-brand px-4 py-2 font-semibold text-brand-strong hover:bg-brand-soft">
          검색으로 추가
        </Link>
      </div>
      <p className="text-muted">약 상자나 영양제 통을 찍어 올리면 이름을 읽어 후보를 보여 드려요. 맞는 것을 골라 추가하세요.</p>
      <PhotoAdd aiReady={aiConfigured()} />
      <Link href="/list" className="self-start text-sm font-medium text-brand-strong underline">
        ← 내 목록으로
      </Link>
    </section>
  )
}
