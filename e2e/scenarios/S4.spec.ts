import { expect, test, type Locator } from "@playwright/test"
import { E2E_USER_EMAIL, E2E_USER_PASSWORD } from "../env"
import { listRows, logInFromHome, openCheckFromHome, register, searchAndPick } from "../helpers"

/** 철분을 더할 때 뜨는 경고 창: 맨 위 '시간을 띄워 드세요', 레보티록신 ↔ 철분, 칼슘 ↔ 철분 */
async function expectIronWarning(dialog: Locator): Promise<void> {
  await expect(dialog.getByRole("heading", { level: 3 })).toHaveText("시간을 띄워 드세요")
  const levo = dialog.getByTestId("warning-card").filter({ hasText: "레보티록신(갑상선약) ↔ 철분" })
  await expect(levo).toContainText("레보티록신과 최소 4시간 띄워 드세요")
  await expect(levo).toContainText("Levothyroxine (MedlinePlus)")
  const calcium = dialog.getByTestId("warning-card").filter({ hasText: "칼슘 ↔ 철분" })
  await expect(calcium).toBeVisible()
  await expect(calcium.getByRole("link", { name: "출처 보기" }).first()).toBeVisible()
  await expect(dialog).toContainText("복용을 바꾸기 전에 약사·의사와 상담하세요")
  for (const name of ["자세히", "그래도 추가", "취소"]) {
    await expect(dialog.getByRole(name === "자세히" ? "link" : "button", { name })).toBeVisible()
  }
}

test("S4 부모님 갑상선약과 칼슘을 목록에 넣어 둔 30~40대 자녀가, 사 드리려던 철분을 더해 보고 경고를 받는다", async ({ page }) => {
  await logInFromHome(page, E2E_USER_EMAIL, E2E_USER_PASSWORD)

  // 1~6. '검진하기' → '철분' 검색 → '철분' → 하루 1개 → '등록'
  await openCheckFromHome(page)
  await searchAndPick(page, "철분", "철분")
  await register(page, 1)
  const dialog = page.getByRole("dialog")
  await expectIronWarning(dialog)

  // 7. '취소'
  await dialog.getByRole("button", { name: "취소" }).click()
  await expect(dialog).toBeHidden()

  // 8~9. '등록'을 다시 누르면 같은 경고 → '취소'
  await page.getByRole("button", { name: "등록", exact: true }).click()
  await expectIronWarning(dialog)
  await dialog.getByRole("button", { name: "취소" }).click()
  await expect(dialog).toBeHidden()

  // 10. 메뉴의 '검진하기' → 철분은 없고 레보티록신과 칼슘만 있다
  await page.getByRole("navigation", { name: "주 메뉴" }).getByRole("link", { name: "검진하기" }).click()
  await expect(listRows(page)).toHaveCount(2)
  await expect(listRows(page).filter({ hasText: "레보티록신" })).toBeVisible()
  await expect(listRows(page).filter({ hasText: "칼슘" })).toBeVisible()
  await expect(listRows(page).filter({ hasText: "철분" })).toHaveCount(0)
})
