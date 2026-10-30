'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getDb } from '@/lib/db'
import { ensureReady } from '@/lib/ready'
import { hashPassword, verifyPassword } from '@/lib/password'
import { createSession, destroySession, getCurrentUser } from '@/lib/session'
import { createPersonaSession, isReservedEmail, resetPersonaAccount } from '@/lib/personas'
import { safeNext } from '@/lib/next-path'

export interface AuthState {
  error?: string
  /** 오류가 나도 다시 치지 않게 돌려주는 입력값(비밀번호는 돌려주지 않는다) */
  email?: string
  consent?: boolean
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** 로그인 전에 누른 메뉴(?next=)로 돌려보낸다. 없으면 마이페이지로 간다. 앱 안의 정해진 화면만 받는다. */
function nextPath(formData: FormData): string {
  return safeNext(formData.get('next')) ?? '/mypage'
}

function readCredentials(formData: FormData) {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const password = String(formData.get('password') ?? '')
  const passwordConfirm = String(formData.get('password_confirm') ?? '')
  return { email, password, passwordConfirm }
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password, passwordConfirm } = readCredentials(formData)
  const consent = formData.get('health_consent') === 'on'
  const fail = (error: string): AuthState => ({ error, email, consent })
  if (!EMAIL_RE.test(email)) return fail('이메일 형식을 확인해 주세요.')
  if (password.length < 8) return fail('비밀번호는 8자 이상이어야 해요.')
  if (password !== passwordConfirm) return fail('비밀번호 확인이 비밀번호와 달라요.')
  // 건강 정보(복용 목록·약 봉투 사진)는 따로 분명하게 동의를 받는다. 가입할 때 한 번 받고 사진을 올릴 때마다 묻지 않는다.
  if (!consent) return fail('건강 정보 수집·이용과 사진 AI 판독에 동의해야 가입할 수 있어요.')
  // 시연 계정 이메일(저장된 페르소나 계정·임시 시연 계정 도메인)은 가입으로 가져갈 수 없다.
  if (await isReservedEmail(email)) return fail('이미 가입한 이메일이에요')

  await ensureReady()
  const db = await getDb()
  const exists = await db.query('SELECT 1 FROM app_user WHERE email = $1', [email])
  if (exists.length > 0) return fail('이미 가입한 이메일이에요')

  const hash = await hashPassword(password)
  const rows = await db.query<{ id: number }>(
    'INSERT INTO app_user (email, password_hash, health_consent_at) VALUES ($1, $2, now()) RETURNING id',
    [email, hash],
  )
  await createSession(rows[0].id)
  // 로그인 상태가 바뀌었으니, 로그인 전에 들렀던 화면들의 캐시(로그인으로 튕기는 결과가 그대로 남아 있을 수 있다)를 지운다.
  revalidatePath('/', 'layout')
  // 처음 가입한 사람은 목록이 비어 있으니, 홈 대신 바로 약·영양제 등록 화면으로 보낸다(로그인 전에 고른 화면이 있으면 그곳으로).
  redirect(safeNext(formData.get('next')) ?? '/list?welcome=1')
}

export async function logIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData)
  if (!email || !password) return { error: '이메일과 비밀번호를 입력해 주세요.', email }

  await ensureReady()
  const db = await getDb()
  const rows = await db.query<{ id: number; password_hash: string }>(
    'SELECT id, password_hash FROM app_user WHERE email = $1',
    [email],
  )
  const user = rows[0]
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return { error: '이메일 또는 비밀번호가 맞지 않아요', email }
  }
  await createSession(user.id)
  // 로그인 상태가 바뀌었으니, 로그인 전에 들렀던 화면들의 캐시(로그인으로 튕기는 결과가 그대로 남아 있을 수 있다)를 지운다.
  revalidatePath('/', 'layout')
  redirect(nextPath(formData))
}

/** 로그인 화면의 페르소나 버튼: 그 페르소나의 시작 상태가 담긴 새 시연 계정을 만들어 들어간다. */
export async function enterPersona(formData: FormData): Promise<void> {
  await ensureReady()
  const userId = await createPersonaSession(String(formData.get('persona') ?? ''))
  if (userId === null) redirect('/login')
  await createSession(userId)
  // 로그인 상태가 바뀌었으니, 로그인 전에 들렀던 화면들의 캐시(로그인으로 튕기는 결과가 그대로 남아 있을 수 있다)를 지운다.
  revalidatePath('/', 'layout')
  redirect(nextPath(formData))
}

/** 마이페이지의 '처음 상태로 되돌리기': 지금 들어와 있는 페르소나 계정만 시작 상태로 되돌린다. */
export async function resetMyPersona(): Promise<void> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  await resetPersonaAccount(user.id, user.email)
  redirect('/mypage')
}

export async function logOut(): Promise<void> {
  await destroySession()
  // 로그인 상태가 바뀌었으니, 로그인 중에 들렀던 화면들의 캐시를 지운다.
  revalidatePath('/', 'layout')
  redirect('/')
}
