'use client'

import { useActionState } from 'react'
import type { AuthState } from '@/app/actions/auth'

interface Props {
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>
  submitLabel: string
  autoCompletePassword: 'current-password' | 'new-password'
}

export function AuthForm({ action, submitLabel, autoCompletePassword }: Props) {
  const [state, formAction, pending] = useActionState(action, {})
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="font-medium">이메일</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          className="rounded-xl border border-line bg-white px-4 py-3 text-base focus:border-brand focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-medium">비밀번호</span>
        <input
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete={autoCompletePassword}
          className="rounded-xl border border-line bg-white px-4 py-3 text-base focus:border-brand focus:outline-none"
        />
      </label>
      {state.error ? (
        <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-danger">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-brand px-4 py-3 text-lg font-semibold text-white hover:bg-brand-strong disabled:opacity-60"
      >
        {pending ? '잠시만요…' : submitLabel}
      </button>
    </form>
  )
}
