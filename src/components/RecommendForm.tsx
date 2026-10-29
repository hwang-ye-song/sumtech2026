'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { requestRecommendation, type RecommendState } from '@/app/actions/recommend'
import { RECOMMEND_DISCLAIMER } from '@/lib/labels'
import { LevelBadge, SourceLine } from '@/components/WarningCard'

const GOALS = ['피로', '눈', '뼈', '피부', '면역']
const PILLS = [1, 2, 3]

export function RecommendForm() {
  const [state, formAction, pending] = useActionState<RecommendState, FormData>(requestRecommendation, {})

  return (
    <div className="stack">
      <form action={formAction} className="stack">
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend>
            <h4>좋아지고 싶은 부분</h4>
          </legend>
          <p className="faint">여러 개 골라도 돼요</p>
          <div className="row" style={{ gap: 8 }} data-testid="goals">
            {GOALS.map((g) => (
              <label key={g} className="chip">
                <input type="checkbox" name="goal" value={g} />
                {g}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend>
            <h4>하루에 먹을 수 있는 알 수</h4>
          </legend>
          <p className="faint">이만큼만 추천해요</p>
          <div className="row" style={{ gap: 8 }}>
            {PILLS.map((p) => (
              <label key={p} className="chip">
                <input type="radio" name="pills" value={p} required />
                {p}알
              </label>
            ))}
          </div>
        </fieldset>

        <div className="field">
          <label htmlFor="note">더 적고 싶은 것 (선택)</label>
          <textarea className="input" id="note" name="note" maxLength={200} placeholder="예 요즘 야근이 많아요" />
        </div>
        <p className="faint">나이·질환·임신 같은 개인 건강 정보는 묻지 않아요. 답은 추천을 만들 때만 써요.</p>

        {state.error ? (
          <p className="error" role="alert">
            {state.error}
          </p>
        ) : null}
        <div>
          <button type="submit" className="btn btn-primary btn-lg" disabled={pending} data-testid="rec-submit">
            {pending ? 'AI가 고르고 있어요…' : '추천 보기'}
          </button>
        </div>
      </form>

      {state.result || (state.cautions && state.cautions.length > 0) ? (
        <section aria-live="polite" className="stack" style={{ marginTop: 32 }}>
          <div className="eyebrow">추천 결과</div>
          <h3>
            내 약과 부딪히지 않는 <b>성분</b>
          </h3>

          {state.result ? (
            <section className="stack" data-testid="rec-ok">
              <h4>추천 (하루 {state.pills}알)</h4>
              {state.result.length === 0 ? (
                <div className="empty">설문에 맞는 비타민을 찾지 못했어요. 다른 부분을 골라 보세요.</div>
              ) : (
                state.result.map((r) => (
                  <div key={r.id} className="card" data-testid="recommendation">
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <h4>{r.name}</h4>
                      <span className="badge badge-cobalt">추천</span>
                    </div>
                    <p className="muted" style={{ marginTop: 8 }}>
                      왜 골랐나요: {r.why}
                    </p>
                    <blockquote className="quote">{r.function_claim}</blockquote>
                    <div style={{ marginTop: 8 }}>
                      <SourceLine
                        s={{ source_kind: 'mfds_approval', source_title: r.function_source_title ?? '식약처 건강기능식품 기능성 내용', source_note: null, source_url: r.function_source_url }}
                      />
                    </div>
                  </div>
                ))
              )}
            </section>
          ) : null}

          {state.cautions && state.cautions.length > 0 ? (
            <section className="stack" data-testid="rec-warn">
              <h4>주의</h4>
              <p className="faint">고르신 부분과 맞지만, 지금 드시는 것과 부딪친다는 기록이 있어 추천이 아니라 경고로 보여 드려요.</p>
              {state.cautions.map((c) => (
                <div key={c.id} className="card" style={{ borderColor: 'var(--warn)' }} data-testid="caution">
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <h4>{c.name}</h4>
                    {c.warnings[0] ? <LevelBadge level={c.warnings[0].relation} /> : null}
                  </div>
                  {c.warnings.map((w) => (
                    <div key={w.ruleId} style={{ marginTop: 8 }}>
                      <p className="muted" style={{ margin: 0 }}>
                        {w.a.name} ↔ {w.b.name}: {w.action}
                      </p>
                      {w.sources[0] ? <SourceLine s={w.sources[0]} /> : null}
                    </div>
                  ))}
                </div>
              ))}
            </section>
          ) : null}

          <div className="disclaimer" data-testid="rec-disclaimer-bottom">
            {RECOMMEND_DISCLAIMER}
          </div>
          <div className="row">
            <Link className="btn btn-ghost" href="/">
              홈으로
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  )
}
