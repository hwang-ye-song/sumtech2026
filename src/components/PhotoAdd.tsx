'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { recognizePhoto, type PhotoState } from '@/app/actions/photo'
import { SearchRegister } from '@/components/SearchRegister'
import { GetButton } from '@/components/GetButton'

const TIPS = ['플래시를 켜 주세요', '처방전이 보이게 찍어 주세요', '상표명이 보이게 찍어 주세요', '흐리지 않게 찍어 주세요']

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
const CONSENT = '사진을 AI로 보내 글자를 읽어요. 읽은 뒤 사진은 바로 지우고 저장하지 않아요'

/**
 * 사진 등록: 동의 → 촬영 안내 → 사진 올리기 → (흐리면 다시 찍기) → 후보 고르기 → 하루 개수 → 등록
 * 동의는 주소(?agree=1)로 받는다. 화면 스크립트가 준비되기 전에 눌러도 동작한다.
 */
export function PhotoAdd({ aiReady, agreed }: { aiReady: boolean; agreed: boolean }) {
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
          <GetButton action="/list" params={{ mode: 'photo', agree: '1' }} className="btn btn-primary" data-testid="photo-agree">
            동의하고 찍기
          </GetButton>
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
            <SearchRegister hits={shown.matches} testId="candidates" label="후보 목록" />
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
        <label className="drop">
          <strong>사진 올리기</strong>
          <br />
          <span className="faint">처방전·약 봉투·약 상자·영양제 상표 (JPG·PNG, 8MB 이하)</span>
          <input
            ref={fileRef}
            type="file"
            name="photo"
            accept="image/*"
            capture="environment"
            aria-label="사진 올리기"
            data-testid="photo-file"
            onChange={(e) => void submitShrunk(e.currentTarget, formRef.current)}
          />
        </label>
      </form>
    </div>
  )
}
