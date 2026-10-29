import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { ensureReady } from '@/lib/ready'
import { aiConfigured } from '@/lib/ai'
import { doseText, listUserItems, type UserItem } from '@/lib/items'
import { isSupplement, itemKey, nameItems, parseItemKey, searchCatalog } from '@/lib/catalog'
import { removeItemAction } from '@/app/actions/items'
import { NoRecordCard } from '@/components/NoRecordCard'
import { KindBadge, RegisterPanel } from '@/components/RegisterPanel'
import { GetButton } from '@/components/GetButton'
import { PhotoAdd } from '@/components/PhotoAdd'
import { Toast } from '@/components/Toast'
import { josa } from '@/lib/labels'
import { DismissTo } from '@/components/DismissTo'

export const metadata = { title: '복용 목록' }

type Params = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '')

/**
 * 복용 목록: 왼쪽 등록 패널(검색 / 사진 두 구역), 오른쪽 약·영양제 표. 등록·삭제 결과도 여기서 보여 준다.
 * 검색 결과 고르기(?pick=)와 삭제 확인 창(?confirm=)은 주소로 그린다. 화면 스크립트가 준비되기 전에 눌러도 동작한다.
 */
export default async function ListPage({ searchParams }: { searchParams: Promise<Params> }) {
  await ensureReady()
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/list')

  const params = await searchParams
  const q = one(params.q).trim().slice(0, 50)
  const added = parseItemKey(one(params.added))
  const status = one(params.status)
  const deleted = params.deleted === '1'
  const welcome = params.welcome === '1'
  const pickRef = parseItemKey(one(params.pick))
  const confirmId = Number(one(params.confirm))

  const [items, hits] = await Promise.all([listUserItems(user.id), q.length >= 2 ? searchCatalog(q) : Promise.resolve([])])
  const inUse = user.first_checked_at !== null
  const addedItem = added ? items.find((i) => itemKey(i) === itemKey(added)) : undefined
  // 사진으로 여러 개를 한 번에 넣었으면 '훼로바-유서방정 외 2개'처럼 보여 준다.
  const addedCount = Number(one(params.addedCount)) || 1
  const addedLabel = addedItem ? (addedCount > 1 ? `${addedItem.name} 외 ${addedCount - 1}개` : addedItem.name) : ''
  // 사진 일괄 등록에서 이미 목록에 있어 건너뛴 개수
  const skipped = Math.min(20, Number(one(params.skipped)) || 0)
  const drugs = items.filter((i) => !isSupplement(i))
  const sups = items.filter(isSupplement)
  const confirmItem = Number.isInteger(confirmId) ? items.find((i) => i.id === confirmId) : undefined
  // 고른 항목: 검색 결과에 있으면 그대로, 아니면 DB에서 이름을 찾는다(없는 참조면 고르지 않은 것으로 본다).
  let picked: { key: string; name: string; sub: string } | null = null
  if (pickRef) {
    const hit = hits.find((h) => itemKey(h) === itemKey(pickRef)) ?? (await nameItems([pickRef]))[0]
    if (hit && hit.sub) picked = { key: itemKey(pickRef), name: hit.name, sub: hit.sub }
  }
  const searchHref = q ? `/list?q=${encodeURIComponent(q)}` : '/list'
  // 경고 창 '취소'로 돌아올 때 붙어 오는 입력값(짧은 숫자 글자만 받는다)
  const short = (v: string) => v.replace(/[^0-9.,mgMG ]/g, '').slice(0, 12)
  const initial = { count: short(one(params.count)), amount: short(one(params.amount)) }

  return (
    <main className="page">
      <div className="wrap">
        <div className="page-head">
          <h2>
            먹고 있는 약과 영양제를 <b>한자리에</b>
          </h2>
        </div>
        {welcome && items.length === 0 ? (
          <div className="notice" role="status" data-testid="welcome" style={{ marginBottom: 16 }}>
            <strong>가입을 환영해요! 지금 먹고 있는 약과 영양제를 먼저 등록해 주세요.</strong>
            <br />
            제품 이름이나 성분으로 검색하거나 약 봉투·상자 사진을 올리면 돼요. 다 넣은 뒤 &lsquo;검진하기&rsquo;를 누르면 한 번에 점검해요.
          </div>
        ) : null}
        <div className="stack">
          <div className="reg-grid">
          <section className="card" aria-labelledby="reg-search" data-testid="section-search">
            <h3 id="reg-search" style={{ marginBottom: 12 }}>
              검색 등록
            </h3>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <>
                  <form action="/list" method="get" role="search">
                    <div className="field">
                      <label htmlFor="q">제품명·성분</label>
                      <div className="row" style={{ flexWrap: 'nowrap' }}>
                        <input
                          className="input"
                          id="q"
                          name="q"
                          type="search"
                          aria-label="검색창"
                          placeholder="예 비맥스, 레보티록신, 칼슘"
                          defaultValue={q}
                          autoComplete="off"
                          data-testid="search-input"
                        />
                        <button className="btn btn-black" type="submit" data-testid="search-submit">
                          검색
                        </button>
                      </div>
                      {q && q.length < 2 ? <span className="error">2글자 이상 입력해 주세요</span> : null}
                      <span className="hint">일반의약품은 제품 이름, 처방약과 영양제는 성분 이름으로 찾아요.</span>
                    </div>
                  </form>
                  {picked ? (
                    <RegisterPanel
                      key={picked.key}
                      pick={{ ...picked, nutrient: picked.sub === '영양제 성분' }}
                      backHref={searchHref}
                      pickHref={`/list?q=${encodeURIComponent(q)}&pick=${encodeURIComponent(picked.key)}`}
                      initial={initial}
                    />
                  ) : null}
                  {!picked && q.length >= 2 && hits.length === 0 ? (
                    <div className="empty" data-testid="search-empty">
                      찾는 제품이 없어요. 성분 이름(예 칼슘)으로 검색해 보세요
                    </div>
                  ) : null}
                  {!picked && hits.length > 0 ? (
                    <ul className="results" aria-label="검색 결과" data-testid="results" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                      {hits.map((hit) => (
                        <li key={itemKey(hit)}>
                          <GetButton action="/list" params={{ q, pick: itemKey(hit) }} className="result" aria-label={hit.name} data-testid="result">
                            <span>
                              <span className="n">{hit.name}</span> <KindBadge sub={hit.sub} />
                              <br />
                              <span className="s">{hit.sub}</span>
                            </span>
                            <span className="faint">고르기</span>
                          </GetButton>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
            </div>
          </section>

          <section className="card" aria-labelledby="reg-photo" data-testid="section-photo">
            <h3 id="reg-photo" style={{ marginBottom: 12 }}>
              사진 등록
            </h3>
            <PhotoAdd aiReady={aiConfigured()} />
          </section>
          </div>

          <section className="stack" aria-label="내 목록">
            {deleted ? <Toast message="등록된 약·영양제가 목록에서 삭제되었습니다." /> : null}
            {addedItem && status === 'clear' ? <NoRecordCard lead={`'${addedLabel}'${josa(addedLabel, '을/를')} 목록에 넣었어요.`} /> : null}
            {addedItem && status === 'warned' ? (
              <div className="notice notice-warn" role="status">
                &lsquo;{addedLabel}&rsquo;{josa(addedLabel, '을/를')} 경고를 확인하고 넣었어요. 복용을 바꾸기 전에 약사·의사와 상담하세요
              </div>
            ) : null}
            {addedItem && skipped > 0 ? (
              <div className="notice notice-none" role="status" data-testid="skipped-notice">
                고른 것 중 {skipped}개는 이미 목록에 있어서 다시 넣지 않았어요.
              </div>
            ) : null}
            {addedItem && status === 'new' ? (
              <div className="notice" role="status">
                &lsquo;{addedLabel}&rsquo;{josa(addedLabel, '을/를')} 넣었어요. 지금 먹는 것을 다 넣었으면 &lsquo;검진하기&rsquo;에서 한 번에 확인하세요.
              </div>
            ) : null}

            {items.length === 0 ? (
              <div className="empty" data-testid="list-empty">
                먹고 있는 약이나 영양제를 추가해 보세요
              </div>
            ) : (
              <>
                <div className="card">
                  <h4 style={{ marginBottom: 12 }}>약</h4>
                  <ItemTable items={drugs} label="약" />
                </div>
                <div className="card">
                  <h4 style={{ marginBottom: 12 }}>영양제</h4>
                  <ItemTable items={sups} label="영양제" />
                </div>
              </>
            )}
            <p className="faint">
              {inUse ? '사용 중: 새로 등록할 때마다 자동으로 점검해요.' : "다 넣은 뒤 '검진하기'에서 한 번 점검하면, 그 뒤로는 등록할 때마다 자동으로 점검해요."}
            </p>
            <div style={{ textAlign: 'center' }}>
              <Link className="btn btn-primary btn-lg" href="/check" data-testid="list-analyze">
                검진하기
              </Link>
            </div>
          </section>
        </div>
      </div>
      {confirmItem ? (
        <div className="overlay">
          {/* Esc·바깥 누르기는 '취소'와 같다. 초점은 지우지 않는 '취소'에 먼저 둔다. */}
          <DismissTo href="/list" />
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="delete-title" data-testid="modal">
            <h3 id="delete-title">삭제할까요?</h3>
            <p className="muted">
              <strong>{confirmItem.name}</strong>{josa(confirmItem.name, '을/를')} 목록에서 지워요. 검진 리포트에서도 사라져요.
            </p>
            <div className="actions">
              <GetButton action="/list" params={{}} className="btn">
                취소
              </GetButton>
              <form action={removeItemAction} style={{ display: 'contents' }}>
                <input type="hidden" name="id" value={confirmItem.id} />
                <button type="submit" className="btn btn-black" data-testid="confirm-delete">
                  삭제
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

function ItemTable({ items, label }: { items: UserItem[]; label: string }) {
  if (items.length === 0)
    return (
      <p className="faint" style={{ padding: '8px 0' }}>
        아직 없어요.
      </p>
    )
  return (
    <table className="tbl" aria-label={`복용 목록 ${label}`}>
      <thead>
        <tr>
          <th>이름</th>
          <th>하루 복용량</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} data-testid="list-row" data-name={item.name}>
            <td>
              <span className="name">{item.name}</span>
              <br />
              <span className="faint">{item.label !== item.name ? item.label : item.sub}</span>
            </td>
            <td>{doseText(item)}</td>
            <td style={{ textAlign: 'right' }}>
              <GetButton action="/list" params={{ confirm: String(item.id) }} className="btn btn-sm" data-testid="row-delete">
                삭제
              </GetButton>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
