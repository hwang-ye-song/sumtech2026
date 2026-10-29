'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { recognizePhoto, type PhotoState } from '@/app/actions/photo'
import { PhotoBulkRegister } from '@/components/PhotoBulkRegister'

// 서버 액션은 요청을 1MB(설정으로 4MB)까지만 받고 Vercel은 4.5MB까지만 받는다. 휴대폰 사진(2~5MB)은
// 보내기 전에 긴 변 1600px JPEG로 줄인다. 글자 읽기에는 이 크기로 충분하다. 줄이지 못하면 원본을 보낸다.
const MAX_SIDE = 1600
const SHRINK_OVER_BYTES = 900 * 1024

async function shrinkPhoto(file: File): Promise<File> {
  if (file.size <= SHRINK_OVER_BYTES || !file.type.startsWith('image/')) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    if (!blob) return file
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}

/** 고른 사진을 줄여 입력 칸에 다시 넣은 뒤 폼을 보낸다. */
async function submitShrunk(input: HTMLInputElement, form: HTMLFormElement | null) {
  const file = input.files?.[0]
  if (file) {
    const small = await shrinkPhoto(file)
    if (small !== file) {
      const dt = new DataTransfer()
      dt.items.add(small)
      input.files = dt.files
    }
  }
  form?.requestSubmit()
}

const CONSENT = '가입할 때 동의한 대로 사진을 AI로 보내 글자를 읽어요. 읽은 뒤 사진은 바로 지우고 저장하지 않아요'

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
    if (fileRef.current?.files?.length) void submitShrunk(fileRef.current, formRef.current)
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
              <strong>사진에서 읽은 약이에요.</strong> 맞지 않는 것만 체크를 끄고 한 번에 등록하세요.
            </p>
            <PhotoBulkRegister hits={shown.matches} />
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
          <span className="faint">여기를 눌러 사진을 고르세요. 처방전·약 봉투·약 상자·영양제 상표 (JPG·PNG, 8MB 이하)</span>
          <input
            ref={fileRef}
            type="file"
            name="photo"
            accept="image/*"
            disabled={!aiReady}
            aria-label="사진 올리기"
            data-testid="photo-file"
            onChange={(e) => void submitShrunk(e.currentTarget, formRef.current)}
          />
        </label>
        <p className="faint" style={{ marginTop: 8 }}>
          {CONSENT}
        </p>
        {/* AI 키가 없으면 올리기 칸이 잠기므로, 검색으로 등록하라고 알려 준다(problem.yaml F2). */}
        {!aiReady ? (
          <div className="notice notice-none" role="status" data-testid="photo-unavailable">
            지금은 사진 읽기를 쓸 수 없어요. 검색창에 이름을 넣어 등록해 주세요
          </div>
        ) : null}
      </form>
    </div>
  )
}
