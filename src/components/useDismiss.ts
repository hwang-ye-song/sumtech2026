'use client'

import { useEffect, useRef } from 'react'

/**
 * 창(경고·확인)을 Esc나 바깥(어두운 배경) 누르기로 닫게 하고, 열리면 키보드 초점을 창 안 첫 버튼으로 옮긴다.
 * 돌려받은 ref를 창 바깥 배경(.overlay)에 붙인다.
 */
export function useDismiss<T extends HTMLElement>(open: boolean, onDismiss: () => void) {
  const ref = useRef<T>(null)
  const dismiss = useRef(onDismiss)
  useEffect(() => {
    dismiss.current = onDismiss
  })
  useEffect(() => {
    if (!open) return
    const overlay = ref.current
    overlay?.querySelector<HTMLElement>('.actions button, .actions a')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss.current()
    }
    const onClick = (e: MouseEvent) => {
      if (e.target === overlay) dismiss.current()
    }
    document.addEventListener('keydown', onKey)
    overlay?.addEventListener('click', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      overlay?.removeEventListener('click', onClick)
    }
  }, [open])
  return ref
}
