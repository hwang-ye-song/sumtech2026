-- 비타민·미네랄을 다른 영양제·의약품과 같이 먹을 때 나빠지는 조합과 그 근거를 담는 테이블.
-- PostgreSQL·SQLite 둘 다에서 돌아가는 문법만 쓴다. data/drugs/schema.sql과 따로 실행해도 된다.

CREATE TABLE IF NOT EXISTS nutrient_interaction (
  id                  INTEGER PRIMARY KEY,
  category            TEXT NOT NULL,  -- 비타민-의약품 / 미네랄-의약품 / 비타민-비타민 / 비타민-미네랄 / 미네랄-미네랄 / 비타민-기타영양제 / 검사수치간섭
  nutrient            TEXT NOT NULL,  -- 문제 성분, drug_ingredient.nutrient와 같은 이름(예: 칼슘, 철분, 비타민B9(엽산))
  nutrient_condition  TEXT,           -- 문제가 되는 용량·형태(예: 하루 1 g 이상). 없으면 NULL
  counterpart         TEXT NOT NULL,  -- 상대: 약은 일반명(예: 레보티록신), 영양소는 nutrient와 같은 이름, 검사는 검사명
  counterpart_class   TEXT,           -- 약효군·분류(예: 갑상선호르몬제)
  counterpart_type    TEXT NOT NULL,  -- drug / supplement_nutrient / lab_test
  outcome_type        TEXT NOT NULL,  -- 약효감소 / 약효증가_독성 / 영양소_흡수감소_결핍 / 영양소_과잉_독성 / 출혈위험 / 검사결과왜곡 / 기타
  harmful_effect      TEXT NOT NULL,  -- 같이 먹으면 생기는 나쁜 결과(출처에 있는 수치만)
  causal_ingredient   TEXT NOT NULL,  -- 그 결과를 일으키는 성분·작용 주체
  mechanism           TEXT NOT NULL,
  example_products    TEXT,           -- 국내 예시 제품(약 상품명 / 영양제)
  example_scenario    TEXT,           -- 한 줄 예시 상황
  severity            TEXT NOT NULL,  -- major / moderate / minor
  relation            TEXT NOT NULL,  -- avoid / consult / separate_timing / caution / monitor (drug_caution_rule.relation에 monitor를 더함)
  management          TEXT,           -- 대처법(시간 간격, INR·TSH 확인 등)
  evidence_level      TEXT NOT NULL,  -- 식약처원문 / RCT/약동학연구 / 증례보고 / 리뷰/가이드라인 / 이론적
  confidence          TEXT NOT NULL,  -- high / medium / low
  notes               TEXT
);

CREATE TABLE IF NOT EXISTS nutrient_interaction_source (
  id               INTEGER PRIMARY KEY,
  interaction_id   INTEGER NOT NULL REFERENCES nutrient_interaction(id),
  kind             TEXT NOT NULL,  -- 식약처_의약품허가 / 식약처_건강기능식품 / 식약처_기타 / 논문 / 해외정부기관
  title            TEXT NOT NULL,
  url              TEXT NOT NULL,
  pmid             TEXT,           -- 논문 PMID(숫자만), 없으면 NULL
  doi              TEXT,
  quote            TEXT,           -- 근거 원문 문장(식약처는 글자 그대로, 논문은 초록 한 문장)
  verified         TEXT NOT NULL   -- quote_ok(식약처 원문 일치) / pmid_ok_quote_ok(PMID·초록 일치) / pmid_ok / no_pmid / skipped(스크립트 대조 안 함)
);

CREATE INDEX IF NOT EXISTS idx_ni_nutrient ON nutrient_interaction (nutrient);
CREATE INDEX IF NOT EXISTS idx_ni_counterpart ON nutrient_interaction (counterpart);
CREATE INDEX IF NOT EXISTS idx_nis_interaction ON nutrient_interaction_source (interaction_id);

-- 과다 섭취 판정(F4·F5)에 쓰는 성분별 하루 기준량. 출처 원문에 숫자가 있는 것만 넣는다.
-- 앱은 나이를 받지 않으므로 같은 성분의 기준 중 가장 낮은 값으로 판정하고, 행 전체를 화면에 보여 준다.
CREATE TABLE IF NOT EXISTS nutrient_daily_limit (
  id            INTEGER PRIMARY KEY,
  nutrient      TEXT NOT NULL,  -- nutrient_interaction.nutrient와 같은 이름(예: 칼슘, 아연)
  limit_type    TEXT NOT NULL,  -- upper(상한섭취량) / mfds_label(식약처 허가 문구의 1일 기준)
  age_group     TEXT NOT NULL,  -- 출처에 적힌 연령 구간 그대로(예: 19~50세, 50세 초과, 성인)
  amount        REAL NOT NULL,  -- 하루 기준량(영양소 자체의 양. 화합물 무게 아님)
  unit          TEXT NOT NULL,  -- drug_ingredient.unit과 같은 표기: 밀리그램 / 마이크로그램 / 아이.유
  source_title  TEXT NOT NULL,
  source_url    TEXT NOT NULL,
  quote         TEXT            -- 근거 원문 문장. 원문을 확인하지 못했으면 NULL
);

-- drug_ingredient.ingredient_name → 영양소. 여기 있는 성분만 합산한다(이름 LIKE 검색 금지: 로수바스타틴칼슘·판토텐산칼슘이 칼슘으로 잡힘).
CREATE TABLE IF NOT EXISTS nutrient_ingredient_map (
  ingredient_name  TEXT PRIMARY KEY,  -- drug_ingredient.ingredient_name 그대로
  nutrient         TEXT NOT NULL,     -- nutrient_daily_limit.nutrient와 같은 이름
  elemental_ratio  REAL,              -- 화합물 무게 중 영양소 비율(예: 탄산칼슘 0.400). 모르면 NULL → 판정하지 않음
  notes            TEXT
);

CREATE INDEX IF NOT EXISTS idx_ndl_nutrient ON nutrient_daily_limit (nutrient);
CREATE INDEX IF NOT EXISTS idx_nim_nutrient ON nutrient_ingredient_map (nutrient);
