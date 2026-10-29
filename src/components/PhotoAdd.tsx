'use client'

import { useActionState, useRef } from 'react'
import Link from 'next/link'
import { recognizePhoto, type PhotoState } from '@/app/actions/photo'
import { addItemAction } from '@/app/actions/items'

export function PhotoAdd({ aiReady }: { aiReady: boolean }) {
  const [state, formAction, pending] = useActionState<PhotoState, FormData>(recognizePhoto, {})
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <div className="flex flex-col gap-5">
      {!aiReady ? (
        <p role="alert" className="rounded-xl bg-warn-soft px-4 py-3 text-warn">
          지금은 사진 인식을 쓸 수 없어요(AI 키가 설정되지 않음). <Link href="/add" className="underline">검색으로 추가</Link>해 주세요.
        </p>
      ) : null}

      <form ref={formRef} action={formAction} className="rounded-2xl border border-dashed border-brand/50 bg-card p-5">
        <label className="flex cursor-pointer flex-col items-center gap-2 py-4 text-center">
          <span className="text-lg font-semibold">사진 올리기</span>
          <span className="text-sm text-muted">약 상자·약 봉투·영양제 통이 잘 보이게 찍은 사진 1장 (JPG·PNG, 8MB 이하)</span>
          <input
            type="file"
            name="photo"
            accept="image/*"
            capture="environment"
            disabled={!aiReady || pending}
            onChange={() => formRef.current?.requestSubmit()}
            className="mt-2 block text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-4 file:py-2 file:font-semibold file:text-white"
          />
        </label>
        {pending ? <p className="text-center text-sm text-muted">사진에서 이름을 읽고 있어요…</p> : null}
      </form>

      {state.error ? (
        <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-danger">
          {state.error}
        </p>
      ) : null}

      {state.matches ? (
        <section aria-live="polite" className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">인식 결과</h2>
          {state.readNames && state.readNames.length > 0 ? (
            <p className="text-sm text-muted">사진에서 읽은 글자: {state.readNames.join(', ')}</p>
          ) : null}
          {state.matches.length === 0 ? (
            <div className="rounded-2xl border border-line bg-card p-5">
              <p className="font-semibold">사진에서 우리 목록에 있는 약·영양제를 찾지 못했어요</p>
              <p className="mt-1 text-sm text-muted">
                이름이 잘 보이게 다시 찍거나,{' '}
                <Link href="/add" className="font-medium text-brand-strong underline">
                  검색으로 추가
                </Link>
                해 주세요.
              </p>
            </div>
          ) : (
            <ul aria-label="인식 결과" className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
              {state.matches.map((hit) => (
                <li key={`${hit.type}:${hit.ref}`} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="font-semibold">{hit.name}</p>
                    <p className="text-sm text-muted">{hit.sub}</p>
                  </div>
                  <form action={addItemAction}>
                    <input type="hidden" name="item" value={`${hit.type}:${hit.ref}`} />
                    <button type="submit" aria-label={`${hit.name} 추가`} className="rounded-lg bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-strong">
                      추가
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  )
}
