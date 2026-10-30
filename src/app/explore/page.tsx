import Link from 'next/link'
import { ensureReady } from '@/lib/ready'
import { getCurrentUser } from '@/lib/session'
import {
  CAUTION_TYPE_LABEL,
  isSupplement,
  itemKey,
  listCatalog,
  productNotes,
  searchCatalog,
  substancesInProducts,
  type CatalogHit,
  type ProductNote,
} from '@/lib/catalog'
import { listAllRules, type Warning } from '@/lib/check'
import { CONSULT_NOTE, NO_RECORD_MESSAGE } from '@/lib/labels'
import { KindBadge } from '@/components/RegisterPanel'
import { LevelBadge } from '@/components/WarningCard'

export const metadata = { title: '약·영양제 알아보기' }

type Params = Record<string, string | string[] | undefined>
const KINDS = ['전체', '약', '영양제'] as const
const PAGE_SIZE = 10
const PAGE_GROUP = 10
/** 카드 하나에 보여 줄 경고 수. 성분 하나에 조합이 수십 개라 다 그리면 화면이 수 MB가 된다(규칙은 무거운 순으로 정렬돼 있다). */
const MAX_WARNINGS_PER_CARD = 8
/** 카드 하나에 보여 줄 약 설명서 주의 문장 수(나머지는 원문 링크로) */
const MAX_CAUTIONS_PER_CARD = 4

/** 로그인 없이 보는 화면: 성분·약마다 DB에 기록된 조합 주의사항과 출처 */
export default async function ExplorePage({ searchParams }: { searchParams: Promise<Params> }) {
  await ensureReady()
  const params = await searchParams
  const q = (typeof params.q === 'string' ? params.q : '').trim().slice(0, 50)
  const kind = KINDS.find((k) => k === params.kind) ?? '전체'

  const [rules, user] = await Promise.all([listAllRules(), getCurrentUser()])
  // 검색어가 없으면 성분만 보여 준다. 제품(약·건강기능식품 2,000개)은 검색으로 찾는다(한 화면에 다 그리면 수십 MB가 된다).
  const entries: CatalogHit[] = q.length >= 2 ? await searchCatalog(q, 40) : (await listCatalog()).filter((e) => e.type === 'substance')

  // 제품은 그 제품에 든 성분으로도 성분 규칙에 걸린다(판정과 같은 방식).
  // 조합 기록과 별개로, 제품 설명서에 적힌 주의사항(음주·다른 약 등)도 원문 그대로 함께 보여 준다.
  const [inProducts, notes] = await Promise.all([substancesInProducts(entries), productNotes(entries)])
  const related = (e: CatalogHit): Warning[] => {
    const keys = new Set([itemKey(e), ...(inProducts.get(itemKey(e)) ?? []).map((id) => `substance:${id}`)])
    return rules.filter((r) => r.members.a.some((k) => keys.has(k)) || r.members.b.some((k) => keys.has(k)))
  }
  const cards = entries
    .map((e) => ({ e, ws: related(e) }))
    .filter(({ e, ws }) => (q.length >= 2 || e.type === 'substance' || ws.length > 0) && (kind === '전체' || (kind === '영양제') === isSupplement(e)))
    .sort((a, b) => Number(b.ws.length > 0) - Number(a.ws.length > 0))

  // 게시판처럼 한 쪽에 PAGE_SIZE개, 쪽 번호는 PAGE_GROUP개씩 묶어 보여 준다.
  const pageCount = Math.max(1, Math.ceil(cards.length / PAGE_SIZE))
  const page = Math.min(pageCount, Math.max(1, Number.parseInt(typeof params.page === 'string' ? params.page : '', 10) || 1))
  const shown = cards.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const groupStart = Math.floor((page - 1) / PAGE_GROUP) * PAGE_GROUP + 1
  const groupEnd = Math.min(pageCount, groupStart + PAGE_GROUP - 1)

  const href = (k: string, p = 1) =>
    `/explore?${new URLSearchParams({ ...(q ? { q } : {}), ...(k !== '전체' ? { kind: k } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`

  return (
    <main className="page">
      <div className="wrap">
        <div className="page-head">
          <h2>
            같이 먹기 전에 <b>먼저 찾아봐요</b>
          </h2>
          <p className="muted prose">
            식약처 원문과 논문에 기록된 주의사항만 보여 줘요. 로그인 없이 볼 수 있고, 내 목록에 더하면 같이 먹는 것끼리 자동으로 점검해요.
          </p>
        </div>
        <form action="/explore" method="get" role="search" className="field" style={{ maxWidth: 520 }}>
          <label htmlFor="ex-q">제품명·성분·흔히 부르는 이름</label>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <input className="input" id="ex-q" name="q" type="search" placeholder="예 칼슘, 씬지로이드, 비맥스" defaultValue={q} autoComplete="off" data-testid="ex-input" />
            {kind !== '전체' ? <input type="hidden" name="kind" value={kind} /> : null}
            <button className="btn btn-black" type="submit">
              찾기
            </button>
          </div>
          {q && q.length < 2 ? <span className="error">2글자 이상 입력해 주세요</span> : null}
        </form>
        <div className="chip-row" role="group" aria-label="종류">
          {KINDS.map((k) => (
            <Link key={k} className="chip" href={href(k)} aria-pressed={kind === k} data-testid={`ex-kind-${k}`}>
              {k}
            </Link>
          ))}
        </div>

        {cards.length === 0 ? (
          <div className="empty" data-testid="ex-empty">
            찾는 제품이 없어요. 성분 이름(예 칼슘)으로 검색해 보세요
          </div>
        ) : (
          <div className="ex-list">
            <p className="faint" style={{ margin: '0 0 4px' }} data-testid="ex-count">
              총 {cards.length}개 · {page}/{pageCount}쪽
            </p>
            {shown.map(({ e, ws }) => {
              const note = notes.get(itemKey(e))
              const hasNote = Boolean(note && (note.cautions.length > 0 || note.precautions))
              return (
                <details key={`${e.type}:${e.ref}`} className="ex-row" data-testid="ex-card">
                  <summary className="ex-row-head">
                    <span className="ex-row-name">{e.name}</span>
                    <KindBadge sub={e.sub} />
                    {ws.length > 0 ? <span className="ex-row-warn">주의 {ws.length}건</span> : <span className="ex-row-ok">조합 기록 없음</span>}
                    {note && note.cautions.length > 0 ? <span className="ex-row-note">설명서 주의 {note.cautions.length}건</span> : null}
                  </summary>
                  <div className="ex-row-body">
                    <p className="faint" style={{ margin: 0 }}>
                      {e.sub}
                    </p>
                    {ws.length === 0 ? (
                      <div className="ex-none">
                        {hasNote ? '같이 먹으면 안 되는 조합으로 기록된 것은 없어요. 아래 제품 설명서의 주의사항은 꼭 확인하세요.' : NO_RECORD_MESSAGE}
                      </div>
                    ) : (
                      ws.slice(0, MAX_WARNINGS_PER_CARD).map((w) => (
                        <div key={w.ruleId} className="ex-w" data-testid="ex-warn">
                          <LevelBadge level={w.relation} />
                          <strong>
                            {w.a.name} ↔ {w.b.name}
                          </strong>
                          <span>{w.action}</span>
                          <span className="why">
                            {w.effect ? `${w.effect} ` : ''}출처:{' '}
                            <a href={w.sources[0]?.source_url} target="_blank" rel="noopener noreferrer" data-testid="src-link">
                              {w.sources[0]?.source_title}
                            </a>
                          </span>
                        </div>
                      ))
                    )}
                    {ws.length > MAX_WARNINGS_PER_CARD ? (
                      <p className="faint" style={{ margin: 0 }}>
                        외 {ws.length - MAX_WARNINGS_PER_CARD}건. 내 목록에 더하면 같이 먹는 것과의 조합만 골라 보여 드려요.
                      </p>
                    ) : null}
                    {note ? <ProductNoteBox note={note} /> : null}
                    <div>
                      <Link className="btn btn-sm" href={user ? `/list?q=${encodeURIComponent(e.name)}` : '/login?next=/list'}>
                        내 목록에 더하기
                      </Link>
                    </div>
                  </div>
                </details>
              )
            })}
          </div>
        )}
        {pageCount > 1 ? (
          <nav className="pager" aria-label="쪽 이동" data-testid="ex-pager">
            {groupStart > 1 ? (
              <Link className="pager-btn" href={href(kind, groupStart - 1)} aria-label="이전 묶음">
                ‹ 이전
              </Link>
            ) : null}
            {Array.from({ length: groupEnd - groupStart + 1 }, (_, i) => groupStart + i).map((p) => (
              <Link key={p} className="pager-btn" href={href(kind, p)} aria-current={p === page ? 'page' : undefined}>
                {p}
              </Link>
            ))}
            {groupEnd < pageCount ? (
              <Link className="pager-btn" href={href(kind, groupEnd + 1)} aria-label="다음 묶음">
                다음 ›
              </Link>
            ) : null}
          </nav>
        ) : null}
        <div className="disclaimer" style={{ marginTop: 24 }}>
          {CONSULT_NOTE}. 이 화면은 처방이나 진단이 아니에요.
        </div>
      </div>
    </main>
  )
}

/** 제품 설명서의 주의사항: 약은 e약은요 원문 문장, 건강기능식품은 식약처 신고 '섭취 시 주의사항'. 없으면 원문 링크만 */
function ProductNoteBox({ note }: { note: ProductNote }) {
  if (note.precautions) {
    return (
      <div className="ex-note" data-testid="ex-note">
        <strong>제품 설명서의 섭취 시 주의사항 (식약처 신고 문구)</strong>
        <p>{note.precautions}</p>
      </div>
    )
  }
  if (!note.sourceUrl) return null
  const link = (
    <a href={note.sourceUrl} target="_blank" rel="noopener noreferrer" data-testid="ex-note-link">
      {note.sourceTitle}
    </a>
  )
  if (note.cautions.length === 0) {
    return (
      <p className="faint" style={{ margin: 0 }} data-testid="ex-note">
        이 약 자체의 주의사항은 {link}에서 확인하세요.
      </p>
    )
  }
  return (
    <div className="ex-note" data-testid="ex-note">
      <strong>이 약 설명서의 주의사항 (식약처 e약은요 원문)</strong>
      <ul>
        {note.cautions.slice(0, MAX_CAUTIONS_PER_CARD).map((c) => (
          <li key={c.quote}>
            <span className="badge">{CAUTION_TYPE_LABEL[c.type] ?? CAUTION_TYPE_LABEL.other}</span>
            <span>{c.quote}</span>
          </li>
        ))}
      </ul>
      <p>
        {note.cautions.length > MAX_CAUTIONS_PER_CARD ? `외 ${note.cautions.length - MAX_CAUTIONS_PER_CARD}건과 전체 내용은 ` : '전체 내용은 '}
        {link}에서 확인하세요.
      </p>
    </div>
  )
}
