import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/session'
import { ensureReady } from '@/lib/ready'
import { aiConfigured } from '@/lib/ai'
import { doseText, listUserItems, type UserItem } from '@/lib/items'
import { isSupplement, itemKey, parseItemKey, searchCatalog } from '@/lib/catalog'
import { DeleteItemButton } from '@/components/DeleteItemButton'
import { NoRecordCard } from '@/components/NoRecordCard'
import { SearchRegister } from '@/components/SearchRegister'
import { PhotoAdd } from '@/components/PhotoAdd'
import { Toast } from '@/components/Toast'

export const metadata = { title: '복용 목록' }

type Params = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '')

/** 복용 목록: 왼쪽 등록 패널(검색 | 사진), 오른쪽 약·영양제 표. 등록·삭제 결과도 여기서 보여 준다. */
export default async function ListPage({ searchParams }: { searchParams: Promise<Params> }) {
  await ensureReady()
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/list')

  const params = await searchParams
  const mode = one(params.mode) === 'photo' ? 'photo' : 'search'
  const q = one(params.q).trim().slice(0, 50)
  const added = parseItemKey(one(params.added))
  const status = one(params.status)
  const deleted = params.deleted === '1'

  const [items, hits] = await Promise.all([listUserItems(user.id), mode === 'search' && q.length >= 2 ? searchCatalog(q) : Promise.resolve([])])
  const inUse = user.first_checked_at !== null
  const addedItem = added ? items.find((i) => itemKey(i) === itemKey(added)) : undefined
  const drugs = items.filter((i) => !isSupplement(i))
  const sups = items.filter(isSupplement)

  return (
    <main className="page">
      <div className="wrap">
        <div className="page-head">
          <div className="eyebrow">복용 목록</div>
          <h2>
            먹고 있는 약과 영양제를 <b>한자리에</b>
          </h2>
        </div>
        <div className="list-layout">
          <section className="card" aria-label="등록">
            <nav className="seg" aria-label="등록 방법">
              <Link href="/list" aria-current={mode === 'search' ? 'page' : undefined} data-testid="mode-search">
                검색으로 등록
              </Link>
              <Link href="/list?mode=photo" aria-current={mode === 'photo' ? 'page' : undefined} data-testid="mode-photo">
                사진으로 등록
              </Link>
            </nav>
            <div style={{ marginTop: 16 }}>
              {mode === 'photo' ? (
                <PhotoAdd aiReady={aiConfigured()} />
              ) : (
                <>
                  <form action="/list" method="get" role="search">
                    <div className="field">
                      <label htmlFor="q">제품명·성분·흔히 부르는 이름</label>
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
                  {q.length >= 2 && hits.length === 0 ? (
                    <div className="empty" data-testid="search-empty">
                      찾는 제품이 없어요. 성분 이름(예 칼슘)으로 검색해 보세요
                    </div>
                  ) : null}
                  {hits.length > 0 ? <SearchRegister key={q} hits={hits} /> : null}
                </>
              )}
            </div>
          </section>

          <section className="stack" aria-label="내 목록">
            {deleted ? <Toast message="등록된 약·영양제가 목록에서 삭제되었습니다." /> : null}
            {addedItem && status === 'clear' ? <NoRecordCard lead={`'${addedItem.name}'을(를) 목록에 넣었어요.`} /> : null}
            {addedItem && status === 'warned' ? (
              <div className="notice notice-warn" role="status">
                &lsquo;{addedItem.name}&rsquo;을(를) 경고를 확인하고 넣었어요. 복용을 바꾸기 전에 약사·의사와 상담하세요
              </div>
            ) : null}
            {addedItem && status === 'new' ? (
              <div className="notice" role="status">
                &lsquo;{addedItem.name}&rsquo;을(를) 넣었어요. 지금 먹는 것을 다 넣었으면 &lsquo;분석하기&rsquo;에서 한 번에 확인하세요.
              </div>
            ) : null}

            {items.length === 0 ? (
              <div className="empty" data-testid="list-empty">
                먹고 있는 약이나 영양제를 추가해 보세요
              </div>
            ) : (
              <>
                <div className="card">
                  <h4>약</h4>
                  <ItemTable items={drugs} label="약" />
                </div>
                <div className="card">
                  <h4>영양제</h4>
                  <ItemTable items={sups} label="영양제" />
                </div>
              </>
            )}
            <p className="faint">
              {inUse ? '사용 중: 새로 등록할 때마다 자동으로 점검해요.' : "다 넣은 뒤 '분석하기'에서 한 번 점검하면, 그 뒤로는 등록할 때마다 자동으로 점검해요."}
            </p>
            <div>
              <Link className="btn btn-primary btn-lg" href="/check" data-testid="list-analyze">
                분석하기
              </Link>
            </div>
          </section>
        </div>
      </div>
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
              <DeleteItemButton id={item.id} name={item.name} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
