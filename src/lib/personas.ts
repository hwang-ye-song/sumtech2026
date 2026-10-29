// 가상 페르소나 시연 계정(data/seed/personas.json). 로그인 화면에서 골라 들어가고, 들어갈 때마다 시드 상태로 되돌린다.
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { getDb } from './db'
import { hashPassword } from './password'

export interface PersonaItem {
  type: 'drug' | 'substance'
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

export async function listPersonas(): Promise<Persona[]> {
  try {
    const raw = await fs.readFile(FILE, 'utf8')
    return JSON.parse(raw.replace(/^﻿/, '')) as Persona[]
  } catch (err) {
    console.warn('[personas] personas.json을 읽지 못했어요:', err instanceof Error ? err.message : err)
    return []
  }
}

export async function personaByEmail(email: string): Promise<Persona | null> {
  return (await listPersonas()).find((p) => p.email === email) ?? null
}

/**
 * 페르소나 계정을 시드 상태로 맞춘다: 계정이 없으면 만들고, 목록·첫 검진 여부를 personas.json대로 되돌린다.
 * 시연을 여러 번 해도 같은 장면에서 시작한다. 계정 id를 돌려준다(없는 페르소나면 null).
 */
export async function resetPersona(id: string): Promise<number | null> {
  const p = (await listPersonas()).find((x) => x.id === id)
  if (!p) return null
  const db = await getDb()

  const existing = await db.query<{ id: number }>('SELECT id FROM app_user WHERE email = $1', [p.email])
  let userId = existing[0]?.id
  if (userId === undefined) {
    // SEED_PERSONA_PASSWORD가 없으면 아무도 모르는 비밀번호로 만든다(이 화면의 버튼으로만 들어갈 수 있다).
    const hash = await hashPassword(process.env.SEED_PERSONA_PASSWORD || randomBytes(24).toString('hex'))
    const rows = await db.query<{ id: number }>(
      `INSERT INTO app_user (email, password_hash, display_name, role) VALUES ($1, $2, $3, '복용자') RETURNING id`,
      [p.email, hash, p.display_name],
    )
    userId = rows[0].id
  }
  await db.query(
    `UPDATE app_user SET display_name = $2, first_checked_at = CASE WHEN $3 THEN now() ELSE NULL END WHERE id = $1`,
    [userId, p.display_name, Boolean(p.first_check_done)],
  )

  await db.query('DELETE FROM user_item WHERE user_id = $1', [userId])
  for (const it of p.items ?? []) {
    const ok =
      it.type === 'drug'
        ? await db.query('SELECT 1 FROM drug WHERE item_seq = $1', [it.ref])
        : await db.query('SELECT 1 FROM substance WHERE id = $1', [it.ref])
    if (ok.length === 0) {
      console.warn(`[personas] ${p.id}의 항목 ${it.type}:${it.ref}을(를) 찾지 못해 건너뜁니다.`)
      continue
    }
    await db.query(
      `INSERT INTO user_item (user_id, item_type, item_ref, daily_count, unit_amount, unit) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, item_type, item_ref) DO NOTHING`,
      [userId, it.type, it.ref, it.daily_count ?? 1, it.unit_amount ?? null, it.unit_amount ? (it.unit ?? 'mg') : null],
    )
  }
  return userId
}
