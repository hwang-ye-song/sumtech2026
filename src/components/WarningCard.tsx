import type { Warning } from '@/lib/check'
import { RELATION_LABEL, sourceLinkLabel } from '@/lib/labels'

const TONE: Record<Warning['relation'], string> = {
  avoid: 'border-danger/40 bg-danger-soft',
  separate_timing: 'border-warn/40 bg-warn-soft',
  consult: 'border-warn/40 bg-warn-soft',
  caution: 'border-line bg-card',
}

const BADGE: Record<Warning['relation'], string> = {
  avoid: 'bg-danger text-white',
  separate_timing: 'bg-warn text-white',
  consult: 'bg-warn text-white',
  caution: 'bg-gray-600 text-white',
}

export function WarningCard({ w, compact = false }: { w: Warning; compact?: boolean }) {
  return (
    <article data-testid="warning-card" className={`rounded-2xl border p-5 ${TONE[w.relation]}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${BADGE[w.relation]}`}>{RELATION_LABEL[w.relation]}</span>
        <h3 className="text-lg font-bold">
          {w.a.name} × {w.b.name}
        </h3>
      </div>
      {w.effect ? <p className="mb-2 font-medium">{w.effect}</p> : null}
      <blockquote className="mb-3 border-l-4 border-foreground/20 pl-3 text-[0.95rem] leading-relaxed">
        <p>“{w.quote}”</p>
        {w.quote_ko ? <p className="mt-1 text-muted">{w.quote_ko}</p> : null}
      </blockquote>
      <p className="mb-1">
        <span className="font-semibold">원문이 말하는 행동:</span> {w.action}
      </p>
      <p className={compact ? 'mb-2' : 'mb-3'}>
        <span className="font-semibold">약사에게 물어보세요:</span> {w.pharmacist_question}
      </p>
      <a
        href={w.source_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-sm font-medium text-brand-strong underline"
      >
        {sourceLinkLabel(w)} ↗
      </a>
      {!compact ? <p className="mt-1 text-xs text-muted">{w.source_title}</p> : null}
    </article>
  )
}
