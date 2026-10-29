import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { ensureReady } from '@/lib/ready'
import { searchCatalog } from '@/lib/catalog'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  await ensureReady()
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const q = new URL(request.url).searchParams.get('q') ?? ''
  if (q.trim().length === 0) return NextResponse.json({ hits: [] })
  const hits = await searchCatalog(q.slice(0, 50))
  return NextResponse.json({ hits }, { headers: { 'Cache-Control': 'no-store' } })
}
