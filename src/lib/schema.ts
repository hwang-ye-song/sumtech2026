// 앱이 처음 뜰 때 만드는 테이블. PostgreSQL과 PGlite에서 모두 도는 문법만 쓴다.
// 기준 데이터(drug·drug_ingredient·substance·interaction_rule)는 data/ 시드 파일에서 넣고 앱은 읽기만 한다.
// 사용자 데이터(app_user·user_item·recommendation)는 앱이 만든다.

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS drug (
  item_seq      TEXT PRIMARY KEY,
  item_name     TEXT NOT NULL,
  company       TEXT,
  category      TEXT,
  efficacy      TEXT,
  usage         TEXT,
  warning       TEXT,
  precautions   TEXT,
  interactions  TEXT,
  side_effects  TEXT,
  storage       TEXT,
  source        TEXT,
  source_url    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS drug_ingredient (
  item_seq    TEXT NOT NULL REFERENCES drug(item_seq) ON DELETE CASCADE,
  ingredient  TEXT NOT NULL,
  nutrient    TEXT,
  PRIMARY KEY (item_seq, ingredient)
);
CREATE INDEX IF NOT EXISTS idx_drug_ingredient_nutrient ON drug_ingredient (nutrient);

CREATE TABLE IF NOT EXISTS substance (
  id                     TEXT PRIMARY KEY,
  name                   TEXT NOT NULL,
  aliases                JSONB NOT NULL DEFAULT '[]'::jsonb,
  kind                   TEXT NOT NULL,
  is_vitamin             BOOLEAN NOT NULL DEFAULT false,
  recommendable          BOOLEAN NOT NULL DEFAULT false,
  function_claim         TEXT,
  function_source_title  TEXT,
  function_source_url    TEXT,
  nutrient_keys          JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary                TEXT
);
ALTER TABLE substance ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE substance ADD COLUMN IF NOT EXISTS upper_limit JSONB;

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
  source_kind          TEXT NOT NULL
);
ALTER TABLE interaction_rule ADD COLUMN IF NOT EXISTS source_note TEXT;
ALTER TABLE interaction_rule ADD COLUMN IF NOT EXISTS more_sources JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE interaction_rule ADD COLUMN IF NOT EXISTS checked_on TEXT;
CREATE INDEX IF NOT EXISTS idx_rule_a ON interaction_rule (a_type, a_ref);
CREATE INDEX IF NOT EXISTS idx_rule_b ON interaction_rule (b_type, b_ref);

CREATE TABLE IF NOT EXISTS app_user (
  id                SERIAL PRIMARY KEY,
  email             TEXT NOT NULL UNIQUE,
  password_hash     TEXT NOT NULL,
  display_name      TEXT,
  role              TEXT NOT NULL DEFAULT '복용자',
  first_checked_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
`
