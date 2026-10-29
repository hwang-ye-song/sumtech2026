import Link from 'next/link'

export default function NotFound() {
  return (
    <section className="py-16 text-center">
      <p className="mb-2 text-sm font-semibold text-muted">404</p>
      <h1 className="mb-4 text-2xl font-bold">없는 페이지예요</h1>
      <p className="mb-8 text-muted">주소가 바뀌었거나 잘못 입력된 것 같아요.</p>
      <Link href="/" className="rounded-xl bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-strong">
        첫 화면으로
      </Link>
    </section>
  )
}
