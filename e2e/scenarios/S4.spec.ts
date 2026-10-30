import { expect, test } from "@playwright/test"

test("S4 갑상선약을 드시는 50~60대 부모님이 자녀가 사 드리려는 철분을, 가입·로그인 없이 '약·영양제 알아보기'에서 먼저 찾아 드시는 약과 맞는지 확인한다", async ({ page }) => {
  await page.goto("/")

  // 1. 첫 화면 위쪽 메뉴의 '약·영양제 알아보기' (로그인하지 않은 상태)
  await page.getByRole("navigation", { name: "주 메뉴" }).getByRole("link", { name: "약·영양제 알아보기" }).click()

  // 2. '철분' 검색 → '찾기'
  await page.getByLabel("제품명·성분·흔히 부르는 이름").fill("철분")
  await page.getByRole("button", { name: "찾기" }).click()

  // 3. 결과 맨 위 '철분' 성분 항목을 펼친다
  const card = page.getByTestId("ex-card").first()
  await expect(card.locator(".ex-row-name")).toHaveText("철분")
  await expect(card).toContainText(/주의 \d+건/)
  await card.locator("summary").click()

  // expected: 레보티록신 ↔ 철분, 할 일, 출처 링크, 처방·진단이 아니라는 안내
  const levo = card.getByTestId("ex-warn").filter({ hasText: "레보티록신(갑상선약) ↔ 철분" })
  await expect(levo).toContainText("시간 간격을 두고 드세요")
  await expect(levo).toContainText("레보티록신과 최소 4시간 간격을 두고 드세요")
  await expect(levo.getByRole("link", { name: "Levothyroxine (MedlinePlus)" })).toBeVisible()
  await expect(page.getByRole("main")).toContainText("이 화면은 처방이나 진단이 아니에요")

  // 4. '내 목록에 더하기' → 로그인 화면
  await card.getByRole("link", { name: "내 목록에 더하기" }).click()
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole("heading", { level: 2, name: "로그인" })).toBeVisible()
  await expect(page.getByTestId("login-required")).toContainText("로그인이 필요한 화면이에요.")
})
