# 시드 데이터 규격 (앱 ↔ 데이터 작성자 계약)

앱은 처음 뜰 때 이 폴더의 JSON과 `data/drugs/otc_core.json`(자주 쓰는 일반의약품 58개, e약은요 원문·주성분·병용 주의 규칙)을 읽어 DB에 넣는다. 식약처 전체 품목 목록(저장소 루트의 `의약품_*.csv`)은 쓰지 않는다. **가상 페르소나와 사용자 흐름 S1~S7에 필요한 것만** 넣되, 조합 규칙과 기능성 문구는 모두 실제 출처에서 확인한 것만 넣는다.

판정에 쓰는 '대상'은 두 종류다.

- `drug`: `otc_core.json`의 일반의약품 한 품목. 참조 키는 `item_seq`(예: 비맥스제트정 `202300436`, 타이레놀정500밀리그람(아세트아미노펜) `202106092`).
- `substance`: 성분 하나. 영양제 성분(칼슘·철분·오메가3·비타민D …)과 처방약 성분(레보티록신 …)을 모두 여기 둔다. 참조 키는 영문 소문자 `id`.

## `substances.json`

```json
[
  {
    "id": "calcium",
    "name": "칼슘",
    "aliases": ["칼슘제", "탄산칼슘", "구연산칼슘", "calcium"],
    "kind": "nutrient",
    "is_vitamin": false,
    "recommendable": true,
    "function_claim": "뼈와 치아 형성과 유지에 필요 …(식약처 기능성 내용 원문 그대로)",
    "function_source_title": "건강기능식품의 기준 및 규격 — 칼슘 (식품의약품안전처)",
    "function_source_url": "https://…(실제로 열리고 위 문장이 있는 페이지)",
    "summary": "한 줄 설명(선택, 사실만)"
  }
]
```

- `kind`: `nutrient`(영양제 성분) 또는 `rx_ingredient`(처방약 성분).
- `is_vitamin`: 비타민이면 true.
- `recommendable`: 검진 후 '비타민 추천' 후보에 넣을지. true면 `function_claim`과 `function_source_url`이 **반드시** 있어야 한다(식약처 건강기능식품 기능성 내용 원문 그대로). 후보에 넣지 않으면 false이고 두 칸은 null.
- `nutrient_keys`: 문자열 배열. `data/drugs/drug_ingredient.csv`의 `nutrient` 열 표기 중 이 성분에 해당하는 것(예: `vitamin_b3` → `["비타민B3(나이아신)"]`, `calcium` → `["칼슘"]`). 앱이 "이미 드시는 약에 든 성분"을 추천 후보에서 빼는 데 쓴다. 해당 없으면 `[]`.
- `aliases`: 검색에 쓰는 다른 이름. 처방약 성분은 대표 제품 이름(예: 레보티록신 → 씬지로이드, 씬지록신)을 넣어 제품 이름으로 검색해도 찾히게 한다. 제품 이름을 넣을 때는 그 제품의 주성분이 맞는지 식약처 허가정보로 확인한다.
- 흐름에 꼭 필요한 성분: `levothyroxine`(레보티록신), `calcium`(칼슘), `iron`(철분), `omega3`(오메가3). 이름은 검색어와 같아야 한다: 검색 '레보티록신' → 결과 이름 '레보티록신', '칼슘' → '칼슘', '철분' → '철분', '오메가3' → '오메가3'.

## `interaction_rules.json`

```json
[
  {
    "id": "levothyroxine-calcium",
    "a": { "type": "substance", "ref": "levothyroxine" },
    "b": { "type": "substance", "ref": "calcium" },
    "relation": "separate_timing",
    "effect": "레보티록신 흡수 감소(약 20~25%)",
    "quote": "원문 문장 그대로(영문이면 영문 그대로)",
    "quote_ko": "원문이 영문일 때만 한국어 번역, 한국어 원문이면 null",
    "action": "원문이 말하는 행동 한 줄(함께 먹지 말 것 / 시간 띄우기 / 의사·약사와 상의)",
    "pharmacist_question": "약사에게 물을 질문 한 줄",
    "source_id": "R3",
    "source_title": "Absorption of Levothyroxine When Coadministered with Various Calcium Formulations (Thyroid, 2011)",
    "source_url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC3092723/",
    "source_kind": "paper",
    "verification": { "quote_in_source": true, "url_opens": true, "checked_on": "2026-10-29", "how": "PMC 본문에서 문장 확인" }
  }
]
```

- `a`·`b`: `{ "type": "drug", "ref": "<item_seq>" }` 또는 `{ "type": "substance", "ref": "<id>" }`. 약×약 조합은 넣지 않는다(범위 밖). 약×영양제, 처방약 성분×영양제, 영양제×영양제만.
- `relation`: `avoid`(함께 먹지 말 것) / `consult`(의사·약사와 상의) / `separate_timing`(시간 띄우기) / `caution`(그 밖의 주의).
- `quote`: 출처에 **글자 그대로** 있는 문장. 없는 문장을 만들지 않는다. e약은요 규칙은 `data/drugs/drug.csv`(또는 `otc_core.json`)의 원문 항목에 있는 문장을 쓴다.
- `source_id`: `docs/problem.yaml`의 R 번호가 있으면 그대로(R3, R7, R11). 새 출처는 `N1`, `N2` …로 번호를 붙이고 `data/seed/README.md`에 제목·URL을 적는다.
- `source_kind`: `mfds_easy_drug`(e약은요) / `mfds_approval`(식약처 허가사항) / `paper`(논문) / `other`.
- `verification`: 검증한 결과만 적는다. 확인하지 못한 규칙은 파일에 넣지 않는다.
- 흐름에 꼭 필요한 규칙 세 개: ① `drug 202300436`(비맥스제트정)×`calcium` — e약은요 "인산염, 칼슘염, … 함께 복용하지 마십시오"(R7). ② `levothyroxine`×`calcium` — R3. ③ `calcium`×`iron` — R11(과 철분제 e약은요 원문).
- `data/drugs/drug_caution_rule.csv`에서 `counterpart_type = supplement_nutrient`인 규칙(22개, 칼슘·철분·비타민E·비타민C·인산염)은 상대 성분이 `substances.json`에 있으면 그대로 옮긴다(인산염처럼 영양제 성분이 아닌 것은 뺀다).
- 흐름 S4는 `drug 202106092`(타이레놀정500밀리그람(아세트아미노펜))×`omega3`에 규칙이 **없어야** 한다.

## `personas.json` (가상 페르소나 데모 계정)

```json
[
  {
    "id": "P1",
    "display_name": "김영희(가상)",
    "email": "p1.parent@example.com",
    "profile": "갑상선약을 매일 먹는 58세 … (docs/personas.md와 같은 내용 요약)",
    "items": [
      { "type": "substance", "ref": "levothyroxine" },
      { "type": "substance", "ref": "calcium" },
      { "type": "drug", "ref": "202300436" }
    ],
    "first_check_done": true
  }
]
```

- 비밀번호는 파일에 적지 않는다. 앱이 환경변수 `SEED_PERSONA_PASSWORD`의 값으로 모든 페르소나 계정을 만들고, 값이 없으면 페르소나 계정을 만들지 않는다.
- `items`의 참조는 `substances.json`·`otc_core.json`에 있는 것만 쓴다.
- E2E용 `데모` 계정(비맥스제트정 하나, 첫 검진 완료)은 앱이 compose의 `SEED_USER_EMAIL`·`SEED_USER_PASSWORD`로 따로 만들므로 여기 넣지 않는다.

## `docs/personas.md`

페르소나 P1~P3의 상세. 모든 문장에 근거 표시를 붙인다: `docs/problem.yaml`의 R·E 번호, PRD 2.1의 T 번호, 또는 `[가정]`(근거 없는 설정 — 학생이 확인해야 함). 근거가 없는 수치는 적지 않는다.
