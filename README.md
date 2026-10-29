# sumtech2026

SUMTECH 2026 루프톤 팀 늘크크의 서비스 저장소예요.

약을 매일 먹는 부모님과 영양제를 사 드리는 자녀가 먹는 약과 영양제를 한 목록에 모으면, 같이 먹으면 위험한 조합(약×영양제, 영양제×영양제)을 묻지 않아도 식약처 원문·논문 근거와 함께 먼저 알려 주는 웹앱이에요. 약과 약 사이의 조합은 다루지 않고, 처방·복용 지시도 하지 않아요. 대회 버전은 개인 기준(가족 그룹은 다음 버전)이에요.

## 문서

- 문제 정의·기능 명세(F1~F6): `docs/problem.yaml`
- 제품 요구사항: `docs/PRD-약영양제-병용점검.md`
- 가상 페르소나와 데모 계정: `docs/personas.md`
- 사용자 핵심 흐름(S1~S7)·주 사용 플랫폼: `docs/scenarios.yaml`
- 일반의약품 데이터(e약은요 58개와 병용 주의 규칙): `data/drugs/README.md`
- 시드 데이터 규격과 출처(성분·조합 규칙·페르소나): `data/seed/CONTRACT.md`, `data/seed/README.md`
- 진행 기록: `progress.md`

## DB 구조

앱이 처음 뜰 때 표를 만들고 저장소의 시드 파일을 넣어요(`src/lib/schema.ts`, `src/lib/seed.ts`). 그래서 docker(빈 Postgres)와 배포(Supabase)에 같은 데이터가 들어가요. **Supabase SQL Editor에서 SQL을 따로 실행하지 않아요.**

| 표 | 내용 | 시드 파일 |
|---|---|---|
| `drug`, `drug_ingredient` | 약 제품 105개(팀원 축약본 104개 + 니코레트)와 주성분·함량, e약은요 원문 | `data/catalog/drugs.json`, `data/drugs/otc_core.json` |
| `health_food`, `health_food_ingredient` | 건강기능식품 100개와 원재료, 식약처 기능성 내용 | `data/catalog/health_foods.json` |
| `substance` | 성분 34개(칼슘·철분·레보티록신…) | `data/seed/substances.json` |
| `product_substance` | 제품 → 성분 연결 458개. 제품을 등록하면 이 성분으로 조합을 점검해요 | `data/catalog/product_substances.json` |
| `interaction_rule` | 원문 근거가 있는 조합 규칙 26개 + 팀원 조합 모음 121개(근거 329개) | `data/seed/interaction_rules.json`, `data/catalog/nutrient_interactions.json` |
| `rule_member` | 조합 모음 규칙의 양쪽에 걸리는 제품·성분 | `data/catalog/nutrient_interactions.json` |
| `app_user`, `user_item`, `recommendation` | 회원·복용 목록·추천 기록(앱이 만듦) | — |

같은 두 항목에 규칙이 여럿 걸리면 가장 무거운 경고 하나로 합치고 출처를 모아 보여 줘요. 팀원 SQL(`database/01_new_drug.sql`, `02_new_health_food.sql`, `03_new_nutrient_interaction.sql`)이 바뀌면 `node scripts/import_team_db.mjs`로 `data/catalog/`를 다시 만들어요. 원재료 → 성분 연결 결과는 `data/catalog/mapping_report.txt`에서 확인해요. `database/twopills_app.sql`은 이전 구조라 쓰지 않아요.

## 구성

- Next.js 16(App Router, TypeScript, Tailwind) + PostgreSQL. 로그인은 이메일·비밀번호(bcrypt)와 서명 쿠키(JWT).
- 앱이 처음 뜰 때 스키마를 만들고 `data/drugs/otc_core.json`·`data/seed/*.json`을 DB에 넣어요(`src/lib/seed.ts`). 위험 조합 판정은 DB 조회로만 해요.
- AI(Vercel AI Gateway, 환경변수 `AI_GATEWAY_API_KEY`)는 두 곳에만 써요: 사진에서 약·영양제 이름 읽기, 설문을 읽고 비타민 후보 중 고르기. 키가 없어도 앱은 뜨고 그 두 기능만 안내 문구를 보여 줘요.
- `GET /__health`: 시드가 끝나면 200과 `{ "releaseId": "<배포 commit>" }`, 끝나기 전에는 503.

주요 화면: `/`(소개) → `/signup`·`/login` → `/list`(내 목록) → `/add`(검색 추가)·`/add/photo`(사진 추가) → `/check`(검진 결과) → `/report`(복용 리포트)·`/recommend`(비타민 추천).

## 설치·실행

### docker (주최 측 실행·CI와 같은 방식)

```bash
docker compose up --build
```

빈 DB에서 앱·시드가 올라오면 http://localhost:3000 에서 열려요. 시드 계정은 `docker-compose.yml`의 `SEED_USER_EMAIL`·`SEED_USER_PASSWORD`(역할 `데모`)예요. 지우고 다시 시작하려면 `docker compose down -v`.

### 로컬 개발 (docker 없이)

```bash
npm install
```

```bash
npm run dev
```

`DATABASE_URL`이 없으면 내장 DB(PGlite, `.pglite/` 폴더)를 써요. 시드 계정을 만들려면 `.env.local`에 `SEED_USER_EMAIL`·`SEED_USER_PASSWORD`를 적어요(`.env.example` 참고).

검사: `npm run lint`, `npm run typecheck`, `npm run build`.

### 흐름 E2E

`e2e/`는 루트와 따로 설치하는 패키지예요. 앱을 띄운 뒤:

```bash
cd e2e && npm install && npx playwright install chromium && npx playwright test
```

## 환경변수

| 이름 | 용도 | 설정 위치 |
| ---- | ---- | --------- |
| `DATABASE_URL` | PostgreSQL 연결 주소. 없으면 로컬 내장 DB(PGlite) | docker-compose.yml, 배포 환경 |
| `RELEASE_ID` | 배포 commit SHA. `/__health`의 `releaseId` | docker 빌드 인자(compose), CI, 배포 환경 |
| `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` | E2E용 `데모` 시드 계정(첫 검진 완료, 비맥스제트정 보유) | docker-compose.yml(값 직접), 로컬 `.env.local` |
| `SEED_PERSONA_PASSWORD` | 가상 페르소나 데모 계정(`data/seed/personas.json`) 공통 비밀번호. 비우면 만들지 않음 | docker-compose.yml, 배포 환경(선택) |
| `SESSION_SECRET` | 로그인 쿠키 서명 키(16자 이상). 없으면 서버마다 임의 값 | docker-compose.yml(로컬 값), 배포 환경 |
| `AI_GATEWAY_API_KEY` | 서비스 AI 기능(사진 인식·비타민 추천) Vercel AI Gateway 키 | 로컬 `.env.local`, 배포 환경, GitHub Secrets |
| `AI_VISION_MODEL` / `AI_TEXT_MODEL` | AI 모델 식별자(선택). 비우면 코드 기본값 | 로컬 `.env.local`, 배포 환경 |
| `DATA_GO_KR_SERVICE_KEY` | 데이터 준비용: `scripts/fetch_easy_drug_api.py`가 공공데이터포털 e약은요 OpenAPI를 부를 때 쓰는 인증키(Decoding) | 로컬 `.env` |

비밀값은 저장소에 넣지 않아요. `.env.example`에는 이름만 있어요.
