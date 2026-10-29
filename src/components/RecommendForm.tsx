'use client'

import { useActionState } from 'react'
import { requestRecommendation, type RecommendState } from '@/app/actions/recommend'
import { SAFE_MESSAGE } from '@/lib/labels'

const GOALS = ['피로', '눈', '뼈', '피부', '면역', '기타']
const PILLS = ['1알', '2~3알', '상관없어요']

export function RecommendForm() {
  const [state, formAction, pending] = useActionState<RecommendState, FormData>(requestRecommendation, {})

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-6">
        <fieldset className="rounded-2xl border border-line bg-card p-5">
          <legend className="px-1 font-semibold">좋아지고 싶은 부분</legend>
          <p className="mb-3 text-sm text-muted">여러 개 골라도 돼요.</p>
          <div className="flex flex-wrap gap-2">
            {GOALS.map((g) => (
              <label key={g} className="flex cursor-pointer items-center gap-2 rounded-xl border border-line px-3 py-2 has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
                <input type="checkbox" name="goal" value={g} defaultChecked={state.survey?.goals.includes(g)} className="h-5 w-5 accent-brand" />
                <span>{g}</span>
              </label>
            ))}
          </div>
          <label className="mt-3 flex flex-col gap-1">
            <span className="text-sm font-medium">기타 내용</span>
            <input
              name="other"
              type="text"
              maxLength={200}
              defaultValue={state.survey?.other}
              placeholder="예: 오후에 쉽게 지쳐요"
              className="rounded-xl border border-line bg-white px-4 py-3 text-base focus:border-brand focus:outline-none"
            />
          </label>
        </fieldset>

        <fieldset className="rounded-2xl border border-line bg-card p-5">
          <legend className="px-1 font-semibold">하루에 몇 알까지</legend>
          <p className="mb-3 text-sm text-muted">추천 개수를 정하는 데만 써요.</p>
          <div className="flex flex-wrap gap-2">
            {PILLS.map((p) => (
              <label key={p} className="flex cursor-pointer items-center gap-2 rounded-xl border border-line px-3 py-2 has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
                <input type="radio" name="pills" value={p} defaultChecked={(state.survey?.pills ?? '상관없어요') === p} className="h-5 w-5 accent-brand" />
                <span>{p}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1">
          <span className="font-semibold">더 알려 주고 싶은 점 (선택)</span>
          <textarea
            name="note"
            rows={3}
            maxLength={300}
            defaultValue={state.survey?.note}
            placeholder="예: 커피를 많이 마셔요"
            className="rounded-xl border border-line bg-white px-4 py-3 text-base focus:border-brand focus:outline-none"
          />
        </label>

        <p className="text-xs text-muted">나이·질환·임신 같은 개인 건강 정보는 묻지 않아요. 추천은 제품이 아니라 비타민·영양 성분 종류이고, 판매 정보는 없어요.</p>

        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-brand px-5 py-3 text-lg font-semibold text-white hover:bg-brand-strong disabled:opacity-60"
        >
          {pending ? 'AI가 분석하고 있어요…' : '추천받기'}
        </button>
      </form>

      {state.error ? (
        <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-danger">
          {state.error}
        </p>
      ) : null}

      {state.result ? (
        <section aria-live="polite" className="flex flex-col gap-4">
          <h2 className="text-xl font-bold">추천 결과</h2>
          {state.result.length === 0 ? (
            <p className="rounded-2xl border border-line bg-card p-5 text-muted">설문에 맞는 후보를 찾지 못했어요. 선택을 바꿔 다시 시도해 보세요.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {state.result.map((r) => (
                <li key={r.id} data-testid="recommendation" className="rounded-2xl border border-brand/30 bg-card p-5">
                  <h3 className="text-lg font-bold">{r.name}</h3>
                  <p className="mt-1 text-muted">{r.why}</p>
                  <p className="mt-3">
                    <span className="font-semibold">어디에 좋은지 (식약처 기능성 내용):</span> {r.function_claim}
                  </p>
                  <a href={r.function_source_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm font-medium text-brand-strong underline">
                    식약처 출처 보기 ↗
                  </a>
                  <p className="mt-3 rounded-xl bg-ok-soft px-3 py-2 text-sm font-semibold text-ok">{SAFE_MESSAGE}</p>
                </li>
              ))}
            </ul>
          )}
          {state.excluded && state.excluded.length > 0 ? (
            <details className="rounded-2xl border border-line bg-card p-4 text-sm">
              <summary className="cursor-pointer font-medium">추천에서 뺀 성분 {state.excluded.length}개</summary>
              <ul className="mt-2 list-disc pl-5 text-muted">
                {state.excluded.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
