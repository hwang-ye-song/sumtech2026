'use client'

import './globals.css'

/** 레이아웃까지 그리지 못한 오류. 머리글 없이 최소한의 안내만 보여 준다. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ko">
      <body>
        <main className="page">
          <div className="wrap" style={{ maxWidth: 488, textAlign: 'center' }} role="alert">
            <h2>잠시 문제가 생겼어요</h2>
            <p className="muted" style={{ margin: '16px 0 24px' }}>
              등록해 둔 약·영양제는 그대로 있어요. 다시 시도해 주세요.
            </p>
            <button type="button" className="btn btn-primary" onClick={reset}>
              다시 시도
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
