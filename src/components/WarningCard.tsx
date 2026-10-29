import Link from 'next/link'
import type { RuleSource, Warning } from '@/lib/check'
import { RELATION_LABEL, sourceKindLabel, type Relation } from '@/lib/labels'

const ICON: Record<Relation | 'over', string> = { avoid: '!', separate_timing: '◷', consult: '?', caution: '!', over: '≠' }

// 위험 정도를 색으로 나눈다: 함께 먹지 마세요(빨강) > 시간 띄우기·상의(주황) > 주의(회색). 과다 섭취는 노랑.
const BADGE: Record<Relation | 'over', string> = {
  avoid: 'badge-danger',
  separate_timing: 'badge-warn',
  consult: 'badge-warn',
  caution: 'badge-none',
  over: 'badge-over',
}

/** 단계 배지: '함께 먹지 마세요' / '시간을 띄워 드세요' / '하루 기준량을 넘어요' … */
export function LevelBadge({ level }: { level: Relation | 'over' }) {
  return (
    <span className={`badge ${BADGE[level]}`}>
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

/**
 * 경고 한 건: 단계 → 할 일 → 두 성분 → 원문 → 출처 → 약사에게 물을 질문 → '자세히'
 * detail='new-tab': 화면을 떠나면 사라지는 창(사진 후보)에서는 '자세히'를 새 탭으로 연다.
 */
export function WarningCard({ w, detail = true }: { w: Warning; detail?: boolean | 'new-tab' }) {
  const main = w.sources[0]
  return (
    <article className={`finding ${w.relation === 'avoid' ? 'finding-danger' : 'finding-warn'}`} data-testid="warning-card" data-rule={w.ruleId} aria-label={`${w.a.name} ↔ ${w.b.name}`}>
      <div className="head">
        <LevelBadge level={w.relation} />
      </div>
      <div className="act">{w.action}</div>
      <div className="pair" data-testid="finding-pair">
        {w.a.name} ↔ {w.b.name}
      </div>
      {w.effect ? <p className="muted">{w.effect}</p> : null}
      {w.condition ? (
        <p className="faint" data-testid="finding-condition">
          해당 조건: {w.condition}
        </p>
      ) : null}
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
          <Link
            className="btn btn-sm"
            href={`/rules/${encodeURIComponent(w.ruleId)}`}
            data-testid="finding-detail"
            {...(detail === 'new-tab' ? { target: '_blank', rel: 'noopener' } : {})}
          >
            자세히
          </Link>
        </div>
      ) : null}
    </article>
  )
}
