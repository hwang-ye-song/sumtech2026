'use client'

import { useEffect, useState } from 'react'
import type { CatalogHit } from '@/lib/catalog'
import { addItemAction } from '@/app/actions/items'

type Status = 'idle' | 'loading' | 'done' | 'error'

export function SearchAdd({ initialQuery = '' }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery)
  const [hits, setHits] = useState<CatalogHit[]>([])
  const [status, setStatus] = useState<Status>('idle')

  useEffect(() => {
    const q = query.trim()
    if (!q) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setStatus('loading')
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        if (!res.ok) throw new Error(String(res.status))
        const data = (await res.json()) as { hits: CatalogHit[] }
        setHits(data.hits)
        setStatus('done')
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setStatus('error')
      }
    }, 200)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  return (
    <div className="flex flex-col gap-4">
      <input
        type="search"
        aria-label="검색창"
        placeholder="약 이름이나 성분을 입력하세요 (예: 비맥스, 칼슘, 레보티록신)"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          if (!e.target.value.trim()) {
            setHits([])
            setStatus('idle')
          }
        }}
        autoFocus
        autoComplete="off"
        className="w-full rounded-xl border border-line bg-white px-4 py-3 text-base focus:border-brand focus:outline-none"
      />

      {status === 'loading' ? <p className="text-sm text-muted">찾는 중…</p> : null}
      {status === 'error' ? (
        <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-danger">
          검색에 실패했어요. 다시 입력해 주세요.
        </p>
      ) : null}

      {status === 'done' && hits.length === 0 ? (
        <div className="rounded-2xl border border-line bg-card p-5">
          <p className="font-semibold">찾는 제품이 없어요</p>
          <p className="mt-1 text-sm text-muted">
            일반의약품은 제품 이름 일부(예: 비맥스), 처방약은 성분 이름(예: 레보티록신), 영양제는 성분 이름(예: 칼슘, 철분, 오메가3)으로 찾아보세요.
          </p>
        </div>
      ) : null}

      {hits.length > 0 ? (
        <ul aria-label="검색 결과" className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
          {hits.map((hit) => (
            <li key={`${hit.type}:${hit.ref}`} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-semibold">{hit.name}</p>
                <p className="text-sm text-muted">{hit.sub}</p>
              </div>
              <form action={addItemAction}>
                <input type="hidden" name="item" value={`${hit.type}:${hit.ref}`} />
                <button
                  type="submit"
                  aria-label={`${hit.name} 추가`}
                  className="rounded-lg bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-strong"
                >
                  추가
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
