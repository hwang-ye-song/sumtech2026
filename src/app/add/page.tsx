import { redirect } from 'next/navigation'

// 예전 주소. 검색 등록은 복용 목록 화면 왼쪽 패널로 합쳤다.
export default async function AddPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { q } = await searchParams
  redirect(typeof q === 'string' && q ? `/list?q=${encodeURIComponent(q)}` : '/list')
}
