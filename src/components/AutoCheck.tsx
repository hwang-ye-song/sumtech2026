'use client'

import { useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom'

/**
 * '검진하기' 화면에 들어오면 바로 점검을 시작한다('검진 시작'을 한 번 더 누르지 않게).
 * 점검하는 동안 로딩 표시를 보여 주고, 끝나면 서버 액션이 리포트로 보낸다.
 * 화면 스크립트가 준비되기 전이거나 자동 시작이 막히면 '검진 시작' 버튼을 눌러 직접 시작할 수 있다.
 */
export function AutoCheck({ action }: { action: () => Promise<void> }) {
  const formRef = useRef<HTMLFormElement>(null)
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    formRef.current?.requestSubmit()
  }, [])
  return (
    <form ref={formRef} action={action}>
      <CheckStatus />
    </form>
  )
}

function CheckStatus() {
  const { pending } = useFormStatus()
  if (pending) {
    return (
      <div className="progress" role="status" data-testid="analyze-progress">
        <div className="p">
          <span className="dot" />
          목록을 점검하고 리포트를 만들고 있어요…
        </div>
      </div>
    )
  }
  return (
    <button type="submit" className="btn btn-primary btn-lg" data-testid="analyze-start">
      검진 시작
    </button>
  )
}
