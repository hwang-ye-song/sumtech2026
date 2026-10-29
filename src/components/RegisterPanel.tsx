'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { registerItem, type RegisterState } from '@/app/actions/items'
import { WarningCard } from '@/components/WarningCard'
import { CONSULT_NOTE, RELATION_LABEL } from '@/lib/labels'

export interface Pick {
  key: string
  name: string
  sub: string
  /** 영양제 성분이면 '한 알 함량' 칸을 보여 준다(과다 섭취 확인용). */
  nutrient: boolean
}

/** 종류 배지: 일반약 / 처방약 / 영양제. sub는 catalog.ts가 만든 보조 설명이다. */
export function KindBadge({ sub }: { sub: string }) {
  const kind =
    sub === '영양제 성분' || sub.startsWith('건강기능식품') ? '영양제' : sub === '처방약 성분' || sub.startsWith('전문의약품') ? '처방약' : '일반약'
  return <span className={`badge ${kind === '영양제' ? 'badge-cobalt' : ''}`}>{kind}</span>
}

/**
 * 고른 항목의 하루 개수·한 알 함량을 받아 '등록'. 경고가 오면 경고 창을 띄운다.
 * 입력 칸은 비제어로 두고 서버가 돌려준 값(values)을 기본값으로 다시 그린다. 화면 스크립트가 준비되기 전에 입력해도 값이 남는다.
 * '그래도 추가'는 경고 창 안의 별도 폼으로, 방금 보낸 값을 그대로 다시 보낸다.
 */
export function RegisterPanel({
  pick,
  backHref,
  pickHref,
  initial,
  onUnselect,
}: {
  pick: Pick
  /** '다른 제품': 검색 결과로 돌아가는 주소 */
  backHref?: string
  /** 지금 이 항목을 고른 화면의 주소. 경고 창 '취소'가 입력값을 붙여 이 주소로 돌아간다(스크립트 준비 전에도 동작). */
  pickHref?: string
  /** 주소로 넘어온 입력값(취소하고 돌아왔을 때) */
  initial?: { count: string; amount: string }
  onUnselect?: () => void
}) {
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(registerItem, {})
  const [closedAttempt, setClosedAttempt] = useState<number | undefined>(undefined)
  const dialogOpen = Boolean(state.warnings && state.warnings.length > 0 && state.attempt !== closedAttempt)
  const top = state.warnings?.[0]
  const values = state.values ?? initial ?? { count: '', amount: '' }
  // 서버가 답할 때마다 칸을 새로 그려 기본값(values)을 다시 넣는다.
  const round = state.attempt ?? (state.error ? state.error.length : 0)

  return (
    <div className="card card-soft" data-testid="selected">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <span className="name" style={{ fontWeight: 700 }}>
            {pick.name}
          </span>{' '}
          <KindBadge sub={pick.sub} />
          <br />
          <span className="faint">{pick.sub}</span>
        </div>
        {backHref ? (
          <Link className="btn btn-ghost btn-sm" href={backHref}>
            다른 제품
          </Link>
        ) : onUnselect ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onUnselect}>
            다른 제품
          </button>
        ) : null}
      </div>
      <form action={formAction} style={{ marginTop: 16 }}>
        <input type="hidden" name="item" value={pick.key} />
        <div className={pick.nutrient ? 'row-2' : undefined}>
          <div className="field">
            <label htmlFor="cnt">하루에 먹는 개수</label>
            <input
              key={`c${round}`}
              className="input"
              id="cnt"
              name="daily_count"
              type="number"
              inputMode="numeric"
              min={1}
              max={20}
              required
              autoFocus
              defaultValue={values.count}
              data-testid="reg-count"
            />
          </div>
          {pick.nutrient ? (
            <div className="field">
              <label htmlFor="mg">한 알 함량 (mg, 선택)</label>
              <input
                key={`a${round}`}
                className="input"
                id="mg"
                name="unit_amount"
                type="text"
                inputMode="decimal"
                placeholder="예 500"
                defaultValue={values.amount}
                data-testid="reg-mg"
              />
              <span className="hint">함량을 넣으면 하루 기준량도 확인해 드려요</span>
            </div>
          ) : null}
        </div>
        {state.error ? (
          <p className="error" role="alert">
            {state.error}
          </p>
        ) : null}
        <button type="submit" className="btn btn-primary btn-block" disabled={pending} data-testid="reg-submit">
          {pending ? '확인하고 있어요…' : '등록'}
        </button>
      </form>

      {dialogOpen && state.warnings && top ? (
        <div className="overlay" data-overlay>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="warning-dialog-title" data-testid="modal">
            <div className="faint">등록하기 전에 확인하세요</div>
            <h3 id="warning-dialog-title">{RELATION_LABEL[top.relation]}</h3>
            {state.warnings.map((w) => (
              <WarningCard key={w.ruleId} w={w} detail={false} />
            ))}
            <div className="disclaimer" style={{ marginTop: 16 }}>
              {CONSULT_NOTE}
            </div>
            <div className="actions">
              {/* '취소': 스크립트가 준비됐으면 창만 닫는다. 준비 전이면 입력값을 붙여 고른 화면으로 돌아가는 GET 폼으로 동작한다. */}
              <form method="get" action={pickHref ? pickHref.split('?')[0] : undefined} style={{ display: 'contents' }}>
                {pickHref
                  ? [...new URLSearchParams(pickHref.split('?')[1] ?? '')].map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)
                  : null}
                <input type="hidden" name="count" value={values.count} />
                <input type="hidden" name="amount" value={values.amount} />
                <button
                  type="submit"
                  className="btn"
                  onClick={(e) => {
                    e.preventDefault()
                    setClosedAttempt(state.attempt)
                  }}
                  data-testid="modal-cancel"
                >
                  취소
                </button>
              </form>
              <Link className="btn" href={`/rules/${encodeURIComponent(top.ruleId)}`} data-testid="modal-detail">
                자세히
              </Link>
              <form action={formAction} style={{ display: 'contents' }}>
                <input type="hidden" name="item" value={pick.key} />
                <input type="hidden" name="daily_count" value={values.count} />
                <input type="hidden" name="unit_amount" value={values.amount} />
                <input type="hidden" name="force" value="1" />
                <button type="submit" className="btn btn-black" disabled={pending} data-testid="modal-add">
                  그래도 추가
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
