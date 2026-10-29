'use client'

import Link from 'next/link'
import { useActionState, useRef, useState } from 'react'
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

/** 종류 배지: 일반약 / 처방약 / 영양제 */
export function KindBadge({ sub }: { sub: string }) {
  const kind = sub === '영양제 성분' ? '영양제' : sub === '처방약 성분' ? '처방약' : '일반약'
  return <span className={`badge ${kind === '영양제' ? 'badge-cobalt' : ''}`}>{kind}</span>
}

/** 고른 항목의 하루 개수·한 알 함량을 받아 '등록'. 경고가 오면 경고 창을 띄운다. */
export function RegisterPanel({ pick, onUnselect }: { pick: Pick; onUnselect?: () => void }) {
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(registerItem, {})
  const [closedAttempt, setClosedAttempt] = useState<number | undefined>(undefined)
  // 제어 입력으로 둔다. React는 action 뒤에 비제어 입력을 비우는데, 경고 창을 닫고 다시 '등록'할 때 값이 남아 있어야 한다.
  const [count, setCount] = useState('')
  const [amount, setAmount] = useState('')
  const forceRef = useRef<HTMLInputElement>(null)
  const dialogOpen = Boolean(state.warnings && state.warnings.length > 0 && state.attempt !== closedAttempt)
  const top = state.warnings?.[0]

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
        {onUnselect ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onUnselect}>
            다른 제품
          </button>
        ) : null}
      </div>
      <form
        action={formAction}
        style={{ marginTop: 16 }}
        onSubmit={(e) => {
          // 사용자가 직접 '등록'을 누를 때는 force를 비운다. '그래도 추가'만 force=1로 보낸다.
          const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
          if (forceRef.current) forceRef.current.value = submitter?.value === 'force' ? '1' : ''
        }}
      >
        <input type="hidden" name="item" value={pick.key} />
        <input ref={forceRef} type="hidden" name="force" defaultValue="" />
        <div className={pick.nutrient ? 'row-2' : undefined}>
          <div className="field">
            <label htmlFor="cnt">하루에 먹는 개수</label>
            <input
              className="input"
              id="cnt"
              name="daily_count"
              type="number"
              inputMode="numeric"
              min={1}
              max={20}
              required
              autoFocus
              value={count}
              onChange={(e) => setCount(e.target.value)}
              data-testid="reg-count"
            />
          </div>
          {pick.nutrient ? (
            <div className="field">
              <label htmlFor="mg">한 알 함량 (mg, 선택)</label>
              <input
                className="input"
                id="mg"
                name="unit_amount"
                type="text"
                inputMode="decimal"
                placeholder="예 500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
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
        <button type="submit" value="register" className="btn btn-primary btn-block" disabled={pending} data-testid="reg-submit">
          {pending ? '확인하고 있어요…' : '등록'}
        </button>

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
                <button type="button" className="btn" onClick={() => setClosedAttempt(state.attempt)} data-testid="modal-cancel">
                  취소
                </button>
                <Link className="btn" href={`/rules/${encodeURIComponent(top.ruleId)}`} data-testid="modal-detail">
                  자세히
                </Link>
                <button type="submit" value="force" className="btn btn-black" data-testid="modal-add">
                  그래도 추가
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </form>
    </div>
  )
}
