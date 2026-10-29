import { expect, test } from "@playwright/test"
import { E2E_USER_EMAIL, E2E_USER_PASSWORD } from "../env"
import { logInFromHome } from "../helpers"

test("S2 사용 중인 사람이 비타민제를 먹다가 칼슘을 새로 추가하면 바로 식약처 원문 경고를 받는다", async ({ page }) => {
  // 시드 계정 `데모`: 첫 검진을 마친 '사용 중' 상태, 목록에 비맥스제트정
  await logInFromHome(page, E2E_USER_EMAIL, E2E_USER_PASSWORD)
  await expect(page.getByRole("listitem").filter({ hasText: "비맥스제트정" })).toBeVisible()

  // 1~3. '약·영양제 추가' → 검색창 '칼슘' → '칼슘'의 '추가'
  await page.getByRole("link", { name: "약·영양제 추가" }).click()
  await page.getByRole("searchbox", { name: "검색창" }).fill("칼슘")
  await page.getByRole("button", { name: "칼슘 추가", exact: true }).click()

  // expected: 검진하기를 누르지 않아도 경고가 뜨고, 비맥스제트정의 "칼슘염" "함께 복용하지 마십시오" 원문, 식약처 e약은요 출처 링크, 약사에게 물을 질문
  await expect(page.getByRole("heading", { name: "내 목록" })).toBeVisible()
  const card = page.getByTestId("warning-card").filter({ hasText: "비맥스제트정" }).filter({ hasText: "칼슘" })
  await expect(card).toBeVisible()
  await expect(card).toContainText("칼슘염")
  await expect(card).toContainText("함께 복용하지 마십시오")
  await expect(card.getByRole("link", { name: "식약처 e약은요 원문 보기" })).toBeVisible()
  await expect(card).toContainText("약사에게 물어보세요")
})
