-- 일반의약품 정보(e약은요)와 거기서 뽑은 병용 주의 규칙을 담는 테이블.
-- PostgreSQL·SQLite 둘 다에서 돌아가는 문법만 쓴다.

CREATE TABLE IF NOT EXISTS drug (
  item_seq        TEXT PRIMARY KEY,   -- 식약처 품목기준코드
  item_name       TEXT NOT NULL,
  company         TEXT,
  category        TEXT,               -- 해열진통소염·감기·소화위장 등 (자주 쓰는 약 목록에만 있음)
  efficacy        TEXT,
  usage           TEXT,
  warning         TEXT,               -- 사용 전 반드시 알아야 할 내용
  precautions     TEXT,
  interactions    TEXT,               -- 주의해야 할 약 또는 음식 (원문)
  side_effects    TEXT,
  storage         TEXT,
  open_date       TEXT,
  update_date     TEXT,
  source          TEXT NOT NULL,
  source_url      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS drug_ingredient (
  item_seq        TEXT NOT NULL REFERENCES drug(item_seq),
  ingredient      TEXT NOT NULL,      -- 목록에 적힌 주성분 이름 그대로
  nutrient        TEXT,               -- 영양제에도 흔한 성분이면 통일한 이름(예: 비타민B1), 아니면 NULL
  PRIMARY KEY (item_seq, ingredient)
);

CREATE TABLE IF NOT EXISTS drug_caution_rule (
  id                     INTEGER PRIMARY KEY,
  item_seq               TEXT NOT NULL REFERENCES drug(item_seq),
  counterpart            TEXT NOT NULL,  -- 통일한 이름(예: 알코올, 칼슘, 와파린)
  counterpart_raw        TEXT NOT NULL,  -- 원문 표현
  counterpart_type       TEXT NOT NULL,  -- drug / supplement_nutrient / food_drink / alcohol / caffeine / other
  relation               TEXT NOT NULL,  -- avoid / consult / separate_timing / duplicate_ingredient / caution
  effect                 TEXT,           -- 원문에 적힌 결과(없으면 빈칸)
  quote                  TEXT NOT NULL,  -- 근거 원문 문장(그대로)
  field                  TEXT NOT NULL,  -- 원문이 있던 항목: interactions / warning / precautions / usage / side_effects
  source_url             TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rule_counterpart ON drug_caution_rule (counterpart);
CREATE INDEX IF NOT EXISTS idx_ingredient_nutrient ON drug_ingredient (nutrient);
