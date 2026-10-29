'use client'

import { useEffect, useState } from 'react'

/** 화면 아래에 3초 동안 떴다 사라지는 알림 */
export function Toast({ message }: { message: string }) {
  const [shown, setShown] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setShown(false), 3000)
    return () => clearTimeout(t)
  }, [])
  if (!shown) return null
  return (
    <div className="toast" role="status" data-testid="toast">
      {message}
    </div>
  )
}
