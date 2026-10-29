import { expect, test } from "@playwright/test"
import { E2E_USER_EMAIL, E2E_USER_PASSWORD } from "../env"
import { listRows, logInFromHome, openCheckFromHome, register, searchAndPick } from "../helpers"

test("S2 칼슘을 먹는 20~30대가 피로회복용 비타민제(비맥스제트정)를 더하려다 식약처 원문 경고를 받는다", async ({ page }) => {
  // 시드 계정 `복용자`: 레보티록신·칼슘, 첫 검진을 마친 '사용 중' 상태
  await logInFromHome(page, E2E_USER_EMAIL, E2E_USER_PASSWORD)

  // 1~6. '검진하기' → '비맥스' 검색 → '비맥스제트정' → 하루 1개 → '등록'
  await openCheckFromHome(page)
  await searchAndPick(page, "비맥스", "비맥스제트정")
  await register(page, 1)

  // expected: 경고 창 맨 위 "함께 먹지 마세요", "비맥스제트정 ↔ 칼슘", 식약처 원문, 출처 제목, 약사에게 물을 질문, 상담 안내
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByRole("heading", { level: 3 })).toHaveText("함께 먹지 마세요")
  const card = dialog.getByTestId("warning-card").filter({ hasText: "비맥스제트정 ↔ 칼슘" })
  await expect(card).toBeVisible()
  await expect(card).toContainText("인산염, 칼슘염, 경구용 테트라사이클린계 제제, 제산제, 레보도파와 함께 복용하지 마십시오.")
  await expect(card).toContainText("비맥스제트정 e약은요")
  await expect(card).toContainText("약사에게 물어보세요")
  await expect(dialog).toContainText("복용을 바꾸기 전에 약사·의사와 상담하세요")

  // 7. 경고 창의 '취소' → 목록에 비맥스제트정이 없다
  await dialog.getByRole("button", { name: "취소" }).click()
  await expect(dialog).toBeHidden()
  await page.getByRole("navigation", { name: "주 메뉴" }).getByRole("link", { name: "검진하기" }).click()
  await expect(listRows(page).filter({ hasText: "레보티록신" })).toBeVisible()
  await expect(listRows(page).filter({ hasText: "비맥스제트정" })).toHaveCount(0)
})
