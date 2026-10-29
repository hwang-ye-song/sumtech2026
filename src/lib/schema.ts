// 앱이 처음 뜰 때 만드는 테이블. PostgreSQL과 PGlite에서 모두 도는 문법만 쓴다.
// 기준 데이터는 저장소의 시드 파일에서 넣고 앱은 읽기만 한다(src/lib/seed.ts).
//   - drug·drug_ingredient·health_food·health_food_ingredient: 팀원이 만든 제품 축약본(database/01_new_drug.sql·02_new_health_food.sql,
//     scripts/import_team_db.mjs로 data/catalog/*.json에 옮김). drug에는 e약은요 원문 항목(data/drugs/otc_core.json)을 덧붙인다.
//   - substance: 판정·추천에 쓰는 성분(data/seed/substances.json)
//   - product_substance: 제품 → 성분 연결. 제품을 목록에 넣으면 여기 이어진 성분으로 조합을 점검한다.
//   - interaction_rule: 원문 근거가 있는 조합 규칙(data/seed/interaction_rules.json)
//   - drug_caution: 자주 쓰는 일반의약품 설명서(e약은요)의 주의 문장(data/drugs/drug_caution_rule.csv). 알아보기 화면에 원문 그대로 보여 준다.
// 사용자 데이터(app_user·user_item·recommendation)는 앱이 만든다.

/** 기준 데이터 표 구조를 바꾸면 올린다. 값이 다르면 기준 데이터 표를 지우고 새로 만든다(사용자 데이터는 남긴다). */
export const SCHEMA_VERSION = '4-drug-caution'

/** 구조가 바뀌었을 때 지우는 기준 데이터 표(의존 순서대로) */
export const REFERENCE_TABLES = [
  'drug_caution',
  'rule_member',
  'product_substance',
  'interaction_rule',
  'health_food_ingredient',
  'health_food',
  'drug_ingredient',
  'drug',
  'substance',
]

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS drug (
  item_seq          TEXT PRIMARY KEY,   -- 품목기준코드
  name              TEXT NOT NULL,      -- 제품명
  company           TEXT,
  category          TEXT,               -- 전문의약품 / 일반의약품
  ingredient_count  INTEGER,
  ingredients_text  TEXT,               -- 성분 (화면 표시용)
  ingredients_en    TEXT,
  pick_reason       TEXT,               -- 축약본에 넣은 이유
  efficacy          TEXT,               -- 이하 e약은요 원문(자주 쓰는 일반의약품만)
  usage             TEXT,
  warning           TEXT,
  precautions       TEXT,
  interactions      TEXT,
  side_effects      TEXT,
  storage           TEXT,
  easy_source_url   TEXT,               -- e약은요 원문 주소
  source_url        TEXT NOT NULL       -- 식약처 의약품 허가정보 주소
);

CREATE TABLE IF NOT EXISTS drug_ingredient (
  id               SERIAL PRIMARY KEY,
  item_seq         TEXT NOT NULL REFERENCES drug(item_seq) ON DELETE CASCADE,
  ingredient_code  TEXT,
  ingredient_name  TEXT NOT NULL,
  amount           NUMERIC,
  amount_raw       TEXT,
  unit             TEXT,
  source           TEXT,
  substance_id     TEXT                 -- 이어진 성분(없으면 NULL)
);
CREATE INDEX IF NOT EXISTS idx_drug_ingredient_item ON drug_ingredient (item_seq);

CREATE TABLE IF NOT EXISTS health_food (
  report_no           TEXT PRIMARY KEY,  -- 신고번호
  list_no             INTEGER,
  name                TEXT NOT NULL,
  list_name           TEXT,
  company             TEXT,
  list_functionality  TEXT,
  registered_at       DATE,
  shelf_life          TEXT,
  appearance          TEXT,
  intake_method       TEXT,
  packaging           TEXT,
  functionality       TEXT,              -- 식약처 기능성 내용
  storage             TEXT,
  precautions         TEXT,
  ingredient_count    INTEGER,
  pick_category       TEXT,              -- 축약본 범주(칼슘·철분 …)
  pick_reason         TEXT
);

CREATE TABLE IF NOT EXISTS health_food_ingredient (
  id               SERIAL PRIMARY KEY,
  report_no        TEXT NOT NULL REFERENCES health_food(report_no) ON DELETE CASCADE,
  ingredient_type  TEXT NOT NULL,        -- functional / other / capsule
  seq              INTEGER NOT NULL,
  ingredient_name  TEXT NOT NULL,
  substance_id     TEXT
);
CREATE INDEX IF NOT EXISTS idx_health_food_ingredient_report ON health_food_ingredient (report_no);

CREATE TABLE IF NOT EXISTS substance (
  id                     TEXT PRIMARY KEY,
  name                   TEXT NOT NULL,
  display_name           TEXT,
  aliases                JSONB NOT NULL DEFAULT '[]'::jsonb,
  kind                   TEXT NOT NULL,
  is_vitamin             BOOLEAN NOT NULL DEFAULT false,
  recommendable          BOOLEAN NOT NULL DEFAULT false,
  function_claim         TEXT,
  function_source_title  TEXT,
  function_source_url    TEXT,
  summary                TEXT,
  upper_limit            JSONB
);

CREATE TABLE IF NOT EXISTS product_substance (
  product_type  TEXT NOT NULL,           -- drug / health_food
  product_ref   TEXT NOT NULL,           -- drug.item_seq / health_food.report_no
  substance_id  TEXT NOT NULL REFERENCES substance(id) ON DELETE CASCADE,
  basis         TEXT NOT NULL,           -- ingredient / functionality / category
  PRIMARY KEY (product_type, product_ref, substance_id)
);
CREATE INDEX IF NOT EXISTS idx_product_substance_sub ON product_substance (substance_id);

CREATE TABLE IF NOT EXISTS interaction_rule (
  id                   TEXT PRIMARY KEY,
  a_type               TEXT NOT NULL,
  a_ref                TEXT NOT NULL,
  b_type               TEXT NOT NULL,
  b_ref                TEXT NOT NULL,
  relation             TEXT NOT NULL,
  effect               TEXT,
  quote                TEXT NOT NULL,
  quote_ko             TEXT,
  action               TEXT NOT NULL,
  pharmacist_question  TEXT NOT NULL,
  source_id            TEXT NOT NULL,
  source_title         TEXT NOT NULL,
  source_url           TEXT NOT NULL,
  source_kind          TEXT NOT NULL,
  source_note          TEXT,
  more_sources         JSONB NOT NULL DEFAULT '[]'::jsonb,
  checked_on           TEXT,
  -- 팀원 조합 모음(data/catalog/nutrient_interactions.json)에서 온 규칙: a_type·b_type이 'group'이고 양쪽 멤버는 rule_member에 있다.
  a_label              TEXT,             -- 문제 성분 이름(예: 마그네슘)
  b_label              TEXT,             -- 상대 이름(예: 시프로플록사신)
  severity             TEXT,             -- major / moderate / minor
  condition            TEXT              -- 문제가 되는 용량·형태 조건(있을 때만)
);
CREATE INDEX IF NOT EXISTS idx_rule_a ON interaction_rule (a_type, a_ref);
CREATE INDEX IF NOT EXISTS idx_rule_b ON interaction_rule (b_type, b_ref);

-- 'group' 규칙의 양쪽에 걸리는 것(약 제품·건강기능식품·성분)
CREATE TABLE IF NOT EXISTS rule_member (
  rule_id    TEXT NOT NULL REFERENCES interaction_rule(id) ON DELETE CASCADE,
  side       TEXT NOT NULL,              -- a / b
  item_type  TEXT NOT NULL,              -- drug / health_food / substance
  item_ref   TEXT NOT NULL,
  basis      TEXT,
  PRIMARY KEY (rule_id, side, item_type, item_ref)
);
CREATE INDEX IF NOT EXISTS idx_rule_member_item ON rule_member (item_type, item_ref);

-- 약 설명서(e약은요)에 적힌 주의 문장. 조합 판정에는 쓰지 않고 원문을 그대로 보여 주는 데만 쓴다.
CREATE TABLE IF NOT EXISTS drug_caution (
  id                TEXT PRIMARY KEY,   -- data/drugs/drug_caution_rule.csv의 id
  item_seq          TEXT NOT NULL,
  counterpart       TEXT NOT NULL,      -- 같이 먹으면 주의할 대상(알코올, 와파린, 아세트아미노펜 …)
  counterpart_type  TEXT NOT NULL,      -- drug / alcohol / food_drink / caffeine / supplement_nutrient / other
  relation          TEXT NOT NULL,      -- avoid / consult / separate_timing / caution / duplicate_ingredient
  quote             TEXT NOT NULL,      -- 원문 문장 그대로
  source_url        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_drug_caution_item ON drug_caution (item_seq);

CREATE TABLE IF NOT EXISTS app_user (
  id                SERIAL PRIMARY KEY,
  email             TEXT NOT NULL UNIQUE,
  password_hash     TEXT NOT NULL,
  display_name      TEXT,
  role              TEXT NOT NULL DEFAULT '복용자',
  first_checked_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- 가입할 때 받은 건강 정보·사진 AI 판독 동의 시각(시연·시드 계정은 비어 있다)
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS health_consent_at TIMESTAMPTZ;

-- item_type: drug(약 제품) / health_food(건강기능식품 제품) / substance(성분으로 등록)
CREATE TABLE IF NOT EXISTS user_item (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  item_type  TEXT NOT NULL,
  item_ref   TEXT NOT NULL,
  added_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_type, item_ref)
);
-- 하루에 먹는 개수(필수)와 한 알 함량(선택, 영양제 과다 섭취 확인용)
ALTER TABLE user_item ADD COLUMN IF NOT EXISTS daily_count INTEGER NOT NULL DEFAULT 1;
ALTER TABLE user_item ADD COLUMN IF NOT EXISTS unit_amount NUMERIC;
ALTER TABLE user_item ADD COLUMN IF NOT EXISTS unit TEXT;

CREATE TABLE IF NOT EXISTS recommendation (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  survey      JSONB NOT NULL,
  result      JSONB NOT NULL,
  model       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS seed_meta (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);

-- Supabase처럼 테이블을 웹 API(anon 키)로 바로 열어 주는 곳에서 회원 정보·목록이 새지 않게 행 단위 접근을 막는다.
-- 정책을 두지 않으므로 anon·authenticated는 아무 행도 못 읽는다. 앱은 테이블 주인 계정으로 붙어 영향이 없다.
ALTER TABLE drug ENABLE ROW LEVEL SECURITY;
ALTER TABLE drug_ingredient ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_food ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_food_ingredient ENABLE ROW LEVEL SECURITY;
ALTER TABLE substance ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_substance ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_rule ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE drug_caution ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation ENABLE ROW LEVEL SECURITY;
ALTER TABLE seed_meta ENABLE ROW LEVEL SECURITY;
`
