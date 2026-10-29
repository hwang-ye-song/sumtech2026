import { expect, test } from "@playwright/test"
import { E2E_USER_EMAIL, E2E_USER_PASSWORD } from "../env"
import { logInFromHome, startCheckFromHome } from "../helpers"

test("S6 50~60대 부모님이 검진 결과에서 비타민 추천을 받고, 드시는 약과 부딪히는 성분은 추천이 아닌 경고로 본다", async ({ page }) => {
  await logInFromHome(page, E2E_USER_EMAIL, E2E_USER_PASSWORD)

  // 1. 홈에서 '검진하기' (바로 점검하고 리포트로 간다)
  await startCheckFromHome(page)

  // 2. 리포트 맨 아래의 '영양제 추천받기'
  await page.getByRole("main").getByRole("link", { name: "영양제 추천받기" }).click()

  // 설문은 '현재 겪는 증상'과 '개선하고 싶은 점' 두 가지뿐이다(성별·나이·키·몸무게는 묻지 않는다)
  await expect(page.getByRole("group", { name: "성별" })).toHaveCount(0)
  await expect(page.getByRole("slider")).toHaveCount(0)

  // 3. '현재 겪는 증상'에서 '쉽게 피곤함'
  await page.getByRole("group", { name: "현재 겪는 증상" }).getByRole("button", { name: "쉽게 피곤함" }).click()

  // 4. '개선하고 싶은 점'은 최대 2개: 2개를 고르면 나머지는 눌리지 않는다. '면역력'을 풀고 '피로 회복'만 남긴다
  const goals = page.getByRole("group", { name: "개선하고 싶은 점" })
  await expect(page.getByRole("heading", { name: /개선하고 싶은 점.*최대 2개/ })).toBeVisible()
  await goals.getByRole("button", { name: "피로 회복" }).click()
  await goals.getByRole("button", { name: "면역력" }).click()
  await expect(goals.getByRole("button", { name: "눈 건강" })).toBeDisabled()
  await goals.getByRole("button", { name: "면역력" }).click()

  // 5. '추천 보기' (AI 응답을 기다린다)
  await page.getByRole("button", { name: "추천 보기" }).click()

  // expected: 화면이 결과 맨 위로 올라가고, 추천 비타민 최대 3개와 추천 이유·효과 문장의 출처 링크
  const ok = page.getByTestId("rec-ok")
  await expect(ok).toBeVisible({ timeout: 60_000 })
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  const recs = ok.getByTestId("recommendation")
  const n = await recs.count()
  expect(n).toBeGreaterThan(0)
  expect(n).toBeLessThanOrEqual(3)
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
