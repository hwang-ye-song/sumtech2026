'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { requestRecommendation, type RecommendState } from '@/app/actions/recommend'
import { RECOMMEND_DISCLAIMER } from '@/lib/labels'
import { GOALS, RANGES, SEXES, SYMPTOMS } from '@/lib/survey'
import { LevelBadge, SourceLine } from '@/components/WarningCard'

type RangeKey = keyof typeof RANGES

/** 숫자 항목: 끌어서 고르는 바. 고른 값은 제목 오른쪽에 숫자로 보인다. */
function RangeField({ name, label, value, onChange }: { name: RangeKey; label: string; value: number; onChange: (v: number) => void }) {
  const r = RANGES[name]
  const pct = ((value - r.min) / (r.max - r.min)) * 100
  return (
    <section className="survey-sec">
      <h4 className="range-head" id={`rec-${name}-label`}>
        {label}
        <span className="range-value num" aria-live="polite">
          {value}
        </span>
      </h4>
      <input
        className="range"
        type="range"
        name={name}
        min={r.min}
        max={r.max}
        step={1}
        value={value}
        style={{ '--pct': `${pct}%` } as React.CSSProperties}
        aria-labelledby={`rec-${name}-label`}
        aria-valuetext={`${value}${r.unit}`}
        onChange={(e) => onChange(Number(e.target.value))}
        data-testid={`rec-${name}`}
      />
    </section>
  )
}

/** 여러 개(또는 하나)를 누르는 알약 버튼 묶음. 고른 값은 숨은 칸으로 함께 보낸다. */
function PillGroup({ title, name, options, picked, onToggle, testId }: { title: string; name: string; options: readonly string[]; picked: string[]; onToggle: (o: string) => void; testId: string }) {
  return (
    <section className="survey-sec">
      <h4>{title}</h4>
      <div className="pills" role="group" aria-label={title} data-testid={testId}>
        {options.map((o) => (
          <button key={o} type="button" className="pill" aria-pressed={picked.includes(o)} onClick={() => onToggle(o)}>
            {o}
          </button>
        ))}
      </div>
      {picked.map((o) => (
        <input key={o} type="hidden" name={name} value={o} />
      ))}
    </section>
  )
}

const toggle = (list: string[], o: string) => (list.includes(o) ? list.filter((x) => x !== o) : [...list, o])

export function RecommendForm() {
  const [state, formAction, pending] = useActionState<RecommendState, FormData>(requestRecommendation, {})
  const [sex, setSex] = useState('')
  const [nums, setNums] = useState<Record<RangeKey, number>>({ age: RANGES.age.initial, heightCm: RANGES.heightCm.initial, weightKg: RANGES.weightKg.initial })
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [goals, setGoals] = useState<string[]>([])
  // '다시 고르기'를 누르면 직전 결과를 숨기고 설문을 다시 보여 준다.
  const [backFrom, setBackFrom] = useState<RecommendState | null>(null)
  const hasResult = backFrom !== state && Boolean(state.result || (state.cautions && state.cautions.length > 0))
  const setNum = (k: RangeKey) => (v: number) => setNums((p) => ({ ...p, [k]: v }))
  const clearAll = () => {
    setSex('')
    setNums({ age: RANGES.age.initial, heightCm: RANGES.heightCm.initial, weightKg: RANGES.weightKg.initial })
    setSymptoms([])
    setGoals([])
  }

  if (hasResult) return <Result state={state} onBack={() => setBackFrom(state)} />

  return (
    <div className="stack">
      <div className="disclaimer" data-testid="rec-disclaimer-top">
        {RECOMMEND_DISCLAIMER}
      </div>
      <div className="page-head" style={{ marginTop: 24 }}>
        <h2>
          무엇을 <b>원하세요?</b>
        </h2>
        <p className="muted">
          지금 드시는 약·영양제와 부딪친다는 기록이 없는 비타민만 골라 드려요. 부딪치는 성분은 추천 대신 &lsquo;주의&rsquo;로 보여 드려요. 추천은 성분 단위로만 보여 드려요.
        </p>
      </div>
      <form action={formAction} className="card survey">
        <section className="survey-sec">
          <h4>성별</h4>
          <div className="opt-cards" role="group" aria-label="성별" data-testid="rec-sex">
            {SEXES.map((s) => (
              <button key={s} type="button" className="opt-card" aria-pressed={sex === s} onClick={() => setSex(s)}>
                {s}
              </button>
            ))}
          </div>
          {sex ? <input type="hidden" name="sex" value={sex} /> : null}
        </section>
        <RangeField name="age" label="나이" value={nums.age} onChange={setNum('age')} />
        <RangeField name="heightCm" label="키" value={nums.heightCm} onChange={setNum('heightCm')} />
        <RangeField name="weightKg" label="몸무게" value={nums.weightKg} onChange={setNum('weightKg')} />
        <PillGroup title="현재 겪는 증상" name="symptom" options={SYMPTOMS} picked={symptoms} onToggle={(o) => setSymptoms((p) => toggle(p, o))} testId="symptoms" />
        <PillGroup title="개선하고 싶은 점" name="goal" options={GOALS} picked={goals} onToggle={(o) => setGoals((p) => toggle(p, o))} testId="goals" />

        <p className="faint survey-note">나이·성별·키·몸무게는 추천을 고를 때만 쓰고 저장하지 않아요. 진단이나 처방이 아니에요.</p>
        {state.error ? (
          <p className="error" role="alert">
            {state.error}
          </p>
        ) : null}
        <div className="survey-foot">
          <button type="button" className="btn" onClick={clearAll}>
            모두 지우기
          </button>
          <button type="submit" className="btn btn-primary" disabled={pending} data-testid="rec-submit">
            {pending ? 'AI가 고르고 있어요…' : '추천 보기'}
          </button>
        </div>
      </form>
    </div>
  )
}

/** 추천 결과 화면: 설문 대신 이 화면만 보여 준다. */
function Result({ state, onBack }: { state: RecommendState; onBack: () => void }) {
  return (
    <section aria-live="polite" className="stack">
      <div className="eyebrow">추천 결과</div>
      <h3>
        내 약과 부딪히지 않는 <b>성분</b>
      </h3>

      {state.result ? (
        <section className="stack" data-testid="rec-ok">
          <h4>추천</h4>
          {state.basis === 'rule' ? (
            <p className="faint" style={{ margin: 0 }}>
              지금은 AI를 쓸 수 없어, 고르신 부분과 식약처 기능성 내용이 맞는 성분으로 골랐어요.
            </p>
          ) : null}
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
        <button type="button" className="btn" onClick={onBack} data-testid="rec-back">
          다시 고르기
        </button>
        <Link className="btn btn-ghost" href="/">
          홈으로
        </Link>
      </div>
    </section>
  )
}
