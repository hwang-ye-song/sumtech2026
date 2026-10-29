import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="page">
      <div className="wrap" style={{ maxWidth: 488, textAlign: 'center' }}>
        <div className="eyebrow">404</div>
        <h2>없는 페이지예요</h2>
        <p className="muted" style={{ margin: '16px 0 24px' }}>
          주소가 바뀌었거나 잘못 입력된 것 같아요.
        </p>
        <Link className="btn btn-primary" href="/">
          첫 화면으로
        </Link>
      </div>
    </main>
  )
}
