// 가상 페르소나 시연(data/seed/personas.json).
// - 저장된 페르소나 계정(personas.json의 이메일)은 서버 시작 때 seed.ts가 만들고, 이메일·비밀번호(SEED_PERSONA_PASSWORD)로 로그인할 수 있다.
// - 로그인 화면의 페르소나 버튼은 그 계정을 쓰지 않고, 누를 때마다 같은 시작 상태의 임시 시연 계정을 새로 만든다.
//   여러 사람이 같은 페르소나를 동시에 써도 목록이 섞이지 않고, 저장된 계정도 그대로 남는다. 임시 계정은 하루 뒤 지운다.
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { getDb } from './db'
import { hashPassword } from './password'
import { itemExists, type ItemType } from './catalog'

export interface PersonaItem {
  type: ItemType
  ref: string
  daily_count?: number
  unit_amount?: number | null
  unit?: string | null
}

export interface Persona {
  id: string
  display_name: string
  email: string
  profile: string
  items: PersonaItem[]
  first_check_done: boolean
}

const FILE = path.join(process.cwd(), 'data', 'seed', 'personas.json')
/** 임시 시연 계정 이메일: '<페르소나 id 소문자>-<임의 값>@persona.example'(.example은 실제로 쓰이지 않는 예약 도메인) */
const TEMP_DOMAIN = '@persona.example'
const TEMP_EMAIL_RE = /^([a-z0-9]+)-[a-z0-9]+@persona\.example$/
const TEMP_TTL = "interval '1 day'"

async function readPersonas(): Promise<Persona[]> {
  try {
    const raw = await fs.readFile(FILE, 'utf8')
    const data = JSON.parse(raw.replace(/^﻿/, '')) as Persona[]
    // 이메일 비교는 소문자로 한다(가입·로그인이 소문자로 맞추므로).
    return data.map((p) => ({ ...p, email: p.email.toLowerCase(), items: p.items ?? [] }))
  } catch (err) {
    console.warn('[personas] personas.json을 읽지 못했어요:', err instanceof Error ? err.message : err)
    return []
  }
}

// 개발 중에는 파일을 고치면 바로 보이게 매번 읽고, 배포에서는 한 번만 읽는다.
let cached: Promise<Persona[]> | null = null
export function listPersonas(): Promise<Persona[]> {
  if (process.env.NODE_ENV !== 'production') return readPersonas()
  return (cached ??= readPersonas())
}

/** 이메일이 저장된 페르소나 계정이거나 임시 시연 계정이면 그 페르소나를 돌려준다. */
export async function personaByEmail(email: string): Promise<Persona | null> {
  const e = email.trim().toLowerCase()
  const all = await listPersonas()
  const temp = e.match(TEMP_EMAIL_RE)
  if (temp) return all.find((p) => p.id.toLowerCase() === temp[1]) ?? null
  return all.find((p) => p.email === e) ?? null
}

/** 회원가입으로 가져갈 수 없는 이메일(저장된 페르소나 계정, 임시 시연 계정 도메인) */
export async function isReservedEmail(email: string): Promise<boolean> {
  const e = email.trim().toLowerCase()
  return e.endsWith(TEMP_DOMAIN) || (await personaByEmail(e)) !== null
}

/** 계정의 목록·첫 검진 여부·표시 이름을 페르소나 시작 상태로 맞춘다. */
async function applySeed(userId: number, p: Persona): Promise<void> {
  const db = await getDb()
  await db.query(`UPDATE app_user SET display_name = $2, first_checked_at = CASE WHEN $3 THEN now() ELSE NULL END WHERE id = $1`, [
    userId,
    p.display_name,
    Boolean(p.first_check_done),
  ])
  await db.query('DELETE FROM user_item WHERE user_id = $1', [userId])
  for (const it of p.items) {
    if (!(await itemExists(it))) {
      console.warn(`[personas] ${p.id}의 항목 ${it.type}:${it.ref}을(를) 찾지 못해 건너뜁니다.`)
      continue
    }
    await db.query(
      `INSERT INTO user_item (user_id, item_type, item_ref, daily_count, unit_amount, unit) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, item_type, item_ref) DO NOTHING`,
      [userId, it.type, it.ref, it.daily_count ?? 1, it.unit_amount ?? null, it.unit_amount ? (it.unit ?? 'mg') : null],
    )
  }
}

/** 페르소나 버튼: 시작 상태가 담긴 임시 시연 계정을 새로 만들고 id를 돌려준다(없는 페르소나면 null). */
export async function createPersonaSession(id: string): Promise<number | null> {
  const p = (await listPersonas()).find((x) => x.id === id)
  if (!p) return null
  const db = await getDb()
  // 하루 지난 임시 계정은 정리한다(목록·추천 기록은 ON DELETE CASCADE로 같이 지워진다).
  await db.query(`DELETE FROM app_user WHERE email LIKE $1 AND created_at < now() - ${TEMP_TTL}`, [`%${TEMP_DOMAIN}`])

  // 비밀번호는 아무도 모르는 값이라 이 버튼으로만 들어갈 수 있다.
  const email = `${p.id.toLowerCase()}-${randomBytes(6).toString('hex')}${TEMP_DOMAIN}`
  const hash = await hashPassword(randomBytes(24).toString('hex'))
  const rows = await db.query<{ id: number }>(
    `INSERT INTO app_user (email, password_hash, display_name, role) VALUES ($1, $2, $3, '복용자') RETURNING id`,
    [email, hash, p.display_name],
  )
  await applySeed(rows[0].id, p)
  return rows[0].id
}

/** 홈의 '처음 상태로 되돌리기': 지금 계정이 페르소나 계정일 때만 시작 상태로 되돌린다. */
export async function resetPersonaAccount(userId: number, email: string): Promise<boolean> {
  const p = await personaByEmail(email)
  if (!p) return false
  await applySeed(userId, p)
  return true
}
