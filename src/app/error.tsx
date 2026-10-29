'use client'

import Link from 'next/link'
import { useEffect } from 'react'

/** 화면을 그리다 서버 오류가 나면 Next.js 기본 영어 화면 대신 이 안내를 보여 준다. 입력한 목록은 그대로 남아 있다. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <main className="page">
      <div className="wrap" style={{ maxWidth: 488, textAlign: 'center' }} role="alert" data-testid="error-page">
        <h2>잠시 문제가 생겼어요</h2>
        <p className="muted" style={{ margin: '16px 0 24px' }}>
          등록해 둔 약·영양제는 그대로 있어요. 다시 시도해 보고, 계속 안 되면 잠시 뒤에 들어와 주세요.
        </p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn btn-primary" onClick={reset}>
            다시 시도
          </button>
          <Link className="btn" href="/">
            첫 화면으로
          </Link>
        </div>
        {error.digest ? <p className="faint" style={{ marginTop: 16 }}>오류 번호 {error.digest}</p> : null}
      </div>
    </main>
  )
}
