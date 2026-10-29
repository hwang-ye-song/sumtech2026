'use client'

import { useActionState, useRef, useState } from 'react'
import Link from 'next/link'
import { recognizePhoto, type PhotoState } from '@/app/actions/photo'
import { SearchRegister } from '@/components/SearchRegister'

const TIPS = ['플래시를 켜 주세요', '처방전이 보이게 찍어 주세요', '상표명이 보이게 찍어 주세요', '흐리지 않게 찍어 주세요']
const CONSENT = '사진을 AI로 보내 글자를 읽어요. 읽은 뒤 사진은 바로 지우고 저장하지 않아요'

/** 사진 등록: 동의 → 촬영 안내 → 사진 올리기 → (흐리면 다시 찍기) → 후보 고르기 → 하루 개수 → 등록 */
export function PhotoAdd({ aiReady }: { aiReady: boolean }) {
  const [state, formAction, pending] = useActionState<PhotoState, FormData>(recognizePhoto, {})
  const [agreed, setAgreed] = useState(false)
  const [retakeOf, setRetakeOf] = useState<PhotoState | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  // '다시 찍기'를 누르면 직전 결과를 숨기고 올리기 칸을 다시 보여 준다.
  const shown = retakeOf === state ? {} : state

  if (!aiReady) {
    return (
      <div className="notice notice-warn" role="alert">
        지금은 사진 인식을 쓸 수 없어요(AI 키가 설정되지 않음). <Link href="/list">검색으로 등록</Link>해 주세요.
      </div>
    )
  }

  if (!agreed) {
    return (
      <div className="stack" data-testid="photo-consent">
        <p>{CONSENT}</p>
        <div className="row">
          <button type="button" className="btn btn-primary" onClick={() => setAgreed(true)} data-testid="photo-agree">
            동의하고 찍기
          </button>
          <Link className="btn" href="/list">
            검색으로 등록
          </Link>
        </div>
      </div>
    )
  }

  if (pending) {
    return (
      <div className="progress">
        <div className="p">
          <span className="dot" />
          사진에서 글자를 읽는 중…
        </div>
      </div>
    )
  }

  if (shown.matches) {
    return (
      <div className="stack" aria-live="polite">
        {shown.readNames && shown.readNames.length > 0 ? <p className="faint">사진에서 읽은 글자: {shown.readNames.join(', ')}</p> : null}
        {shown.matches.length === 0 ? (
          <div className="notice notice-none">사진에서 찾지 못했어요. 이름으로 검색해 보세요</div>
        ) : (
          <>
            <p>
              <strong>사진에서 읽은 후보예요.</strong> 맞는 것을 골라 주세요.
            </p>
            <SearchRegister hits={shown.matches} testId="candidates" />
          </>
        )}
        <div className="row">
          <button type="button" className="btn btn-sm" onClick={() => setRetakeOf(state)}>
            다시 찍기
          </button>
          <Link className="btn btn-sm" href="/list">
            검색으로 등록
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="stack">
      <div className="card card-soft">
        <strong>촬영 안내</strong>
        <ul className="tips" data-testid="photo-tips">
          {TIPS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
      {shown.blurry ? (
        <div className="notice notice-warn" role="alert" data-testid="photo-error">
          사진이 흐려서 읽지 못했어요. 다시 찍어 주세요
        </div>
      ) : null}
      {shown.error ? (
        <div className="notice notice-warn" role="alert" data-testid="photo-error">
          {shown.error}
        </div>
      ) : null}
      <form ref={formRef} action={formAction}>
        <label className="drop">
          <strong>{shown.blurry || shown.error ? '다시 찍기' : '사진 올리기'}</strong>
          <br />
          <span className="faint">처방전·약 봉투·약 상자·영양제 상표 (JPG·PNG, 8MB 이하)</span>
          <input
            type="file"
            name="photo"
            accept="image/*"
            capture="environment"
            aria-label="사진 올리기"
            data-testid="photo-file"
            onChange={() => formRef.current?.requestSubmit()}
          />
        </label>
      </form>
    </div>
  )
}
