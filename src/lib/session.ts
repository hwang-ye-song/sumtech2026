// 로그인 세션: 서명한 토큰(JWT)을 httpOnly 쿠키에 둔다. 서버에서만 읽고 쓴다.
import { randomBytes } from 'node:crypto'
import { cookies, headers } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { getDb } from './db'
import { ensureReady } from './ready'

const COOKIE = 'session'
const MAX_AGE_SEC = 60 * 60 * 24 * 30

declare global {
  var __neulSessionSecret: Uint8Array | undefined
}

function secret(): Uint8Array {
  const fromEnv = process.env.SESSION_SECRET
  if (fromEnv && fromEnv.length >= 16) return new TextEncoder().encode(fromEnv)
  // 환경변수가 없으면 프로세스마다 임의 값(서버를 다시 켜면 로그인이 풀린다). 로컬 개발용.
  if (!globalThis.__neulSessionSecret) globalThis.__neulSessionSecret = new Uint8Array(randomBytes(32))
  return globalThis.__neulSessionSecret
}

async function isHttps(): Promise<boolean> {
  const h = await headers()
  const proto = h.get('x-forwarded-proto')
  if (proto) return proto.split(',')[0].trim() === 'https'
  return false
}

export async function createSession(userId: number): Promise<void> {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SEC}s`)
    .sign(secret())
  const store = await cookies()
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: await isHttps(),
    maxAge: MAX_AGE_SEC,
  })
}

export async function destroySession(): Promise<void> {
  const store = await cookies()
  store.delete(COOKIE)
}

export interface CurrentUser {
  id: number
  email: string
  display_name: string | null
  role: string
  first_checked_at: Date | null
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies()
  const token = store.get(COOKIE)?.value
  if (!token) return null
  let userId: number
  try {
    const { payload } = await jwtVerify(token, secret())
    userId = Number(payload.sub)
    if (!Number.isInteger(userId)) return null
  } catch {
    return null
  }
  await ensureReady()
  const db = await getDb()
  const rows = await db.query<CurrentUser>(
    'SELECT id, email, display_name, role, first_checked_at FROM app_user WHERE id = $1',
    [userId],
  )
  return rows[0] ?? null
}
