# sumtech2026

SUMTECH 2026 루프톤 팀 늙크크의 서비스 저장소예요.

약을 매일 먹는 부모님과 영양제를 사 드리는 자녀가 먹는 약과 영양제를 한 목록에 모으면, 같이 먹으면 위험한 조합(약×영양제, 영양제×영양제)을 묻지 않아도 식약처 원문·논문 근거와 함께 먼저 알려 주는 웹앱이에요. 약과 약 사이의 조합은 다루지 않고, 처방·복용 지시도 하지 않아요. 대회 버전은 개인 기준(가족 그룹은 다음 버전)이에요.

## 구현 설계

### 누가, 언제 쓰나요

- **20~30대**: 영양제를 먹다가 감기약·처방약이 생겼을 때, 같이 먹어도 되는지 확인해요.
- **30~40대 자녀**: 부모님께 영양제를 사 드리기 전에 부모님 약과 영양제를 내 목록에 넣고 점검해요.
- **50~60대 부모님**: 밥 먹고 약과 영양제를 한꺼번에 드시는 분이 약 상자 사진으로 등록해요.

### 핵심 흐름

빈 목록 → 검색이나 사진으로 약·영양제 등록(처음엔 경고 없이 넣어요) → **'검진하기'** 로 목록 전체를 한 번에 점검 → 리포트에서 주의할 조합·하루 기준량 초과·약사에게 물을 질문 확인 → 그 뒤로는 새로 더할 때마다 넣기 전에 자동으로 경고 → '자세히'에서 원문과 출처 확인 → 복용 간격을 지키거나, 걱정되면 리포트에 적힌 질문으로 약사와 상의. 필요하면 설문으로 내 약과 부딪히지 않는 비타민을 추천받아요.

### 저장하는 것과 볼 수 있는 사람

| 기능 | 저장하는 것 | 읽기·바꾸기 |
|---|---|---|
| 회원가입·로그인(F1) | 이메일, 비밀번호(bcrypt), 건강 정보·사진 AI 판독 동의 시각, 첫 검진 시각 | 본인만 |
| 등록·자동 점검(F2·F3) | 내 목록의 항목, 하루에 먹는 개수, 한 알 함량(mg) | 본인만. 다른 사람 목록은 못 봐요 |
| 검진 리포트(F4) | 따로 저장하지 않고 열 때마다 목록으로 다시 만들어요 | 본인만 |
| 영양제 추천(F5) | 설문과 추천 결과 | 본인만 |
| 약·성분·조합 규칙과 출처 | 시드 파일(`data/`)에서 넣은 기준 데이터 | 누구나 읽기(F6), 바꾸는 건 팀만(저장소 커밋) |

건강 정보(복용 목록)와 사진 AI 판독은 가입할 때 필수 체크로 한 번 동의를 받고, 동의한 시각을 저장해요. 사진은 AI로 글자만 읽고 저장하지 않아요. 사진 칸 아래에 이 안내가 늘 보이고, 사진을 골라야만 보내요.

### 잘못 넣었거나 실패했을 때

- '하루에 먹는 개수'가 비었거나 1~20이 아니면, '한 알 함량'이 숫자가 아니면 등록하지 않고 이유를 보여 줘요.
- 이미 목록에 있는 항목은 다시 넣지 않고 알려 줘요. 찾는 제품이 없으면 성분 이름으로 찾아보라고 안내해요.
- 흐린 사진은 "다시 찍어 주세요"를 보여 주고, 사진에서 찾은 후보는 사람이 골라야 등록돼요.
- 걸리는 조합 규칙이 없으면 "확인한 자료에서는 보고된 문제가 없어요"라고만 하고 '안전하다'고 말하지 않아요.
- AI 키가 없거나 AI 호출이 실패해도 앱은 떠요. 사진 등록은 안내 문구를 보여 주고, 추천은 설문과 기능성 내용이 맞는 후보로 골라요.

### 완료 조건

기능별 완료 조건은 `docs/problem.yaml`의 `features[].done`(F1~F6)에, 화면에서 확인할 결과는 `docs/scenarios.yaml`의 `expected`(S1~S8)에 적었어요. 예를 들어 칼슘이 있는 목록에 비맥스제트정을 더하면 넣기 전에 "함께 먹지 마세요"와 식약처 원문이 뜨고, '취소'하면 목록에 들어가지 않아야 해요.

### 로그인과 역할

목록이 사람마다 따로 남아야 해서 로그인이 필요해요(이메일·비밀번호). 역할은 하나, `복용자`예요. 자녀가 부모님 목록을 같이 보는 가족 그룹은 권한과 개인정보를 먼저 정해야 해서 다음 버전으로 미뤘어요.

### 첫 화면

로그인하지 않은 사람이 `/`에서 보는 것: 서비스 이름 TwoPills, "약과 영양제를 함께 먹을 때 해로운 조합을 출처와 함께 알려 줘요", 경고 예시 한 장, 처방이나 진단을 하지 않는다는 안내, '회원가입'·'로그인' 버튼. 로그인 없이 '약·영양제 알아보기'도 열 수 있어요.

### 주 사용 플랫폼

`desktop`. 데모와 주최 측 실행은 PC 웹 화면 기준이에요. 복용 목록·검진 리포트·근거 원문을 한 화면에 넓게 펼쳐 보여 주는 장면이 중심이라서요. 휴대폰 폭(375px)에서도 화면이 넘치지 않고, 로그인 뒤 메뉴는 화면 아래 탭 바로 바뀌어요. 다만 흐름 검증(S1~S8)은 PC 화면으로만 해요. 기본은 어두운 화면이고, 밝은 화면이 편한 분은 머리글의 해·달 버튼으로 화이트 모드를 켤 수 있어요(이 브라우저에 기억해요).

### 우선순위, 뺀 것, 아직 확인 못 한 것

- **먼저 만든 것**: 등록 → 검진 → 자동 경고 → 근거 확인. 그다음 사진 등록과 비타민 추천.
- **뺀 것**: 약끼리 조합(병원·약국 DUR이 이미 봐요), 처방·복용 지시, 특정 제품 추천(제품 데이터와 추천 기준이 부족해요).
- **다음 버전**: 가족 그룹, 휴대폰 화면 흐름 검증.
- **아직 확인 못 한 것**: 부모님이 직접 목록을 만들고 계속 관리할 수 있는지, 약사가 리포트를 실제로 쓸모 있다고 보는지, 사진 인식이 얼마나 정확한지.

### AI는 어디에 쓰나요

두 곳에만 써요: 사진에서 약·영양제 이름 읽기, 설문을 읽고 DB 후보 안에서 비타민 고르기. **위험한 조합인지 판정하는 데는 AI를 쓰지 않고** 출처를 확인한 DB로만 해요. 그래서 같은 목록은 몇 번을 점검해도 같은 결과가 나와요.

## 문서

- 문제 정의·기능 명세(F1~F6): `docs/problem.yaml`
- 가상 페르소나와 데모 계정: `docs/personas.md`
- 사용자 핵심 흐름(S1~S8)·주 사용 플랫폼: `docs/scenarios.yaml`
- 일반의약품 데이터(e약은요 58개와 병용 주의 규칙): `data/drugs/README.md`
- 시드 데이터 규격과 출처(성분·조합 규칙·페르소나): `data/seed/CONTRACT.md`, `data/seed/README.md`
- 진행 기록: `progress.md`

## DB 구조

앱이 처음 뜰 때 표를 만들고 저장소의 시드 파일을 넣어요(`src/lib/schema.ts`, `src/lib/seed.ts`). 그래서 docker(빈 Postgres)와 배포(Supabase)에 같은 데이터가 들어가요. **Supabase SQL Editor에서 SQL을 따로 실행하지 않아요.**

| 표 | 내용 | 시드 파일 |
|---|---|---|
| `drug`, `drug_ingredient` | 약 제품 1,003개(팀원 DB `database/01_new_drug.sql`)와 주성분·함량, e약은요 원문 | `data/catalog/drugs.json`, `data/drugs/otc_core.json` |
| `health_food`, `health_food_ingredient` | 건강기능식품 1,000개와 원재료, 식약처 기능성 내용 | `data/catalog/health_foods.json` |
| `substance` | 성분 36개(칼슘·철분·레보티록신…) | `data/seed/substances.json` |
| `product_substance` | 제품 → 성분 연결 4,991개. 제품을 등록하면 이 성분으로 조합을 점검해요 | `data/catalog/product_substances.json` |
| `interaction_rule` | 원문 근거가 있는 조합 규칙 28개 + 팀원 조합 모음 156개 | `data/seed/interaction_rules.json`, `data/catalog/nutrient_interactions.json` |
| `rule_member` | 조합 모음 규칙의 양쪽에 걸리는 제품·성분 | `data/catalog/nutrient_interactions.json` |
| `app_user`, `user_item`, `recommendation` | 회원·복용 목록·추천 기록(앱이 만듦) | — |

같은 두 항목에 규칙이 여럿 걸리면 가장 무거운 경고 하나로 합치고 출처를 모아 보여 줘요. 팀원 SQL(`database/01_new_drug.sql`, `02_new_health_food.sql`, `03_new_nutrient_interaction.sql`)이 바뀌면 `node scripts/import_team_db.mjs`로 `data/catalog/`를 다시 만들어요. 원재료 → 성분 연결 결과는 `data/catalog/mapping_report.txt`에서 확인해요. `database/twopills_app.sql`은 이전 구조라 쓰지 않아요.

## 구성

- Next.js 16(App Router, TypeScript, Tailwind) + PostgreSQL. 로그인은 이메일·비밀번호(bcrypt)와 서명 쿠키(JWT).
- 앱이 처음 뜰 때 스키마를 만들고 `data/drugs/otc_core.json`·`data/seed/*.json`을 DB에 넣어요(`src/lib/seed.ts`). 위험 조합 판정은 DB 조회로만 해요.
- AI(Vercel AI Gateway, 환경변수 `AI_GATEWAY_API_KEY`)는 두 곳에만 써요: 사진에서 약·영양제 이름 읽기, 설문을 읽고 비타민 후보 중 고르기. 키가 없어도 앱은 뜨고 그 두 기능만 안내 문구를 보여 줘요.
- `GET /__health`: 시드가 끝나면 200과 `{ "releaseId": "<배포 commit>" }`, 끝나기 전에는 503.

주요 화면: `/`(소개) → `/signup`·`/login` → `/list`(복용 목록: 검색·사진 등록) → `/check`(검진, 끝나면 `/check/report` 검진 리포트) → `/rules/[id]`(근거 자세히) → `/recommend`(비타민 추천). `/explore`(약·영양제 알아보기)는 로그인 없이 열려요. 예전 주소 `/add`·`/add/photo`·`/report`는 새 화면으로 넘겨 줘요.

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
| `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` | E2E용 `데모` 시드 계정(첫 검진 완료, 레보티록신·칼슘 보유) | docker-compose.yml(값 직접), 로컬 `.env.local` |
| `SEED_PERSONA_PASSWORD` | 가상 페르소나 데모 계정(`data/seed/personas.json`) 공통 비밀번호. 비우면 만들지 않음 | docker-compose.yml, 배포 환경(선택) |
| `SESSION_SECRET` | 로그인 쿠키 서명 키(16자 이상). 없으면 서버마다 임의 값 | docker-compose.yml(로컬 값), 배포 환경 |
| `AI_GATEWAY_API_KEY` | 서비스 AI 기능(사진 인식·비타민 추천) Vercel AI Gateway 키 | 로컬 `.env.local`, 배포 환경, GitHub Secrets |
| `AI_VISION_MODEL` / `AI_TEXT_MODEL` | AI 모델 식별자(선택). 비우면 코드 기본값 | 로컬 `.env.local`, 배포 환경 |
| `DATA_GO_KR_SERVICE_KEY` | 데이터 준비용: `scripts/fetch_easy_drug_api.py`가 공공데이터포털 e약은요 OpenAPI를 부를 때 쓰는 인증키(Decoding) | 로컬 `.env` |

비밀값은 저장소에 넣지 않아요. `.env.example`에는 이름만 있어요.
