import Link from 'next/link'
import type { RuleSource, Warning } from '@/lib/check'
import { RELATION_LABEL, sourceKindLabel, type Relation } from '@/lib/labels'

const ICON: Record<Relation | 'over', string> = { avoid: '!', separate_timing: '◷', consult: '?', caution: '!', over: '≠' }

/** 단계 배지: '함께 먹지 마세요' / '시간을 띄워 드세요' / '하루 기준량을 넘어요' … */
export function LevelBadge({ level }: { level: Relation | 'over' }) {
  return (
    <span className={`badge ${level === 'over' ? 'badge-over' : level === 'caution' ? 'badge-none' : 'badge-warn'}`}>
      <span className="ico" aria-hidden="true">
        {ICON[level]}
      </span>
      {level === 'over' ? '하루 기준량을 넘어요' : RELATION_LABEL[level]}
    </span>
  )
}

/** 출처 한 줄: 종류 배지 · 제목 · 조건 · '출처 보기' */
export function SourceLine({ s }: { s: Pick<RuleSource, 'source_kind' | 'source_title' | 'source_note' | 'source_url'> }) {
  return (
    <div className="src">
      <span className="badge">{sourceKindLabel(s.source_kind)}</span>
      <span className="t">{s.source_title}</span>
      {s.source_note ? <span className="faint">{s.source_note}</span> : null}
      <a href={s.source_url} target="_blank" rel="noopener noreferrer" data-testid="src-link">
        출처 보기
      </a>
    </div>
  )
}

/** 경고 한 건: 단계 → 할 일 → 두 성분 → 원문 → 출처 → 약사에게 물을 질문 → '자세히' */
export function WarningCard({ w, detail = true }: { w: Warning; detail?: boolean }) {
  const main = w.sources[0]
  return (
    <article className="finding finding-warn" data-testid="warning-card" data-rule={w.ruleId} aria-label={`${w.a.name} ↔ ${w.b.name}`}>
      <div className="head">
        <LevelBadge level={w.relation} />
      </div>
      <div className="lvl">{RELATION_LABEL[w.relation]}</div>
      <div className="act">{w.action}</div>
      <div className="pair" data-testid="finding-pair">
        {w.a.name} ↔ {w.b.name}
      </div>
      {w.effect ? <p className="muted">{w.effect}</p> : null}
      {main ? (
        <blockquote className="quote">
          {main.quote}
          {main.quote_ko ? (
            <>
              <br />
              <span className="faint">{main.quote_ko}</span>
            </>
          ) : null}
        </blockquote>
      ) : null}
      <div className="stack" style={{ marginTop: 12 }}>
        {w.sources.map((s) => (
          <SourceLine key={s.source_url} s={s} />
        ))}
      </div>
      <div className="q">
        <strong>약사에게 물어보세요</strong>
        <br />
        {w.pharmacist_question}
      </div>
      {detail ? (
        <div style={{ marginTop: 12 }}>
          <Link className="btn btn-sm" href={`/rules/${encodeURIComponent(w.ruleId)}`} data-testid="finding-detail">
            자세히
          </Link>
        </div>
      ) : null}
    </article>
  )
}
