# 시드 데이터 (성분·조합 규칙·가상 페르소나)

앱이 처음 뜰 때 이 폴더의 JSON을 `data/drugs/otc_core.json`(자주 쓰는 일반의약품 58개)과 함께 DB에 넣는다(`src/lib/seed.ts`). 형식은 [CONTRACT.md](CONTRACT.md)를 따른다. **가상 페르소나와 흐름 S1~S7에 필요한 것만** 넣었고, 조합 규칙과 기능성 문구는 모두 실제 출처에서 확인한 것만 넣었다. 작성일은 2026-10-29다.

## 파일

| 파일 | 내용 | 개수 |
|---|---|---|
| `substances.json` | 성분 목록. 영양제 성분(`nutrient`)과 처방약 성분(`rx_ingredient`) | 34개(영양제 24, 처방약 10) |
| `interaction_rules.json` | 같이 먹을 때 조심할 조합. 원문 문장·출처·행동·약사에게 물을 질문 | 26개 |
| `personas.json` | 시연 계정: 가상 페르소나 P1~P3, 시나리오별 S1~S8. 상세는 [docs/personas.md](../../docs/personas.md) | 11개 |

- 조합 규칙 26개의 행동: 시간 띄우기(`separate_timing`) 10, 함께 먹지 말 것(`avoid`) 9, 의사·약사와 상의(`consult`) 6, 그 밖의 주의(`caution`) 1.
- 출처 종류: 식약처 e약은요 15, MedlinePlus(미국 국립의학도서관) 9, 논문 2.
- 비타민 추천 후보(`recommendable: true`): 24개. 비타민 13개(A, B1, B2, B3, B5, B6, B7, 엽산, B12, C, D, E, K), 무기질 6개(칼슘, 철분, 마그네슘, 아연, 셀레늄, 칼륨), 기능성 원료 5개(오메가3, 루테인, 유산균, 코엔자임Q10, 밀크씨슬).
- 페르소나 계정 비밀번호는 파일에 없다. 앱이 환경변수 `SEED_PERSONA_PASSWORD`의 값으로 세 계정을 만들고, 값이 없으면 만들지 않는다. E2E용 `데모` 계정은 `SEED_USER_EMAIL`·`SEED_USER_PASSWORD`로 따로 만든다.

## 출처

R 번호는 `docs/problem.yaml`의 sources와 같다. N 번호는 이번에 새로 쓴 출처다.

| 번호 | 출처 | 쓰인 규칙 |
|---|---|---|
| R3 | [Absorption of Levothyroxine When Coadministered with Various Calcium Formulations (Thyroid, 2011)](https://pmc.ncbi.nlm.nih.gov/articles/PMC3092723/) | 레보티록신 × 칼슘 |
| R6 | [식품의약품안전처_의약품개요정보(e약은요)](https://www.data.go.kr/data/15075057/openapi.do). 규칙마다 품목 페이지(`nedrug.mfds.go.kr/searchEasyDrug/easyDetail?itemSeq=…`) 링크를 단다 | 일반의약품 × 칼슘·철분·비타민E·비타민C 14개 |
| R7 | [비맥스제트정 e약은요](https://nedrug.mfds.go.kr/searchEasyDrug/easyDetail?itemSeq=202300436) | 비맥스제트정 × 칼슘 |
| R11 | [Calcium: effect of different amounts on nonheme- and heme-iron absorption in humans (Am J Clin Nutr, 1991)](https://agris.fao.org/search/en/records/65de38d263b8185d9ca7afd3) | 칼슘 × 철분 |
| N1 | [Levothyroxine: MedlinePlus Drug Information](https://medlineplus.gov/druginfo/meds/a682461.html) | 레보티록신 × 철분 |
| N2 | [Doxycycline: MedlinePlus Drug Information](https://medlineplus.gov/druginfo/meds/a682063.html) | 독시사이클린 × 칼슘·철분 |
| N3 | [Ciprofloxacin: MedlinePlus Drug Information](https://medlineplus.gov/druginfo/meds/a688016.html) | 시프로플록사신 × 칼슘·철분·아연 |
| N4 | [Levofloxacin: MedlinePlus Drug Information](https://medlineplus.gov/druginfo/meds/a697040.html) | 레보플록사신 × 철분·아연 |
| N5 | [Alendronate: MedlinePlus Drug Information](https://medlineplus.gov/druginfo/meds/a601011.html) | 알렌드론산 × 칼슘 |
| 기능성 문구 | 식품안전나라 '건강기능식품 원료별 정보' 게시판의 성분별 글(`function_source_url`)에 첨부된 「건강기능식품의 기준 및 규격」 개별 기준 PDF(2026-07 게시) | 추천 후보 24개의 `function_claim` |

## 어떻게 확인했나

1. **조합 규칙.** 조사 에이전트가 후보 30개를 모았다. 규칙마다 반박하려는 검증 에이전트가 따로 확인했다.
   - e약은요 규칙: `otc_core.json` 원문과 글자 대조, 행동 분류 대조, 품목 링크 형식 확인. 한 명이 세 가지를 모두 봤다.
   - 논문·MedlinePlus 규칙: 인용 대조, 분류·범위 대조, 출처 링크 확인을 서로 다른 세 명이 나눠 봤다.
   - 모두 통과한 것만 넣었다. 각 규칙의 `verification.how`에 검증자 판단을 줄여 적었다.
2. **기능성 문구.** 성분마다 식품안전나라 첨부 PDF를 내려받아 글자를 뽑고, `function_claim`의 문장이 PDF의 '기능성 내용'에 그대로 있는지 스크립트로 대조했다(2026-10-29). 24개 모두 맞았다.
   - 차이는 PDF에서 (가)(나) 번호와 쉼표가 따로 뽑히는 것뿐이다.
   - `function_claim`은 고시 표기대로 (가)(나)(다)(라) 번호를 쓴다.
3. **페르소나.** 작성 에이전트가 쓴 초안을 검토 에이전트가 `problem.yaml`·PRD 2.1 번호와 대조했고, 지적 8개를 반영했다. 재료에 없는 설정은 `docs/personas.md` 끝의 [가정] 표(A1~A18)에 모았다.
4. **정합성.** 세 JSON이 파싱되는지, 모든 `a`·`b`·`items` 참조가 `substances.json`이나 `otc_core.json`에 있는지 확인했다. 약×약 규칙이 없는지, 같은 조합이 둘인 규칙이 없는지도 봤다. 필수 규칙 세 개(비맥스제트정×칼슘, 레보티록신×칼슘, 칼슘×철분)는 있고, 타이레놀정500밀리그람×오메가3 규칙은 없다(흐름 S4).

## 빠진 것과 이유

| 후보 | 이유 |
|---|---|
| 시프로플록사신 × 마그네슘, 레보플록사신 × 마그네슘 | 원문은 '수산화마그네슘(제산제 성분)'만 말한다. 마그네슘 영양제 전체로 넓히는 것은 원문 범위를 넘는다(분류 검증 탈락). |
| 와파린 × 비타민K | 원문은 비타민K가 든 '음식'만 말하고 영양제는 말하지 않는다(분류 검증 탈락). |
| 로사르탄 × 칼륨 | 인용은 확인했지만 분류·링크 검증이 끝나지 않았다(검증 중 작업 한도로 중단). |
| 일반의약품 × 인산염 7개 | 인산염은 영양제 성분이 아니다. 같은 문장의 칼슘염 부분은 각 품목 × 칼슘 규칙으로 들어갔다. |
| 은행잎추출물 × 오메가3 | 공식 출처(NCCIH)는 항응고제와의 출혈 위험만 말하고 오메가3는 말하지 않는다. R14는 Q&A 답변이라 공식 출처가 아니다. |
| 레보플록사신 × 칼슘, 독시사이클린 × 마그네슘·아연 | MedlinePlus 원문에 해당 성분이 없거나 시간 단위가 빠져 있다. |
| 처방약 성분 식약처 허가사항 | 품목 검색이 폼 전송 방식이라 이번에 열지 못했다. 처방약 × 영양제 규칙은 MedlinePlus로만 확인했다. |

## 한계

- **원문에 없는 조합은 안전하다는 뜻이 아니다.** 앱은 규칙이 없을 때 "확인한 자료에서는 보고된 문제가 없어요. 걱정되면 약사에게 확인하세요"라고만 말한다.
- 처방약은 성분 10개(레보티록신, 와파린, 암로디핀, 로사르탄, 독시사이클린, 시프로플록사신, 레보플록사신, 알렌드론산, 은행잎추출물, 메트포르민)만 검색된다. 이 중 규칙이 있는 것은 레보티록신·독시사이클린·시프로플록사신·레보플록사신·알렌드론산 다섯 개다.
- MedlinePlus는 미국 자료다. 한국 허가사항과 문구가 다를 수 있다.
- 함량이 없어 과다 섭취(같은 성분 겹침)는 판정하지 않는다.
- 칼디원정(칼슘 제제)×칼슘, 볼그레액(철분 제제)×철분·칼슘 규칙은 '다른 칼슘제·철분제와 같이 먹는 것'을 뜻한다.

## AI 모델

서비스는 Vercel AI Gateway를 쓴다. 키는 환경변수 `AI_GATEWAY_API_KEY` 하나이고, 팀 전체 누적 한도는 $10이다. 2026-10-29에 [모델 목록](https://vercel.com/ai-gateway/models)과 [공개 카탈로그 JSON](https://ai-gateway.vercel.sh/v1/models)에서 확인했다.

| 용도 | 식별자 | 단가(입력/출력, $/1M 토큰) | 메모 |
|---|---|---|---|
| **사진 글자 읽기·설문 추천(기본값)** | `google/gemini-3.8-flash` | 0.75 / 3.75 | 2026-10-29 카탈로그의 최신 Gemini Flash. 이미지 입력·구조화 출력 지원. 추론 모델이라 추론 토큰이 출력 요금으로 붙는다. 두 용도를 한 모델로 쓴다(팀 결정, 2026-10-29). |
| 더 싼 대안 | `google/gemini-2.5-flash-lite` | 0.10 / 0.40 | 이미지 입력 지원. 예산이 빠듯하면 `AI_VISION_MODEL`·`AI_TEXT_MODEL`로 바꾼다. [모델 페이지](https://vercel.com/ai-gateway/models/gemini-2.5-flash-lite) |
| 대안(이미지) | `openai/gpt-4o-mini` | 0.15 / 0.60 | 추론 토큰 비용 없음. [모델 페이지](https://vercel.com/ai-gateway/models/gpt-4o-mini) |
| 대안(이미지·텍스트) | `anthropic/claude-haiku-5.5` | 0.10 / 0.50 | [모델 페이지](https://vercel.com/ai-gateway/models/claude-haiku-5.5) |
| 대안(텍스트, 가장 쌈) | `openai/gpt-5-nano` | 0.05 / 0.40 | 추론 모델이라 추론 토큰이 출력 요금으로 붙는다. [모델 페이지](https://vercel.com/ai-gateway/models/gpt-5-nano) |

- 기본값은 `src/lib/ai.ts`에 있고, 환경변수 `AI_VISION_MODEL`·`AI_TEXT_MODEL`로 바꿀 수 있다.
- 한국어 약 상자 글자 인식 품질은 아직 확인하지 않았다. 실제 사진 한두 장으로 소량 시험한 뒤 정한다.
- SDK 호출 방식: 저장소는 `ai@5`(5.0.282)를 쓴다.
  - `generateObject({ model: '<provider/model>', schema })`처럼 모델 문자열을 넘기면 Gateway로 가고, `AI_GATEWAY_API_KEY`는 자동으로 읽힌다.
  - 이미지는 메시지 content의 `{ type: 'image', image: <Uint8Array>, mediaType }` 파트로 넘긴다.
  - 근거: [AI Gateway × AI SDK 문서](https://vercel.com/docs/ai-gateway/sdks-and-apis/ai-sdk), [AI SDK 5 Gateway 프로바이더](https://ai-sdk.dev/v5/providers/ai-sdk-providers/ai-gateway), [AI SDK 5 프롬프트(이미지 파트)](https://ai-sdk.dev/v5/docs/foundations/prompts), [AI SDK 5 구조화 출력](https://ai-sdk.dev/v5/docs/ai-sdk-core/generating-structured-data).
- 한도를 넘으면 Gateway가 HTTP 402를 준다. 앱은 "AI 사용 예산이 부족해요"라고 안내한다.
