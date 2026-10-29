// GET /__health — 대시보드와 주최 측 실행이 앱이 떴는지 보는 경로.
// 스키마·시드가 끝나기 전에는 503, 끝나면 200과 배포 commit(releaseId)을 준다. 캐시하지 않는다.
import { readyState, startApp } from '@/lib/ready'

export const dynamic = 'force-dynamic'

export async function GET() {
  startApp().catch(() => {})
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
