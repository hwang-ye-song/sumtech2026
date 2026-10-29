'use client'

import { useActionState, useState } from 'react'
import type { CatalogHit } from '@/lib/catalog'
import { registerMany, type BulkRegisterState } from '@/app/actions/items'
import { KindBadge } from '@/components/RegisterPanel'
import { WarningCard } from '@/components/WarningCard'
import { useDismiss } from '@/components/useDismiss'
import { CONSULT_NOTE, RELATION_LABEL } from '@/lib/labels'

/**
 * 사진에서 읽은 후보를 한 번에 등록한다. 후보는 모두 골라진 채로 시작하고, 빼고 싶은 것만 체크를 끈다.
 * 하루 개수는 1로 시작하고 줄마다 바꿀 수 있다. 경고가 있으면 경고 창에서 '취소'나 '그래도 모두 추가'를 고른다.
 */
export function PhotoBulkRegister({ hits }: { hits: CatalogHit[] }) {
  const [state, formAction, pending] = useActionState<BulkRegisterState, FormData>(registerMany, {})
  const [closedAttempt, setClosedAttempt] = useState<number | undefined>(undefined)
  const [checked, setChecked] = useState<Set<string>>(() => new Set(hits.map((h) => `${h.type}:${h.ref}`)))
  const [counts, setCounts] = useState<Record<string, string>>({})
  const dialogOpen = Boolean(state.warnings && state.warnings.length > 0 && state.attempt !== closedAttempt)
  const top = state.warnings?.[0]
  // Esc·바깥 누르기는 '취소'와 같다.
  const overlayRef = useDismiss<HTMLDivElement>(dialogOpen, () => setClosedAttempt(state.attempt))
  const keyOf = (h: CatalogHit) => `${h.type}:${h.ref}`
  const toggle = (k: string) =>
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })

  // 고른 항목과 하루 개수를 폼 값으로 보낸다('그래도 모두 추가'도 같은 값을 다시 보낸다).
  const fields = hits
    .filter((h) => checked.has(keyOf(h)))
    .map((h) => (
      <span key={keyOf(h)}>
        <input type="hidden" name="item" value={keyOf(h)} />
        <input type="hidden" name={`count:${keyOf(h)}`} value={counts[keyOf(h)] || '1'} />
      </span>
    ))

  return (
    <div className="stack">
      <ul className="results" aria-label="후보 목록" data-testid="candidates" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {hits.map((h) => {
          const k = keyOf(h)
          return (
            <li key={k} className="result" data-testid="candidate">
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, cursor: 'pointer' }}>
                <input type="checkbox" checked={checked.has(k)} onChange={() => toggle(k)} aria-label={h.name} />
                <span style={{ minWidth: 0 }}>
                  <span className="n">{h.name}</span> <KindBadge sub={h.sub} />
                  <br />
                  <span className="s">{h.sub}</span>
                </span>
              </label>
              <label className="faint" style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', flexShrink: 0 }}>
                하루
                <input
                  className="input"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={20}
                  value={counts[k] ?? '1'}
                  onChange={(e) => setCounts((p) => ({ ...p, [k]: e.target.value }))}
                  disabled={!checked.has(k)}
                  aria-label={`${h.name} 하루에 먹는 개수`}
                  style={{ width: 64, minHeight: 36, padding: '0 8px' }}
                />
                개
              </label>
            </li>
          )
        })}
      </ul>
      <form action={formAction}>
        {fields}
        {state.error ? (
          <p className="error" role="alert">
            {state.error}
          </p>
        ) : null}
        <button type="submit" className="btn btn-primary btn-block" disabled={pending || checked.size === 0} data-testid="bulk-submit">
          {pending ? '확인하고 있어요…' : `고른 ${checked.size}개 모두 등록`}
        </button>
      </form>

      {dialogOpen && state.warnings && top ? (
        <div className="overlay" data-overlay ref={overlayRef}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="bulk-warning-title" data-testid="modal">
            <div className="faint">등록하기 전에 확인하세요</div>
            <h3 id="bulk-warning-title">{RELATION_LABEL[top.relation]}</h3>
            {state.warnings.map((w) => (
              <WarningCard key={`${w.ruleId}|${w.a.ref}|${w.b.ref}`} w={w} detail={false} />
            ))}
            <div className="disclaimer" style={{ marginTop: 16 }}>
              {CONSULT_NOTE}
            </div>
            <div className="actions">
              <button type="button" className="btn" onClick={() => setClosedAttempt(state.attempt)} data-testid="modal-cancel">
                취소
              </button>
              <form action={formAction} style={{ display: 'contents' }}>
                {fields}
                <input type="hidden" name="force" value="1" />
                <button type="submit" className="btn btn-black" disabled={pending} data-testid="modal-add">
                  그래도 모두 추가
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
