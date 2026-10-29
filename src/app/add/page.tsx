import { redirect } from 'next/navigation'

// 예전 주소. 검색 등록은 검진하기 화면 등록 패널로 합쳤다.
export default async function AddPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { q } = await searchParams
  redirect(typeof q === 'string' && q ? `/check?q=${encodeURIComponent(q)}` : '/check')
}
