import { redirect } from 'next/navigation'

// 예전 주소. 복용 목록은 검진하기 화면으로 합쳤다. 붙어 온 검색어·결과 표시는 그대로 넘긴다.
export default async function ListPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(await searchParams)) if (typeof v === 'string') params.set(k, v)
  const qs = params.toString()
  redirect(qs ? `/check?${qs}` : '/check')
}
