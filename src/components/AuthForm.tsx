'use client'

import { useActionState } from 'react'
import type { AuthState } from '@/app/actions/auth'

interface Props {
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>
  submitLabel: string
  /** 회원가입이면 8자 이상 비밀번호와 '비밀번호 확인' 칸, 건강 정보 동의 칸을 둔다. */
  mode: 'login' | 'signup'
}

export function AuthForm({ action, submitLabel, mode }: Props) {
  const [state, formAction, pending] = useActionState(action, {})
  const signup = mode === 'signup'
  const p = signup ? 'su' : 'li'
  return (
    <form action={formAction}>
      <div className="field">
        <label htmlFor={`${p}-email`}>이메일</label>
        <input className="input" id={`${p}-email`} name="email" type="email" required autoComplete="email" inputMode="email" data-testid={`${mode}-email`} />
      </div>
      <div className="field">
        <label htmlFor={`${p}-pw`}>비밀번호</label>
        <input
          className="input"
          id={`${p}-pw`}
          name="password"
          type="password"
          required
          minLength={signup ? 8 : undefined}
          autoComplete={signup ? 'new-password' : 'current-password'}
          data-testid={`${mode}-pw`}
        />
        {signup ? <span className="hint">8자 이상</span> : null}
      </div>
      {signup ? (
        <>
          <div className="field">
            <label htmlFor="su-pw2">비밀번호 확인</label>
            <input className="input" id="su-pw2" name="password_confirm" type="password" required minLength={8} autoComplete="new-password" data-testid="signup-pw2" />
          </div>
          <div className="field">
            <label className="check">
              <input type="checkbox" name="consent" required data-testid="signup-consent" />
              <span>복용 중인 약·영양제(건강 정보) 수집·이용에 동의해요. 목록은 내 계정에만 저장되고 탈퇴하면 지워져요.</span>
            </label>
          </div>
        </>
      ) : null}
      {state.error ? (
        <p className="error" role="alert" data-testid={`${mode}-error`}>
          {state.error}
        </p>
      ) : null}
      <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={pending} data-testid={`${mode}-submit`}>
        {pending ? '잠시만요…' : submitLabel}
      </button>
    </form>
  )
}
