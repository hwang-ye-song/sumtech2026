'use server'

import { redirect } from 'next/navigation'
import { getDb } from '@/lib/db'
import { ensureReady } from '@/lib/ready'
import { hashPassword, verifyPassword } from '@/lib/password'
import { createSession, destroySession } from '@/lib/session'

export interface AuthState {
  error?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function readCredentials(formData: FormData) {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const password = String(formData.get('password') ?? '')
  return { email, password }
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData)
  if (!EMAIL_RE.test(email)) return { error: '이메일 형식을 확인해 주세요.' }
  if (password.length < 6) return { error: '비밀번호는 6자 이상이어야 해요.' }

  await ensureReady()
  const db = await getDb()
  const exists = await db.query('SELECT 1 FROM app_user WHERE email = $1', [email])
  if (exists.length > 0) return { error: '이미 가입된 이메일이에요. 로그인해 주세요.' }

  const hash = await hashPassword(password)
  const rows = await db.query<{ id: number }>(
    'INSERT INTO app_user (email, password_hash) VALUES ($1, $2) RETURNING id',
    [email, hash],
  )
  await createSession(rows[0].id)
  redirect('/list')
}

export async function logIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData)
  if (!email || !password) return { error: '이메일과 비밀번호를 입력해 주세요.' }

  await ensureReady()
  const db = await getDb()
  const rows = await db.query<{ id: number; password_hash: string }>(
    'SELECT id, password_hash FROM app_user WHERE email = $1',
    [email],
  )
  const user = rows[0]
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return { error: '이메일 또는 비밀번호가 맞지 않아요.' }
  }
  await createSession(user.id)
  redirect('/list')
}

export async function logOut(): Promise<void> {
  await destroySession()
  redirect('/')
}
