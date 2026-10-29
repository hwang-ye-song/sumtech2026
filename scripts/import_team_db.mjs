// 팀원이 만든 Supabase용 SQL(database/01_new_drug.sql, 02_new_health_food.sql)을
// 앱 시드 파일(data/catalog/drugs.json, health_foods.json)로 바꾼다.
// 내장 DB(PGlite)에서 SQL을 그대로 실행한 뒤 표를 읽어 JSON으로 쓴다. SQL이 바뀌면 다시 실행한다.
//   node scripts/import_team_db.mjs
import fs from 'node:fs/promises'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const OUT_DIR = path.join(ROOT, 'data', 'catalog')

// PGlite에 없는 확장·Supabase 전용 문장은 빼고 실행한다(데이터에는 영향 없음).
function forPglite(sql) {
  return sql
    .split('\n')
    .filter((line) => !/create extension|gin_trgm_ops|create policy/i.test(line))
    .join('\n')
}

const db = await PGlite.create()
for (const f of ['01_new_drug.sql', '02_new_health_food.sql', '03_new_nutrient_interaction.sql']) {
  const sql = await fs.readFile(path.join(ROOT, 'database', f), 'utf8')
  await db.exec(forPglite(sql.replace(/^﻿/, '')))
}

const drugs = (await db.query('SELECT * FROM new_drug ORDER BY item_seq')).rows
const drugIng = (await db.query('SELECT * FROM new_drug_ingredient ORDER BY item_seq, id')).rows
const foods = (await db.query('SELECT * FROM new_health_food ORDER BY report_no')).rows
const foodIng = (await db.query('SELECT * FROM new_health_food_ingredient ORDER BY report_no, ingredient_type, seq')).rows

// 원재료 이름 → 성분 id(data/seed/substances.json). 위에서부터 처음 맞는 규칙을 쓴다.
// 성분이 아닌 것(부형제, 약 성분의 염, 처방용 활성형 비타민D)은 null로 먼저 걸러 잘못 잇지 않는다.
const SUBSTANCE_RULES = [
  [/스테아린산마그네슘|에스오메프라졸마그네슘|메타규산알루민산마그네슘|스타틴칼슘|클라불란산칼륨|요오드칼륨|칼시트리올|알파칼시돌|이산화규소|덱스트린|전분|아라비아검|설탕|글리세린지방산/, null],
  [/레보티록신/, 'levothyroxine'],
  [/와파린/, 'warfarin'],
  [/암로디핀/, 'amlodipine'],
  [/로사르탄/, 'losartan'],
  [/독시사이클린/, 'doxycycline'],
  [/시프로플록사신/, 'ciprofloxacin'],
  [/레보플록사신/, 'levofloxacin'],
  [/알렌드론산|알렌드로네이트/, 'alendronate'],
  [/메트포르민/, 'metformin'],
  [/은행엽|은행잎/, 'ginkgo'],
  [/판토텐산/, 'vitamin_b5'],
  [/코발라민|비타민\s*B\s*12/i, 'vitamin_b12'],
  [/티아민|비타민\s*B\s*1(?!\d)/i, 'vitamin_b1'],
  [/리보플라빈|비타민\s*B\s*2/i, 'vitamin_b2'],
  [/니코틴산아미드|나이아신/, 'vitamin_b3'],
  [/피리독|비타민\s*B\s*6/i, 'vitamin_b6'],
  [/비오틴/, 'vitamin_b7'],
  [/엽산|폴산/, 'vitamin_b9'],
  [/아스코르브산|비타민\s*C/i, 'vitamin_c'],
  [/콜레칼시페롤|비타민\s*D/i, 'vitamin_d'],
  [/토코페롤|토코페릴|비타민\s*E/i, 'vitamin_e'],
  [/비타민\s*K|메나퀴논|피토나디온/i, 'vitamin_k'],
  [/비타민\s*A|베타카로틴|레티놀/i, 'vitamin_a'],
  [/철|헴철/, 'iron'],
  [/칼슘/, 'calcium'],
  [/마그네슘/, 'magnesium'],
  [/아연/, 'zinc'],
  [/셀레늄|셀렌산/, 'selenium'],
  [/EPA|DHA|어유|오메가/i, 'omega3'],
  [/루테인|마리골드/, 'lutein'],
  [/유산균|프로바이오틱스|bacill|bifidobacter|streptococcus|enterococcus|lactococcus|lactobacillus|lacticaseibacillus|lactiplantibacillus|limosilactobacillus|ligilactobacillus/i, 'probiotics'],
  [/코엔자임|유비데카레논/, 'coenzyme_q10'],
  [/밀크씨슬|실리마린/, 'milk_thistle'],
]
const substanceIds = new Set(
  JSON.parse((await fs.readFile(path.join(ROOT, 'data', 'seed', 'substances.json'), 'utf8')).replace(/^﻿/, '')).map((s) => s.id),
)
function substanceOf(name) {
  for (const [re, id] of SUBSTANCE_RULES) {
    if (re.test(name)) {
      if (id && !substanceIds.has(id)) throw new Error(`연결표의 성분 id ${id}가 substances.json에 없어요`)
      return id
    }
  }
  return null
}

const num = (v) => (v === null || v === undefined ? null : Number(v))
const date = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v ?? null)

const drugOut = drugs.map((d) => ({
  ...d,
  ingredients: drugIng
    .filter((i) => i.item_seq === d.item_seq)
    .map(({ ingredient_code, ingredient_name, amount, amount_raw, unit, source }) => ({
      ingredient_code,
      ingredient_name,
      amount: num(amount),
      amount_raw,
      unit,
      source,
      substance_id: substanceOf(ingredient_name),
    })),
}))
const foodOut = foods.map((f) => ({
  ...f,
  registered_at: date(f.registered_at),
  ingredients: foodIng
    .filter((i) => i.report_no === f.report_no)
    // 성분 연결은 기능성 원재료만 한다(기타·캡슐 원재료는 부형제라 잇지 않는다).
    .map(({ ingredient_type, seq, ingredient_name }) => ({
      ingredient_type,
      seq,
      ingredient_name,
      substance_id: ingredient_type === 'functional' ? substanceOf(ingredient_name) : null,
    })),
}))

// 제품 → 성분 연결(product_substance). 판정에는 이 표만 쓴다.
//  - 약: 주성분에서 잇는다.
//  - 건강기능식품: 기능성 원재료, 식약처 기능성 내용의 '[칼슘]' 같은 제목, 팀원이 붙인 범주(pick_category)에서 모두 잇는다.
//    팀원 데이터에서 기능성 원재료 칸이 비거나 다른 이름으로 들어간 제품(예: 닥터린 철분 플러스)도 놓치지 않게 하려는 것이다.
const CATEGORY_SUBSTANCE = {
  칼슘: 'calcium', 철분: 'iron', 비타민C: 'vitamin_c', 오메가3: 'omega3', 마그네슘: 'magnesium', 비타민D: 'vitamin_d',
  유산균: 'probiotics', 루테인: 'lutein', 밀크씨슬: 'milk_thistle', 코엔자임Q10: 'coenzyme_q10', 은행잎: 'ginkgo', 비타민K: 'vitamin_k',
}
const links = []
const addLink = (product_type, product_ref, substance_id, basis) => {
  if (!substance_id) return
  if (links.some((l) => l.product_type === product_type && l.product_ref === product_ref && l.substance_id === substance_id)) return
  links.push({ product_type, product_ref, substance_id, basis })
}
for (const d of drugOut) for (const i of d.ingredients) addLink('drug', d.item_seq, i.substance_id, 'ingredient')
for (const f of foodOut) {
  for (const i of f.ingredients) addLink('health_food', f.report_no, i.substance_id, 'ingredient')
  for (const m of (f.functionality ?? '').matchAll(/\[([^\]]+)\]/g)) addLink('health_food', f.report_no, substanceOf(m[1]), 'functionality')
  addLink('health_food', f.report_no, CATEGORY_SUBSTANCE[f.pick_category] ?? null, 'category')
}
await fs.writeFile(path.join(OUT_DIR, 'product_substances.json'), JSON.stringify(links, null, 1) + '\n')

// 같이 먹으면 안 되는 조합(03_new_nutrient_interaction.sql) → 판정 규칙
//  한쪽(a)은 문제 성분(nutrient), 다른 쪽(b)은 상대(counterpart). 양쪽에 걸리는 것:
//  - 팀원이 짝지어 둔 제품(new_interaction_item_match)
//  - 성분 이름으로 등록한 경우를 위해, 이름이 우리 성분과 이어지면 그 성분
//  monitor(지켜보기)는 화면에서 '의사·약사와 상의'로 보여 준다. 인용문이 있는 출처만 쓴다.
const interactions = (await db.query('SELECT * FROM new_nutrient_interaction ORDER BY id')).rows
const iSources = (await db.query(`SELECT * FROM new_nutrient_interaction_source WHERE quote IS NOT NULL AND quote <> '' ORDER BY interaction_id, id`)).rows
const iMatches = (await db.query('SELECT * FROM new_interaction_item_match ORDER BY interaction_id, side, item_type, item_id')).rows
const SOURCE_KIND = { 식약처_의약품허가: 'mfds_approval', 식약처_건강기능식품: 'mfds_health_food', 식약처_기타: 'mfds_other', 논문: 'paper', 해외정부기관: 'gov' }
const nameToSubstance = (name) => substanceOf(name.replace(/\s*지방산$/, ''))
const teamRules = interactions.map((r) => {
  const members = []
  const addMember = (side, type, ref, basis) => {
    if (!ref || members.some((m) => m.side === side && m.type === type && m.ref === ref)) return
    members.push({ side, type, ref, basis })
  }
  for (const m of iMatches.filter((x) => x.interaction_id === r.id)) addMember(m.side === 'nutrient' ? 'a' : 'b', m.item_type, m.item_id, m.match_basis)
  addMember('a', 'substance', nameToSubstance(r.nutrient), '성분 이름')
  addMember('b', 'substance', nameToSubstance(r.counterpart), '성분 이름')
  return {
    id: `ni-${r.id}`,
    nutrient: r.nutrient,
    counterpart: r.counterpart,
    counterpart_type: r.counterpart_type,
    relation: r.relation === 'monitor' ? 'consult' : r.relation,
    severity: r.severity,
    condition: r.nutrient_condition,
    dose_dependent: r.dose_dependent,
    effect: r.harmful_effect,
    action: r.management ?? r.harmful_effect,
    confidence: r.confidence,
    sources: iSources
      .filter((s) => s.interaction_id === r.id)
      .map((s) => ({ source_id: s.pmid ? `PMID ${s.pmid}` : s.kind, source_title: s.title, source_url: s.url, source_kind: SOURCE_KIND[s.kind] ?? 'other', quote: s.quote, verified: s.verified })),
    members,
  }
})
await fs.writeFile(path.join(OUT_DIR, 'nutrient_interactions.json'), JSON.stringify(teamRules, null, 1) + '\n')
const noMembers = teamRules.filter((r) => !r.members.some((m) => m.side === 'a') || !r.members.some((m) => m.side === 'b'))
console.log(`조합 ${teamRules.length}개(근거 ${iSources.length}개) → data/catalog/nutrient_interactions.json${noMembers.length ? `, 한쪽이 빈 조합 ${noMembers.length}개` : ''}`)

// 확인용: 제품마다 연결된 성분, 연결되지 않은 원재료
const report = [`제품-성분 연결 ${links.length}개`, '']
const idsOf = (type, ref) => links.filter((l) => l.product_type === type && l.product_ref === ref).map((l) => (l.basis === 'ingredient' ? l.substance_id : `${l.substance_id}*`))
for (const d of drugOut) report.push(`[약] ${d.name}: ${idsOf('drug', d.item_seq).join(',') || '-'}`)
for (const f of foodOut) report.push(`[건기식:${f.pick_category}] ${f.name}: ${idsOf('health_food', f.report_no).join(',') || '-'}`)
report.push('', '* = 원재료 칸이 아니라 기능성 내용 제목이나 범주로 이은 것')
const unmapped = new Map()
for (const f of foodOut) for (const i of f.ingredients) if (i.ingredient_type === 'functional' && !i.substance_id) unmapped.set(i.ingredient_name, (unmapped.get(i.ingredient_name) ?? 0) + 1)
report.push('', '[연결 안 된 기능성 원재료]', ...[...unmapped].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}(${v})`))
await fs.writeFile(path.join(ROOT, 'data', 'catalog', 'mapping_report.txt'), report.join('\n') + '\n')

await fs.mkdir(OUT_DIR, { recursive: true })
await fs.writeFile(path.join(OUT_DIR, 'drugs.json'), JSON.stringify(drugOut, null, 1) + '\n')
await fs.writeFile(path.join(OUT_DIR, 'health_foods.json'), JSON.stringify(foodOut, null, 1) + '\n')
console.log(`약 ${drugOut.length}개(성분 ${drugIng.length}행), 건강기능식품 ${foodOut.length}개(원재료 ${foodIng.length}행) → data/catalog/`)
