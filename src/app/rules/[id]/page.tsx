import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { ensureReady } from '@/lib/ready'
import { getRule } from '@/lib/check'
import { CONSULT_NOTE } from '@/lib/labels'
import { LevelBadge, SourceLine } from '@/components/WarningCard'

export const metadata = { title: '근거 보기' }

/** '자세히': 경고 한 건의 할 일·이유·출처별 원문·약사에게 물을 질문·DB 확인 날짜 */
export default async function RulePage({ params }: { params: Promise<{ id: string }> }) {
  await ensureReady()
  const user = await getCurrentUser()
  const { id } = await params
  if (!user) redirect(`/login?next=${encodeURIComponent(`/rules/${id}`)}`)
  const w = await getRule(decodeURIComponent(id))
  if (!w) notFound()

  return (
    <main className="page">
      <div className="wrap" style={{ maxWidth: 800 }}>
        <div className="page-head">
          <div className="eyebrow">근거 보기</div>
          <h2 data-testid="detail-title">
            {w.a.name} ↔ <b>{w.b.name}</b>
          </h2>
          <div style={{ marginTop: 8 }}>
            <LevelBadge level={w.relation} />
          </div>
        </div>
        <div className="card stack">
          <div>
            <div className="faint">해야 할 행동</div>
            <div className="act" style={{ fontSize: 'var(--fs-4)', fontWeight: 700, color: w.relation === 'avoid' ? 'var(--danger)' : 'var(--warn)', lineHeight: 1.25, wordBreak: 'keep-all' }}>
              {w.action}
            </div>
          </div>
          {w.effect ? (
            <div>
              <div className="faint">이유</div>
              <p>{w.effect}</p>
            </div>
          ) : null}
          {w.sources.map((s) => (
            <div key={s.source_url} data-testid="rule-source">
              <div className="faint">원문 문장</div>
              <blockquote className="quote">
                {s.quote}
                {s.quote_ko ? (
                  <>
                    <br />
                    <span className="faint">{s.quote_ko}</span>
                  </>
                ) : null}
              </blockquote>
              <div style={{ marginTop: 8 }}>
                <SourceLine s={s} />
              </div>
            </div>
          ))}
          <div>
            <div className="faint">약사에게 물을 질문</div>
            <p>{w.pharmacist_question}</p>
          </div>
          <p className="faint" data-testid="detail-checked">
            DB 확인 날짜 {w.checked_on ?? '기록 없음'}
          </p>
        </div>
        <div className="disclaimer" style={{ marginTop: 16 }}>
          {CONSULT_NOTE}
        </div>
        <div className="row" style={{ marginTop: 24 }}>
          <Link className="btn" href="/check/report">
            리포트로
          </Link>
          <Link className="btn btn-ghost" href="/list">
            복용 목록
          </Link>
        </div>
      </div>
    </main>
  )
}
