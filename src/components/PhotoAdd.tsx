'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { recognizePhoto, type PhotoState } from '@/app/actions/photo'
import { SearchRegister } from '@/components/SearchRegister'

const CONSENT = '사진을 AI로 보내 글자를 읽어요. 읽은 뒤 사진은 바로 지우고 저장하지 않아요'

/**
 * 사진 등록: 사진 올리기 → (흐리면 다시 찍기) → 후보 고르기 → 하루 개수 → 등록
 * 사진을 고르면 바로 읽기 시작한다(동의 문구는 올리기 칸 아래에 항상 보인다).
 */
export function PhotoAdd({ aiReady }: { aiReady: boolean }) {
  const [state, formAction, pending] = useActionState<PhotoState, FormData>(recognizePhoto, {})
  const [retakeOf, setRetakeOf] = useState<PhotoState | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  // 스크립트가 준비되기 전에 사진을 골랐으면(변경 이벤트를 놓쳤으면) 준비되자마자 보낸다.
  useEffect(() => {
    if (fileRef.current?.files?.length) formRef.current?.requestSubmit()
  }, [])
  // '다시 찍기'를 누르면 직전 결과를 숨기고 올리기 칸을 다시 보여 준다.
  const shown = retakeOf === state ? {} : state

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
            <SearchRegister hits={shown.matches} testId="candidates" label="후보 목록" />
          </>
        )}
        <div className="row">
          <button type="button" className="btn btn-sm" onClick={() => setRetakeOf(state)}>
            다시 찍기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="stack">
      {shown.blurry ? (
        <div className="stack">
          <div className="notice notice-warn" role="alert" data-testid="photo-error">
            사진이 흐려서 읽지 못했어요. 다시 찍어 주세요
          </div>
          <div>
            <button type="button" className="btn btn-primary" onClick={() => setRetakeOf(state)} data-testid="photo-retry">
              다시 찍기
            </button>
          </div>
        </div>
      ) : null}
      {shown.error ? (
        <div className="notice notice-warn" role="alert" data-testid="photo-error">
          {shown.error}
        </div>
      ) : null}
      <form ref={formRef} action={formAction} hidden={Boolean(shown.blurry)}>
        <label className="drop" aria-disabled={!aiReady}>
          <svg className="drop-icon" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
          <br />
          <strong>사진 올리기</strong>
          <br />
          <span className="faint">아이콘을 눌러 갤러리에서 고르세요. 처방전·약 봉투·약 상자·영양제 상표 (JPG·PNG, 8MB 이하)</span>
          <input
            ref={fileRef}
            type="file"
            name="photo"
            accept="image/*"
            disabled={!aiReady}
            aria-label="사진 올리기"
            data-testid="photo-file"
            onChange={() => formRef.current?.requestSubmit()}
          />
        </label>
        <p className="faint" style={{ marginTop: 8 }}>
          {CONSENT}
        </p>
      </form>
    </div>
  )
}
