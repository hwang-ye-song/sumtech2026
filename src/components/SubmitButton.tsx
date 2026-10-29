'use client'

import { useFormStatus } from 'react-dom'

/** 서버 액션 폼의 제출 버튼. 보내는 동안 막고 다른 글자를 보여 준다. */
export function SubmitButton({
  children,
  pendingLabel,
  className = 'btn btn-primary',
  ...rest
}: { children: React.ReactNode; pendingLabel: string; className?: string } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'>) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className={className} disabled={pending} {...rest}>
      {pending ? pendingLabel : children}
    </button>
  )
}
