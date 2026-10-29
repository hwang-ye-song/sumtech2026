'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

/**
 * 서버 화면에 그려진 확인 창(예: '삭제할까요?')을 Esc나 바깥 누르기로 닫는다. 닫으면 href로 돌아간다.
 * 창 바깥 배경(.overlay) 안에 넣어 쓴다.
 */
export function DismissTo({ href }: { href: string }) {
  const router = useRouter()
  const marker = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const overlay = marker.current?.closest('.overlay')
    overlay?.querySelector<HTMLElement>('.actions a, .actions button')?.focus()
    const close = () => router.push(href)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    const onClick = (e: Event) => {
      if (e.target === overlay) close()
    }
    document.addEventListener('keydown', onKey)
    overlay?.addEventListener('click', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      overlay?.removeEventListener('click', onClick)
    }
  }, [href, router])
  return <span ref={marker} hidden />
}
