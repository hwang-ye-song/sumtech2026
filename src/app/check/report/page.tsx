import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { ensureReady } from '@/lib/ready'
import { doseText, listUserItems } from '@/lib/items'
import { isSupplement } from '@/lib/catalog'
import { checkIntake, checkItems, type IntakeWarning, type RuleSource } from '@/lib/check'
import { CONSULT_NOTE, DATA_CHECKED_ON } from '@/lib/labels'
import { KindBadge } from '@/components/RegisterPanel'
import { LevelBadge, SourceLine, WarningCard } from '@/components/WarningCard'
import { NoRecordCard } from '@/components/NoRecordCard'

export const metadata = { title: '복용 리포트' }

const fmt = (n: number) => n.toLocaleString('ko-KR')

export default async function ReportPage() {
  await ensureReady()
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const items = await listUserItems(user.id)
  const [warnings, intake] = await Promise.all([checkItems(items), checkIntake(items)])
  const total = warnings.length + intake.length
  const sups = items.filter(isSupplement)
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date())
  const oneLine = items.map((i) => `${i.name} ${doseText(i)}`).join(', ')

  // 출처는 한 번씩만 모아 아래에 다시 보여 준다.
  const sources = new Map<string, Pick<RuleSource, 'source_kind' | 'source_title' | 'source_note' | 'source_url'>>()
  for (const w of warnings) for (const s of w.sources) sources.set(s.source_url, s)
  for (const x of intake) sources.set(x.source_url, { source_kind: 'other', source_title: x.source_title, source_note: null, source_url: x.source_url })

  return (
    <main className="page">
      <div className="wrap" style={{ maxWidth: 800 }}>
        <div className="page-head">
          <div className="eyebrow">복용 리포트 · {today}</div>
          <h2 data-testid="report-title">
            주의할 항목 <b className="num">{total}</b>개
          </h2>
          <p className="faint">{user.display_name ?? user.email} · 약사·의사에게 보여 주세요</p>
        </div>
        <div className="summary">
          <div className={`card ${total ? 'warn' : ''}`}>
            <div className="faint">주의할 항목</div>
            <div className="num" data-testid="sum-findings">
              {total}
            </div>
          </div>
          <div className="card">
            <div className="faint">약</div>
            <div className="num">{items.length - sups.length}</div>
          </div>
          <div className="card">
            <div className="faint">영양제</div>
            <div className="num">{sups.length}</div>
          </div>
        </div>

        <section className="stack" style={{ marginTop: 24 }} data-testid="report-findings">
          {total === 0 ? <NoRecordCard /> : null}
          {warnings.map((w) => (
            <WarningCard key={w.ruleId} w={w} />
          ))}
          {intake.map((x) => (
            <IntakeCard key={x.substanceId} x={x} />
          ))}
        </section>

        <section className="card" style={{ marginTop: 24 }} data-testid="report-list">
          <h4>복용 중인 약·영양제</h4>
          <p className="muted">
            약사에게 보여 줄 한 줄: <strong data-testid="report-oneline">{oneLine || '없음'}</strong>
          </p>
          <table className="tbl" aria-label="복용 중인 약·영양제">
            <thead>
              <tr>
                <th>이름</th>
                <th>종류</th>
                <th>하루 복용량</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td>
                    <span className="name">{i.name}</span>
                  </td>
                  <td>
                    <KindBadge sub={i.sub} />
                  </td>
                  <td>{doseText(i)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {sources.size > 0 ? (
          <section className="card" style={{ marginTop: 24 }}>
            <h4>출처</h4>
            <div className="stack" style={{ marginTop: 12 }}>
              {[...sources.values()].map((s) => (
                <SourceLine key={s.source_url} s={s} />
              ))}
            </div>
            <p className="faint" style={{ marginTop: 12 }}>
              DB 확인 날짜 {DATA_CHECKED_ON}
            </p>
          </section>
        ) : null}

        <div className="disclaimer" style={{ marginTop: 24 }} data-testid="report-disclaimer">
          {CONSULT_NOTE}. 이 리포트는 등록한 목록과 출처가 있는 조합 DB로만 만든 것이고 처방이나 진단이 아니에요.
        </div>
        <div className="row no-print" style={{ marginTop: 24 }}>
          <Link className="btn btn-black btn-lg" href="/recommend" data-testid="report-recommend">
            영양제 추천받기
          </Link>
          <Link className="btn btn-lg" href="/list">
            복용 목록
          </Link>
        </div>
      </div>
    </main>
  )
}

/** 하루 기준량을 넘는 성분 한 건(S8) */
function IntakeCard({ x }: { x: IntakeWarning }) {
  return (
    <article className="finding finding-over" data-testid="intake-card">
      <div className="head">
        <LevelBadge level="over" />
      </div>
      <div className="lvl">{x.overAll ? '하루 기준량을 넘어요' : '나이에 따라 하루 기준량을 넘을 수 있어요'}</div>
      <div className="act">
        내 하루 {x.name} <span className="num">{fmt(x.total)}</span>
        {x.unit}
      </div>
      <div className="pair">{x.breakdown}</div>
      <p className="muted">
        출처의 하루 기준량: {x.limits.map((l) => `${l.label} ${fmt(l.amount)}${x.unit}`).join(', ')}
      </p>
      <blockquote className="quote">{x.quote}</blockquote>
      <div className="stack" style={{ marginTop: 12 }}>
        <SourceLine s={{ source_kind: 'other', source_title: x.source_title, source_note: null, source_url: x.source_url }} />
      </div>
      <div className="q">
        <strong>약사에게 물어보세요</strong>
        <br />
        하루 {x.name}을(를) 얼마나 줄이면 되나요? 음식으로 먹는 양까지 더하면 어떻게 되나요?
      </div>
    </article>
  )
}
