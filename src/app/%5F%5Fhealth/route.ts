// GET /__health — 대시보드와 주최 측 실행이 앱이 떴는지 보는 경로.
// 스키마·시드가 끝나기 전에는 503, 끝나면 200과 배포 commit(releaseId)을 준다. 캐시하지 않는다.
import { readyState, startApp } from '@/lib/ready'

export const dynamic = 'force-dynamic'

// 대시보드는 5초 안에 답을 받아야 UP으로 본다. 그 안에서 준비가 끝나길 기다린다.
// Vercel처럼 주소마다 새 서버가 뜨는 곳에서는 이 서버가 방금 떠서 준비 중일 수 있다(DB는 이미 채워져 있어 금방 끝난다).
const WAIT_MS = 4000

export async function GET() {
  await Promise.race([startApp().catch(() => {}), new Promise((resolve) => setTimeout(resolve, WAIT_MS))])
  const { state, error } = readyState()
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  if (state === 'ready') {
    // docker·CI는 RELEASE_ID를, Vercel은 VERCEL_GIT_COMMIT_SHA를 준다.
    const releaseId = process.env.RELEASE_ID || process.env.VERCEL_GIT_COMMIT_SHA || 'dev'
    return new Response(JSON.stringify({ releaseId }), { status: 200, headers })
  }
  if (state === 'failed') {
    return new Response(JSON.stringify({ status: 'failed', error }), { status: 503, headers })
  }
  return new Response(JSON.stringify({ status: 'starting' }), { status: 503, headers })
}
