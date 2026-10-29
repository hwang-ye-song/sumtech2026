'use client'

import { useState } from 'react'
import type { CatalogHit } from '@/lib/catalog'
import { KindBadge, RegisterPanel, type Pick } from '@/components/RegisterPanel'

/** 검색 결과(또는 사진 후보)에서 하나를 고르면 그 자리에 등록 칸(하루 개수·한 알 함량·등록)을 연다. */
export function SearchRegister({ hits, testId = 'results' }: { hits: CatalogHit[]; testId?: string }) {
  const [pick, setPick] = useState<Pick | null>(null)
  if (pick) return <RegisterPanel key={pick.key} pick={pick} onUnselect={() => setPick(null)} />
  return (
    <div className="results" aria-label="검색 결과" data-testid={testId}>
      {hits.map((hit) => (
        <button
          key={`${hit.type}:${hit.ref}`}
          type="button"
          className="result"
          aria-label={hit.name}
          data-testid="result"
          onClick={() => setPick({ key: `${hit.type}:${hit.ref}`, name: hit.name, sub: hit.sub, nutrient: hit.sub === '영양제 성분' })}
        >
          <span>
            <span className="n">{hit.name}</span> <KindBadge sub={hit.sub} />
            <br />
            <span className="s">{hit.sub}</span>
          </span>
          <span className="faint">고르기</span>
        </button>
      ))}
    </div>
  )
}
