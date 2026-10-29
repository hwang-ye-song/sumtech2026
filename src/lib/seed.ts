// 앱이 처음 뜰 때 스키마를 만들고 data/ 시드 파일을 DB에 넣는다(F5).
// - 기준 데이터(drug·drug_ingredient·substance·interaction_rule): 파일 내용이 바뀌었을 때만 통째로 다시 넣는다.
// - 시드 계정: E2E용 `복용자` 계정(compose의 SEED_USER_EMAIL·SEED_USER_PASSWORD)과
//   시연 계정(data/seed/personas.json, 비밀번호는 SEED_PERSONA_PASSWORD).
// 시드 파일이 아직 없으면 그 부분은 건너뛰고 경고만 남긴다(앱은 뜬다).
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { getDb, type Db } from './db'
import { SCHEMA_SQL } from './schema'
import { hashPassword } from './password'

const DATA_DIR = path.join(process.cwd(), 'data')
// docs/scenarios.yaml 머리말: 복용자 계정 목록에는 레보티록신(하루 1정)과 칼슘(하루 1000mg)이 있고 첫 검진을 마친 상태다.
const TAKER_ITEMS: RefSeed[] = [
  { type: 'substance', ref: 'levothyroxine', daily_count: 1 },
  { type: 'substance', ref: 'calcium', daily_count: 1, unit_amount: 1000, unit: 'mg' },
]

interface OtcItem {
  item_seq: string
  item_name: string
  company?: string | null
  category?: string | null
  efficacy?: string | null
  usage?: string | null
  warning?: string | null
  precautions?: string | null
  interactions?: string | null
  side_effects?: string | null
  storage?: string | null
  source?: string | null
  source_url: string
  ingredients?: { ingredient: string; nutrient: string | null }[]
}

interface SubstanceSeed {
  id: string
  name: string
  aliases?: string[]
  kind: string
  is_vitamin?: boolean
  recommendable?: boolean
  function_claim?: string | null
  function_source_title?: string | null
  function_source_url?: string | null
  nutrient_keys?: string[]
  summary?: string | null
  display_name?: string | null
  upper_limit?: unknown
}

interface RefSeed {
  type: 'drug' | 'substance'
  ref: string
  daily_count?: number
  unit_amount?: number
  unit?: string
}

interface RuleSeed {
  id: string
  a: RefSeed
  b: RefSeed
  relation: string
  effect?: string | null
  quote: string
  quote_ko?: string | null
  action: string
  pharmacist_question: string
  source_id: string
  source_title: string
  source_url: string
  source_kind: string
  source_note?: string | null
  more_sources?: unknown[]
  verification?: { checked_on?: string }
}

interface PersonaSeed {
  id: string
  display_name: string
  email: string
  profile?: string
  items: RefSeed[]
  first_check_done: boolean
}

async function readJson<T>(rel: string): Promise<{ data: T; raw: string } | null> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, rel), 'utf8')
    return { data: JSON.parse(raw.replace(/^﻿/, '')) as T, raw }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      console.warn(`[seed] ${rel} 파일이 없어 건너뜁니다.`)
      return null
    }
    throw new Error(`[seed] ${rel} 읽기 실패: ${err instanceof Error ? err.message : String(err)}`)
  }
}

async function getMeta(db: Db, key: string): Promise<string | null> {
  const rows = await db.query<{ value: string }>('SELECT value FROM seed_meta WHERE key = $1', [key])
  return rows[0]?.value ?? null
}

async function setMeta(db: Db, key: string, value: string): Promise<void> {
  await db.query(
    `INSERT INTO seed_meta (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [key, value],
  )
}

async function loadCatalog(db: Db, otc: OtcItem[], substances: SubstanceSeed[], rules: RuleSeed[]): Promise<void> {
  await db.query('DELETE FROM interaction_rule')
  await db.query('DELETE FROM drug_ingredient')
  await db.query('DELETE FROM drug')
  await db.query('DELETE FROM substance')

  for (const d of otc) {
    await db.query(
      `INSERT INTO drug (item_seq, item_name, company, category, efficacy, usage, warning, precautions, interactions, side_effects, storage, source, source_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        d.item_seq,
        d.item_name,
        d.company ?? null,
        d.category ?? null,
        d.efficacy ?? null,
        d.usage ?? null,
        d.warning ?? null,
        d.precautions ?? null,
        d.interactions ?? null,
        d.side_effects ?? null,
        d.storage ?? null,
        d.source ?? null,
        d.source_url,
      ],
    )
    for (const ing of d.ingredients ?? []) {
      await db.query(
        `INSERT INTO drug_ingredient (item_seq, ingredient, nutrient) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [d.item_seq, ing.ingredient, ing.nutrient ?? null],
      )
    }
  }

  for (const s of substances) {
    await db.query(
      `INSERT INTO substance (id, name, aliases, kind, is_vitamin, recommendable, function_claim, function_source_title, function_source_url, nutrient_keys, summary, display_name, upper_limit)
       VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13::jsonb)`,
      [
        s.id,
        s.name,
        JSON.stringify(s.aliases ?? []),
        s.kind,
        Boolean(s.is_vitamin),
        Boolean(s.recommendable),
        s.function_claim ?? null,
        s.function_source_title ?? null,
        s.function_source_url ?? null,
        JSON.stringify(s.nutrient_keys ?? []),
        s.summary ?? null,
        s.display_name ?? null,
        s.upper_limit ? JSON.stringify(s.upper_limit) : null,
      ],
    )
  }

  const drugIds = new Set(otc.map((d) => d.item_seq))
  const subIds = new Set(substances.map((s) => s.id))
  const resolves = (r: RefSeed) => (r.type === 'drug' ? drugIds.has(r.ref) : r.type === 'substance' ? subIds.has(r.ref) : false)
  let skipped = 0
  for (const r of rules) {
    if (!resolves(r.a) || !resolves(r.b)) {
      skipped += 1
      console.warn(`[seed] 규칙 ${r.id}: 참조를 찾지 못해 건너뜁니다 (${r.a.type}:${r.a.ref} × ${r.b.type}:${r.b.ref})`)
      continue
    }
    await db.query(
      `INSERT INTO interaction_rule (id, a_type, a_ref, b_type, b_ref, relation, effect, quote, quote_ko, action, pharmacist_question, source_id, source_title, source_url, source_kind, source_note, more_sources, checked_on)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17::jsonb, $18)
       ON CONFLICT (id) DO NOTHING`,
      [
        r.id,
        r.a.type,
        r.a.ref,
        r.b.type,
        r.b.ref,
        r.relation,
        r.effect ?? null,
        r.quote,
        r.quote_ko ?? null,
        r.action,
        r.pharmacist_question,
        r.source_id,
        r.source_title,
        r.source_url,
        r.source_kind,
        r.source_note ?? null,
        JSON.stringify(r.more_sources ?? []),
        r.verification?.checked_on ?? null,
      ],
    )
  }
  console.log(`[seed] 기준 데이터: 약 ${otc.length}개, 성분 ${substances.length}개, 규칙 ${rules.length - skipped}개${skipped ? ` (건너뜀 ${skipped})` : ''}`)
}

async function ensureUser(
  db: Db,
  input: { email: string; password: string; display_name: string; role: string; first_check_done: boolean },
): Promise<number> {
  const existing = await db.query<{ id: number }>('SELECT id FROM app_user WHERE email = $1', [input.email])
  if (existing[0]) return existing[0].id
  const hash = await hashPassword(input.password)
  const rows = await db.query<{ id: number }>(
    `INSERT INTO app_user (email, password_hash, display_name, role, first_checked_at)
     VALUES ($1, $2, $3, $4, CASE WHEN $5 THEN now() ELSE NULL END) RETURNING id`,
    [input.email, hash, input.display_name, input.role, input.first_check_done],
  )
  return rows[0].id
}

async function ensureItems(db: Db, userId: number, items: RefSeed[], drugIds: Set<string>, subIds: Set<string>): Promise<void> {
  for (const it of items) {
    const ok = it.type === 'drug' ? drugIds.has(it.ref) : it.type === 'substance' ? subIds.has(it.ref) : false
    if (!ok) {
      console.warn(`[seed] 시드 계정 항목 ${it.type}:${it.ref} 을(를) 찾지 못해 건너뜁니다.`)
      continue
    }
    await db.query(
      `INSERT INTO user_item (user_id, item_type, item_ref, daily_count, unit_amount, unit) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, item_type, item_ref) DO NOTHING`,
      [userId, it.type, it.ref, it.daily_count ?? 1, it.unit_amount ?? null, it.unit_amount ? (it.unit ?? 'mg') : null],
    )
  }
}

export async function ensureSchemaAndSeed(): Promise<void> {
  const started = Date.now()
  const db = await getDb()
  await db.exec(SCHEMA_SQL)

  const core = (await readJson<OtcItem[]>('drugs/otc_core.json')) ?? { data: [], raw: '' }
  // 58개 목록 밖이지만 흐름에 필요한 일반의약품(예: S7의 훼로바-유서방정)
  const extra = (await readJson<OtcItem[]>('seed/extra_drugs.json')) ?? { data: [], raw: '' }
  const otc = { data: [...core.data, ...extra.data], raw: core.raw + extra.raw }
  const subs = (await readJson<SubstanceSeed[]>('seed/substances.json')) ?? { data: [], raw: '' }
  const rules = (await readJson<RuleSeed[]>('seed/interaction_rules.json')) ?? { data: [], raw: '' }
  const personas = (await readJson<PersonaSeed[]>('seed/personas.json')) ?? { data: [], raw: '' }

  const hash = createHash('sha256').update(otc.raw).update(subs.raw).update(rules.raw).update(SCHEMA_SQL).digest('hex')
  if ((await getMeta(db, 'catalog_hash')) !== hash) {
    await loadCatalog(db, otc.data, subs.data, rules.data)
    await setMeta(db, 'catalog_hash', hash)
  } else {
    console.log('[seed] 기준 데이터가 이미 최신이라 건너뜁니다.')
  }

  const drugIds = new Set(otc.data.map((d) => d.item_seq))
  const subIds = new Set(subs.data.map((s) => s.id))

  const demoEmail = process.env.SEED_USER_EMAIL
  const demoPassword = process.env.SEED_USER_PASSWORD
  if (demoEmail && demoPassword) {
    const id = await ensureUser(db, { email: demoEmail, password: demoPassword, display_name: '복용자', role: '복용자', first_check_done: true })
    await ensureItems(db, id, TAKER_ITEMS, drugIds, subIds)
  } else {
    console.warn('[seed] SEED_USER_EMAIL·SEED_USER_PASSWORD가 없어 복용자 계정을 만들지 않습니다.')
  }

  const personaPassword = process.env.SEED_PERSONA_PASSWORD
  if (personaPassword && personas.data.length > 0) {
    for (const p of personas.data) {
      const id = await ensureUser(db, {
        email: p.email,
        password: personaPassword,
        display_name: p.display_name,
        role: '복용자',
        first_check_done: Boolean(p.first_check_done),
      })
      await ensureItems(db, id, p.items ?? [], drugIds, subIds)
    }
    console.log(`[seed] 페르소나 계정 ${personas.data.length}개 준비`)
  }

  console.log(`[seed] 완료 (${Date.now() - started}ms, ${db.kind})`)
}
