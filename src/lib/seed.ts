// 앱이 처음 뜰 때 스키마를 만들고 저장소의 시드 파일을 DB에 넣는다(F5).
// docker(빈 Postgres)·배포(Supabase)·로컬(PGlite) 어디서 떠도 같은 기준 데이터가 들어간다.
// - 기준 데이터: 파일 내용이 바뀌었을 때만 통째로 다시 넣는다.
//     data/catalog/drugs.json·health_foods.json·product_substances.json  팀원 제품 축약본(scripts/import_team_db.mjs가 만듦)
//     data/drugs/otc_core.json·data/seed/extra_drugs.json                e약은요 원문(약 제품에 덧붙임)
//     data/seed/substances.json·interaction_rules.json                    성분·조합 규칙
// - 시드 계정: E2E용 `복용자` 계정(compose의 SEED_USER_EMAIL·SEED_USER_PASSWORD)과
//   시연 계정(data/seed/personas.json, 비밀번호는 SEED_PERSONA_PASSWORD).
// 시드 파일이 아직 없으면 그 부분은 건너뛰고 경고만 남긴다(앱은 뜬다).
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { getDb, type Db } from './db'
import { REFERENCE_TABLES, SCHEMA_SQL, SCHEMA_VERSION } from './schema'
import { hashPassword } from './password'
import type { ItemType } from './catalog'

const DATA_DIR = path.join(process.cwd(), 'data')
// docs/scenarios.yaml 머리말: 복용자 계정 목록에는 레보티록신(하루 1정)과 칼슘(하루 1000mg)이 있고 첫 검진을 마친 상태다.
const TAKER_ITEMS: RefSeed[] = [
  { type: 'substance', ref: 'levothyroxine', daily_count: 1 },
  { type: 'substance', ref: 'calcium', daily_count: 1, unit_amount: 1000, unit: 'mg' },
]

export interface DrugSeed {
  item_seq: string
  name: string
  company: string | null
  category: string | null
  ingredient_count: number | null
  ingredients_text: string | null
  ingredients_en: string | null
  pick_reason: string | null
  ingredients: {
    ingredient_code: string | null
    ingredient_name: string
    amount: number | null
    amount_raw: string | null
    unit: string | null
    source: string | null
    substance_id: string | null
  }[]
}

export interface HealthFoodSeed {
  report_no: string
  list_no: number | null
  name: string
  list_name: string | null
  company: string | null
  list_functionality: string | null
  registered_at: string | null
  shelf_life: string | null
  appearance: string | null
  intake_method: string | null
  packaging: string | null
  functionality: string | null
  storage: string | null
  precautions: string | null
  ingredient_count: number | null
  pick_category: string | null
  pick_reason: string | null
  ingredients: { ingredient_type: string; seq: number; ingredient_name: string; substance_id: string | null }[]
}

export interface ProductSubstanceSeed {
  product_type: 'drug' | 'health_food'
  product_ref: string
  substance_id: string
  basis: string
}

/** e약은요 원문(자주 쓰는 일반의약품) */
interface EasyDrug {
  item_seq: string
  item_name: string
  company?: string | null
  efficacy?: string | null
  usage?: string | null
  warning?: string | null
  precautions?: string | null
  interactions?: string | null
  side_effects?: string | null
  storage?: string | null
  source_url: string
  ingredients?: { ingredient: string; nutrient: string | null }[]
}

export interface SubstanceSeed {
  id: string
  name: string
  aliases?: string[]
  kind: string
  is_vitamin?: boolean
  recommendable?: boolean
  function_claim?: string | null
  function_source_title?: string | null
  function_source_url?: string | null
  summary?: string | null
  display_name?: string | null
  upper_limit?: unknown
}

interface RefSeed {
  type: ItemType
  ref: string
  daily_count?: number
  unit_amount?: number
  unit?: string
}

export interface RuleSeed {
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

/** 팀원 조합 모음 한 건(scripts/import_team_db.mjs가 만듦) */
export interface TeamRuleSeed {
  id: string
  nutrient: string
  counterpart: string
  relation: string
  severity: string
  condition: string | null
  effect: string
  action: string
  sources: { source_id: string; source_title: string; source_url: string; source_kind: string; quote: string }[]
  members: { side: 'a' | 'b'; type: ItemType; ref: string; basis: string }[]
}

export interface Catalog {
  teamRules: TeamRuleSeed[]
  drugs: DrugSeed[]
  easy: EasyDrug[]
  healthFoods: HealthFoodSeed[]
  links: ProductSubstanceSeed[]
  substances: SubstanceSeed[]
  rules: RuleSeed[]
  /** 파일 내용 해시. 바뀌었을 때만 기준 데이터를 다시 넣는다. */
  hash: string
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

export async function readCatalog(): Promise<Catalog> {
  const files = {
    drugs: await readJson<DrugSeed[]>('catalog/drugs.json'),
    healthFoods: await readJson<HealthFoodSeed[]>('catalog/health_foods.json'),
    links: await readJson<ProductSubstanceSeed[]>('catalog/product_substances.json'),
    core: await readJson<EasyDrug[]>('drugs/otc_core.json'),
    extra: await readJson<EasyDrug[]>('seed/extra_drugs.json'),
    substances: await readJson<SubstanceSeed[]>('seed/substances.json'),
    rules: await readJson<RuleSeed[]>('seed/interaction_rules.json'),
    teamRules: await readJson<TeamRuleSeed[]>('catalog/nutrient_interactions.json'),
  }
  const hash = createHash('sha256').update(SCHEMA_SQL).update(SCHEMA_VERSION)
  for (const f of Object.values(files)) hash.update(f?.raw ?? '')
  return {
    drugs: files.drugs?.data ?? [],
    easy: [...(files.core?.data ?? []), ...(files.extra?.data ?? [])],
    healthFoods: files.healthFoods?.data ?? [],
    links: files.links?.data ?? [],
    substances: files.substances?.data ?? [],
    rules: files.rules?.data ?? [],
    teamRules: files.teamRules?.data ?? [],
    hash: hash.digest('hex'),
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

const permitUrl = (itemSeq: string) => `https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=${itemSeq}`

/**
 * 여러 행을 한 문장으로 넣는다(200행씩). 원격 DB(Supabase)에서 첫 기동 때 왕복 수를 줄이려는 것이다.
 * casts: 열 이름 → '::jsonb' 같은 형 변환
 */
async function insertMany(
  db: Db,
  table: string,
  columns: string[],
  rows: unknown[][],
  opts: { casts?: Record<string, string>; onConflict?: string } = {},
): Promise<void> {
  const CHUNK = 200
  for (let start = 0; start < rows.length; start += CHUNK) {
    const chunk = rows.slice(start, start + CHUNK)
    const params: unknown[] = []
    const tuples = chunk.map((row) => {
      const cells = row.map((v, i) => {
        params.push(v)
        return `$${params.length}${opts.casts?.[columns[i]] ?? ''}`
      })
      return `(${cells.join(', ')})`
    })
    await db.query(`INSERT INTO ${table} (${columns.join(', ')}) VALUES ${tuples.join(', ')}${opts.onConflict ? ` ${opts.onConflict}` : ''}`, params)
  }
}

/**
 * 기준 데이터를 통째로 다시 넣는다. db는 실제 DB일 수도, SQL을 받아 적기만 하는 기록용일 수도 있다
 * (scripts/build_supabase_sql.ts가 이 함수로 Supabase용 SQL 파일을 만든다).
 */
export async function loadCatalog(db: Db, c: Catalog): Promise<void> {
  for (const t of REFERENCE_TABLES) await db.query(`DELETE FROM ${t}`)

  // 약: 팀원 축약본 + e약은요 원문. 축약본에 없는 e약은요 품목(예: 니코레트)도 넣어 둔다.
  const easyBySeq = new Map(c.easy.map((e) => [e.item_seq, e]))
  const drugRows: DrugSeed[] = [...c.drugs]
  const teamSeqs = new Set(c.drugs.map((d) => d.item_seq))
  for (const e of c.easy) {
    if (teamSeqs.has(e.item_seq)) continue
    drugRows.push({
      item_seq: e.item_seq,
      name: e.item_name,
      company: e.company ?? null,
      category: '일반의약품',
      ingredient_count: e.ingredients?.length ?? null,
      ingredients_text: (e.ingredients ?? []).map((i) => i.ingredient).join(' | ') || null,
      ingredients_en: null,
      pick_reason: '자주 쓰는 일반의약품(e약은요)',
      ingredients: (e.ingredients ?? []).map((i) => ({
        ingredient_code: null,
        ingredient_name: i.ingredient,
        amount: null,
        amount_raw: null,
        unit: null,
        source: 'e약은요',
        substance_id: null,
      })),
    })
  }

  await insertMany(
    db,
    'drug',
    ['item_seq', 'name', 'company', 'category', 'ingredient_count', 'ingredients_text', 'ingredients_en', 'pick_reason',
     'efficacy', 'usage', 'warning', 'precautions', 'interactions', 'side_effects', 'storage', 'easy_source_url', 'source_url'],
    drugRows.map((d) => {
      const e = easyBySeq.get(d.item_seq)
      return [
        d.item_seq, d.name, d.company, d.category, d.ingredient_count, d.ingredients_text, d.ingredients_en, d.pick_reason,
        e?.efficacy ?? null, e?.usage ?? null, e?.warning ?? null, e?.precautions ?? null, e?.interactions ?? null,
        e?.side_effects ?? null, e?.storage ?? null, e?.source_url ?? null, permitUrl(d.item_seq),
      ]
    }),
  )
  await insertMany(
    db,
    'drug_ingredient',
    ['item_seq', 'ingredient_code', 'ingredient_name', 'amount', 'amount_raw', 'unit', 'source', 'substance_id'],
    drugRows.flatMap((d) => d.ingredients.map((i) => [d.item_seq, i.ingredient_code, i.ingredient_name, i.amount, i.amount_raw, i.unit, i.source, i.substance_id])),
  )

  await insertMany(
    db,
    'health_food',
    ['report_no', 'list_no', 'name', 'list_name', 'company', 'list_functionality', 'registered_at', 'shelf_life', 'appearance',
     'intake_method', 'packaging', 'functionality', 'storage', 'precautions', 'ingredient_count', 'pick_category', 'pick_reason'],
    c.healthFoods.map((f) => [
      f.report_no, f.list_no, f.name, f.list_name, f.company, f.list_functionality, f.registered_at, f.shelf_life, f.appearance,
      f.intake_method, f.packaging, f.functionality, f.storage, f.precautions, f.ingredient_count, f.pick_category, f.pick_reason,
    ]),
    { casts: { registered_at: '::date' } },
  )
  await insertMany(
    db,
    'health_food_ingredient',
    ['report_no', 'ingredient_type', 'seq', 'ingredient_name', 'substance_id'],
    c.healthFoods.flatMap((f) => f.ingredients.map((i) => [f.report_no, i.ingredient_type, i.seq, i.ingredient_name, i.substance_id])),
  )

  await insertMany(
    db,
    'substance',
    ['id', 'name', 'display_name', 'aliases', 'kind', 'is_vitamin', 'recommendable', 'function_claim', 'function_source_title',
     'function_source_url', 'summary', 'upper_limit'],
    c.substances.map((s) => [
      s.id, s.name, s.display_name ?? null, JSON.stringify(s.aliases ?? []), s.kind, Boolean(s.is_vitamin), Boolean(s.recommendable),
      s.function_claim ?? null, s.function_source_title ?? null, s.function_source_url ?? null, s.summary ?? null,
      s.upper_limit ? JSON.stringify(s.upper_limit) : null,
    ]),
    { casts: { aliases: '::jsonb', upper_limit: '::jsonb' } },
  )

  const subIds = new Set(c.substances.map((s) => s.id))
  await insertMany(
    db,
    'product_substance',
    ['product_type', 'product_ref', 'substance_id', 'basis'],
    c.links.filter((l) => subIds.has(l.substance_id)).map((l) => [l.product_type, l.product_ref, l.substance_id, l.basis]),
    { onConflict: 'ON CONFLICT DO NOTHING' },
  )

  const ids = {
    drug: new Set(drugRows.map((d) => d.item_seq)),
    health_food: new Set(c.healthFoods.map((f) => f.report_no)),
    substance: subIds,
  }
  const resolves = (r: { type: ItemType; ref: string }) => ids[r.type]?.has(r.ref) ?? false
  const goodRules = c.rules.filter((r) => {
    if (resolves(r.a) && resolves(r.b)) return true
    console.warn(`[seed] 규칙 ${r.id}: 참조를 찾지 못해 건너뜁니다 (${r.a.type}:${r.a.ref} × ${r.b.type}:${r.b.ref})`)
    return false
  })
  const skipped = c.rules.length - goodRules.length
  await insertMany(
    db,
    'interaction_rule',
    ['id', 'a_type', 'a_ref', 'b_type', 'b_ref', 'relation', 'effect', 'quote', 'quote_ko', 'action', 'pharmacist_question',
     'source_id', 'source_title', 'source_url', 'source_kind', 'source_note', 'more_sources', 'checked_on'],
    goodRules.map((r) => [
      r.id, r.a.type, r.a.ref, r.b.type, r.b.ref, r.relation, r.effect ?? null, r.quote, r.quote_ko ?? null, r.action,
      r.pharmacist_question, r.source_id, r.source_title, r.source_url, r.source_kind, r.source_note ?? null,
      JSON.stringify(r.more_sources ?? []), r.verification?.checked_on ?? null,
    ]),
    { casts: { more_sources: '::jsonb' }, onConflict: 'ON CONFLICT (id) DO NOTHING' },
  )

  // 팀원 조합 모음: 양쪽 멤버가 하나 이상씩 있고 인용 출처가 있는 것만
  const teamRules = c.teamRules.filter(
    (r) => r.sources.length > 0 && r.members.some((m) => m.side === 'a' && resolves(m)) && r.members.some((m) => m.side === 'b' && resolves(m)),
  )
  // 약사에게 물을 질문은 원문에 없으므로 이름만 넣은 같은 틀로 만든다.
  const question = (r: TeamRuleSeed) => `「${r.nutrient}」와 「${r.counterpart}」, 같이 먹어도 되나요? 먹는다면 어떻게 먹어야 하나요?`
  await insertMany(
    db,
    'interaction_rule',
    ['id', 'a_type', 'a_ref', 'b_type', 'b_ref', 'relation', 'effect', 'quote', 'quote_ko', 'action', 'pharmacist_question',
     'source_id', 'source_title', 'source_url', 'source_kind', 'source_note', 'more_sources', 'checked_on', 'a_label', 'b_label', 'severity', 'condition'],
    teamRules.map((r) => {
      const [first, ...rest] = r.sources
      return [
        r.id, 'group', r.id, 'group', r.id, r.relation, r.effect, first.quote, null, r.action, question(r),
        first.source_id, first.source_title, first.source_url, first.source_kind, null,
        JSON.stringify(rest.map((s) => ({ ...s, source_note: null, quote_ko: null }))), null,
        r.nutrient, r.counterpart, r.severity, r.condition,
      ]
    }),
    { casts: { more_sources: '::jsonb' }, onConflict: 'ON CONFLICT (id) DO NOTHING' },
  )
  await insertMany(
    db,
    'rule_member',
    ['rule_id', 'side', 'item_type', 'item_ref', 'basis'],
    teamRules.flatMap((r) => r.members.filter(resolves).map((m) => [r.id, m.side, m.type, m.ref, m.basis])),
    { onConflict: 'ON CONFLICT DO NOTHING' },
  )
  console.log(
    `[seed] 기준 데이터: 약 ${drugRows.length}개, 건강기능식품 ${c.healthFoods.length}개, 성분 ${c.substances.length}개, 제품-성분 ${c.links.length}개, 규칙 ${c.rules.length - skipped}개${skipped ? ` (건너뜀 ${skipped})` : ''} + 조합 모음 ${teamRules.length}개`,
  )
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

async function itemExists(db: Db, it: RefSeed): Promise<boolean> {
  const sql =
    it.type === 'drug'
      ? 'SELECT 1 FROM drug WHERE item_seq = $1'
      : it.type === 'health_food'
        ? 'SELECT 1 FROM health_food WHERE report_no = $1'
        : 'SELECT 1 FROM substance WHERE id = $1'
  return (await db.query(sql, [it.ref])).length > 0
}

async function ensureItems(db: Db, userId: number, items: RefSeed[]): Promise<void> {
  for (const it of items) {
    if (!(await itemExists(db, it))) {
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

/** 기준 데이터 표의 구조가 바뀌었으면(SCHEMA_VERSION) 그 표만 지운다. 회원·목록은 남긴다. */
async function migrateReferenceTables(db: Db): Promise<void> {
  await db.exec('CREATE TABLE IF NOT EXISTS seed_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)')
  if ((await getMeta(db, 'schema_version')) === SCHEMA_VERSION) return
  for (const t of REFERENCE_TABLES) await db.exec(`DROP TABLE IF EXISTS ${t} CASCADE`)
  await db.query(`DELETE FROM seed_meta WHERE key = 'catalog_hash'`)
  console.log(`[seed] 기준 데이터 표 구조를 ${SCHEMA_VERSION}(으)로 새로 만듭니다.`)
}

export async function ensureSchemaAndSeed(): Promise<void> {
  const started = Date.now()
  const db = await getDb()
  const catalog = await readCatalog()
  const personas = (await readJson<PersonaSeed[]>('seed/personas.json'))?.data ?? []
  const demoEmail = process.env.SEED_USER_EMAIL
  const demoPassword = process.env.SEED_USER_PASSWORD
  const personaPassword = process.env.SEED_PERSONA_PASSWORD
  // 시드 계정 구성이 바뀌었는지 보는 값(비밀번호 자체는 넣지 않는다)
  const usersHash = createHash('sha256')
    .update(JSON.stringify([demoEmail ?? '', Boolean(demoPassword), Boolean(personaPassword), personas, TAKER_ITEMS, catalog.hash]))
    .digest('hex')

  // 이미 준비된 DB면 여기서 끝낸다(왕복 2번). 서버가 새로 뜰 때마다 원격 DB와 수십 번 주고받지 않으려는 것이다.
  await db.exec('CREATE TABLE IF NOT EXISTS seed_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)')
  const meta = new Map((await db.query<{ key: string; value: string }>('SELECT key, value FROM seed_meta')).map((r) => [r.key, r.value]))
  if (meta.get('schema_version') === SCHEMA_VERSION && meta.get('catalog_hash') === catalog.hash && meta.get('users_hash') === usersHash) {
    console.log(`[seed] 이미 준비된 DB라 건너뜁니다 (${Date.now() - started}ms, ${db.kind})`)
    return
  }

  await migrateReferenceTables(db)
  await db.exec(SCHEMA_SQL)
  await setMeta(db, 'schema_version', SCHEMA_VERSION)

  if ((await getMeta(db, 'catalog_hash')) !== catalog.hash) {
    await loadCatalog(db, catalog)
    await setMeta(db, 'catalog_hash', catalog.hash)
  } else {
    console.log('[seed] 기준 데이터가 이미 최신이라 건너뜁니다.')
  }

  if (demoEmail && demoPassword) {
    const id = await ensureUser(db, { email: demoEmail, password: demoPassword, display_name: '복용자', role: '복용자', first_check_done: true })
    await ensureItems(db, id, TAKER_ITEMS)
  } else {
    console.warn('[seed] SEED_USER_EMAIL·SEED_USER_PASSWORD가 없어 복용자 계정을 만들지 않습니다.')
  }

  if (personaPassword && personas.length > 0) {
    for (const p of personas) {
      const id = await ensureUser(db, {
        email: p.email,
        password: personaPassword,
        display_name: p.display_name,
        role: '복용자',
        first_check_done: Boolean(p.first_check_done),
      })
      await ensureItems(db, id, p.items ?? [])
    }
    console.log(`[seed] 페르소나 계정 ${personas.length}개 준비`)
  }

  await setMeta(db, 'users_hash', usersHash)
  console.log(`[seed] 완료 (${Date.now() - started}ms, ${db.kind})`)
}
