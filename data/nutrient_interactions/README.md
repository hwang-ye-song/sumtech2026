# 비타민·미네랄 병용 위해 조합 (184개)

비타민·미네랄을 다른 영양제나 의약품과 같이 먹으면 **약효가 떨어지거나, 독성·출혈이 늘거나, 영양소가 결핍·과잉되거나, 검사 결과가 틀어지는** 조합입니다. 조합마다 원인 성분, 기전, 국내 예시 제품, 예시 상황, 대처법, 근거 원문을 붙였습니다.

## 출처

- **식약처 원문**: 의약품안전나라 허가정보 '사용상의 주의사항'(처방약, 비타민·미네랄 일반의약품), 「건강기능식품의 기준 및 규격」 개정고시(제2020-92호) 섭취 시 주의사항, 식약처가 작성한 정책브리핑 기사
- **논문**: PubMed 원저(RCT, 약동학 연구, 증례보고)와 체계적 문헌고찰
- 보조: 미국 FDA 라벨(Niaspan)과 FDA 비오틴 검사 간섭 공지
- 2026-10-29에 조회했습니다. 블로그, 쇼핑몰, 언론 기사는 근거로 쓰지 않았습니다.

## 파일

| 파일 | 내용 |
| --- | --- |
| `schema.sql` | 테이블 정의 `nutrient_interaction`(조합)·`nutrient_interaction_source`(출처). PostgreSQL·SQLite 공통 |
| `seed.sql` | `schema.sql` 다음에 실행하면 조합 184개와 출처 469개가 모두 들어감. `scripts/build_nutrient_interaction_seed.py`가 `interactions.json`에서 만든다 |
| `interactions.json` | 원본. 조합 184개에 출처를 모두 담은 것(조합마다 `sources` 배열) |
| `interactions.csv` | 조합 184개, 한 행에 한 쌍. 대표 식약처 원문 1개와 PMID 목록이 함께 들어 있음 |
| `sources.csv` | 출처 469개, 한 행에 출처 하나: 종류, 제목, URL, 원문 문장, 대조 결과 |
| `_collection_meta.json` | 수집 영역별 행 수, 열리지 않았던 사이트, 못 다룬 조합 |

## DB에 넣기

SQLite로 확인하는 방법(`data/drugs`와 같은 DB에 넣어도 된다):

```bash
sqlite3 drugs.db < data/nutrient_interactions/schema.sql && sqlite3 drugs.db < data/nutrient_interactions/seed.sql
```

`interactions.json`을 고쳤으면 `python scripts/build_nutrient_interaction_seed.py`로 `seed.sql`을 다시 만든다.

`nutrient` 이름은 `data/drugs`의 `drug_ingredient.nutrient`와 같은 체계다(칼슘, 철분, 비타민B9(엽산), 비타민B3(나이아신) …). 그래서 일반의약품 성분과 바로 이어 붙일 수 있다.

```sql
-- 레보티록신(갑상선약)을 먹는 사람이 칼슘·철분을 추가할 때: 결과, 대처, 식약처 원문
SELECT i.nutrient, i.severity, i.relation, i.management, s.quote, s.url
FROM nutrient_interaction i
JOIN nutrient_interaction_source s ON s.interaction_id = i.id AND s.verified = 'quote_ok'
WHERE i.counterpart = '레보티록신' AND i.nutrient IN ('칼슘', '철분');

-- 일반의약품(data/drugs) 성분에 든 영양소가 걸리는 조합
SELECT d.item_name, di.nutrient, i.counterpart, i.harmful_effect
FROM drug d
JOIN drug_ingredient di ON di.item_seq = d.item_seq
JOIN nutrient_interaction i ON i.nutrient = di.nutrient;
```

영양제끼리는 한 쌍을 한 방향으로만 넣었다(예: 칼슘 × 철분은 `nutrient=칼슘`, `counterpart=철분`). 그래서 두 영양제를 점검할 때는 `nutrient`와 `counterpart`를 양쪽으로 다 찾는다.

## 열 (`interactions.csv`)

| 열 | 뜻 |
| --- | --- |
| `category` | 비타민-의약품 77 · 미네랄-의약품 69 · 비타민-비타민 12 · 미네랄-미네랄 11 · 검사수치간섭 7 · 비타민-미네랄 6 · 비타민-기타영양제 2 |
| `nutrient` | 문제 성분의 통일 이름(비타민K, 칼슘, 철분 …), `drug_ingredient.nutrient`와 같은 체계 |
| `nutrient_condition` | 문제가 되는 용량·형태(예: 하루 1 g 이상). 없으면 빈칸 |
| `counterpart` / `counterpart_class` | 상대 성분(약은 일반명) / 약효군 |
| `counterpart_type` | `drug` · `supplement_nutrient` · `lab_test` |
| `outcome_type` | 약효감소 61 · 영양소_흡수감소_결핍 55 · 영양소_과잉_독성 27 · 약효증가_독성 16 · 기타 13 · 검사결과왜곡 7 · 출혈위험 5 |
| `harmful_effect` | 같이 먹으면 생기는 나쁜 결과(출처에 있는 수치만) |
| `causal_ingredient` | 그 결과를 일으키는 성분이나 작용 주체(예: 칼슘 이온(Ca2+)이 약과 킬레이트) |
| `mechanism` | 기전 |
| `example_products` / `example_scenario` | 국내 예시 제품(약 상품명 / 영양제) / 한 줄 예시 상황 |
| `severity` | major 36 · moderate 97 · minor 51 |
| `relation` | separate_timing 62 · monitor 46 · caution 37 · consult 23 · avoid 16 (`data/drugs`의 relation과 같은 말에 `monitor`를 더함) |
| `management` | 대처법(시간 간격, INR·TSH 확인 등) |
| `evidence_level` | 식약처원문 136 · RCT/약동학연구 30 · 증례보고 9 · 리뷰/가이드라인 5 · 이론적 4 |
| `confidence` | high / medium / low |
| `mfds_quote` / `mfds_url` | 원문과 글자 그대로 맞는지 확인한 식약처 문장 1개와 그 주소 |
| `paper_pmids` | PubMed에서 실제로 있는 것을 확인한 논문 PMID |
| `found_by` | 이 조합을 찾은 수집 영역(여러 영역이 같은 조합을 찾았으면 모두 적음) |

## 만든 방법

1. AI 리서처 5명이 영역을 나눠 웹을 조사했습니다. ① 지용성 비타민 × 약, ② 수용성 비타민 × 약과 검사 간섭, ③ 영양제끼리, ④ 미네랄 × 약, ⑤ 식약처 문서 전수 스윕입니다. 식약처 원문과 논문을 우선으로 찾았습니다. 처음 모은 행은 244개입니다.
2. 같은 (성분, 상대) 쌍을 하나로 합쳐 184개가 됐습니다(54개는 2~3개 영역에서 겹쳐 찾음). 합칠 때 출처는 모두 모으고, 심각도는 가장 높은 것을 남겼습니다.
3. 스크립트로 근거를 원문과 직접 대조했습니다.
   - 식약처 허가정보: 품목 106개의 '사용상의 주의사항' 원문을 다시 받아 확인했습니다. 인용 문장 **241개가 모두 원문에 글자 그대로 있었습니다**(공백·문장부호는 무시). 링크는 모두 사람이 보는 의약품 상세 페이지(`getItemDetail?itemSeq=`)로 통일했습니다.
   - 논문: PubMed E-utilities로 확인했습니다. **PMID 179개가 모두 실제로 있었고 제목도 맞았습니다.** 인용 문장 184개는 초록에서 그대로 찾았습니다. 나머지 22개는 초록이 없거나 인용 문장이 없어 PMID만 확인했습니다.
   - 건강기능식품 고시(hwp 첨부), 정책브리핑, FDA 문서 17개는 스크립트로 대조하지 않았습니다.
4. 184개 중 178개는 확인된 식약처 원문이나 확인된 논문 중 하나 이상이 붙어 있습니다. 나머지 6개는 FDA 문서나 건강기능식품 고시 하나에만 근거합니다(나이아신 × 니트로글리세린·알로푸리놀·콜레스티라민·카테콜아민 검사, 크롬 × 메트포르민, 비오틴 × 트로포닌 검사).

## 예

- **칼슘 × 레보티록신**: 칼슘 이온이 약과 결합해 흡수를 줄입니다. 허가사항에 따라 칼슘제는 최소 4시간 간격을 둡니다.
- **비타민K × 와파린**: 비타민K가 응고인자를 활성화해 INR이 떨어지고 혈전 위험이 커집니다. 영양제를 시작하거나 끊을 때 INR을 다시 잽니다.
- **비타민E × 와파린**: 허가사항 문구는 "항응고제의 반응을 상승시킬 수 있다"이고, 출혈 위험이 늘어납니다.
- **칼륨 × 스피로놀락톤·ACE억제제·ARB(혈압약)**: 고칼륨혈증과 부정맥 위험이 있습니다.
- **비타민D·칼슘 × 히드로클로로티아지드(혈압약)**: 혈청 칼슘이 올라갑니다.
- **비타민B12 × 메트포르민**: B12 결핍이 생겨 매년 B12를 확인합니다.
- **철·칼슘·마그네슘 × 퀴놀론·테트라사이클린 항생제**: 킬레이트로 항생제 효과가 떨어집니다.
- **칼슘 × 철**: 칼슘 300~600 mg이 철 흡수를 50~60% 줄입니다.
- **아연 × 구리**: 아연을 고용량으로 오래 먹으면 구리 결핍(빈혈, 신경 손상)이 생깁니다.
- **엽산 × 비타민B12 결핍**: 엽산이 빈혈만 고쳐 B12 결핍을 가립니다.
- **비오틴 × 갑상선·트로포닌 혈액검사**: 검사 결과가 틀어집니다.

## 한계

- **여기 없는 조합을 "안전하다"고 말할 수 없습니다.** 5개 영역에서 시간 안에 찾은 것만 들어 있습니다.
- 「건강기능식품의 기준 및 규격」은 제2020-92호 개정분만 원문을 봤습니다. 현행 고시 전체의 영양성분별 '섭취 시 주의사항'은 확인하지 못했습니다(law.go.kr 본문이 JS 로딩이고 첨부가 hwp임).
- 한국인 영양소 섭취기준의 상한섭취량은 아연·비타민A·비타민C·셀레늄만 원문을 확인했습니다. 비타민D·B6·나이아신·엽산·철 등은 확인하지 못했습니다.
- NIH ODS 팩트시트는 접근이 막혀(HTTP 403) 쓰지 못했습니다.
- 비타민B2·판토텐산은 약물 상호작용 근거를 찾지 못했습니다. 셀레늄 × 항응고제, 구리·망간 × 의약품, 이뇨제로 인한 마그네슘·칼륨 결핍은 다루지 않았습니다.
- 행마다 `confidence`가 있습니다. `low`(이론적, 증례 수준)는 경고 문구를 약하게 쓰는 게 맞습니다.
- `example_products`의 상품명은 리서처가 의약품안전나라 검색으로 찾은 예시입니다. 실제 성분 함량까지 맞춘 것은 아닙니다.
- 환자의 질병·나이·임신 같은 상태는 `notes`와 `harmful_effect`에 글로만 적었고, 따로 열로 나누지 않았습니다.
