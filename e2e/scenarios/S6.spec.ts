import { expect, test } from "@playwright/test"
import { E2E_USER_EMAIL, E2E_USER_PASSWORD } from "../env"
import { logInFromHome, startCheckFromHome } from "../helpers"

test("S6 30~40대 자녀가 부모님 검진 리포트에서 비타민 추천을 받고, 부모님 약과 부딪히는 성분은 추천이 아닌 경고로 본다", async ({ page }) => {
  await logInFromHome(page, E2E_USER_EMAIL, E2E_USER_PASSWORD)

  // 1~2. 홈에서 '검진하기' → '검진 시작'
  await startCheckFromHome(page)

  // 3. 리포트 맨 아래의 '영양제 추천받기'
  await page.getByRole("main").getByRole("link", { name: "영양제 추천받기" }).click()

  // 4~6. '피로' · '1알' → '추천 보기' (AI 응답을 기다린다)
  await page.getByRole("checkbox", { name: "피로" }).check()
  await page.getByRole("radio", { name: "1알" }).check()
  await page.getByRole("button", { name: "추천 보기" }).click()

  // expected: 추천 1개(하루 1알), 추천 이유와 효과 문장의 출처 링크
  const ok = page.getByTestId("rec-ok")
  await expect(ok).toBeVisible({ timeout: 60_000 })
  await expect(ok.getByRole("heading", { name: "추천 (하루 1알)" })).toBeVisible()
  const recs = ok.getByTestId("recommendation")
  await expect(recs).toHaveCount(1)
  await expect(recs.first()).toContainText("왜 골랐나요:")
  await expect(recs.first().getByRole("link", { name: "출처 보기" })).toBeVisible()

  // '추천' 칸에는 레보티록신·칼슘과 부딪히는 철분이 없다. 나오면 '주의' 칸에 경고와 출처 링크로 보인다
  await expect(ok).not.toContainText("철분")
  const cautions = page.getByTestId("caution")
  for (const c of await cautions.all()) await expect(c.getByRole("link", { name: "출처 보기" }).first()).toBeVisible()

  // 상담 안내가 보이고, 제품명·구매 링크는 없다
  await expect(page.getByTestId("rec-disclaimer-bottom")).toHaveText("이 추천은 진단이나 처방이 아니에요. 새로 드시기 전에 약사·의사와 상담하세요")
  await expect(page.getByRole("link", { name: /구매|사러 가기|바로가기/ })).toHaveCount(0)
})
