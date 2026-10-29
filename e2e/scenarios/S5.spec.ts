import { expect, test } from "@playwright/test"
import { addBySearch, signUpFromHome } from "../helpers"

test("S5 검진을 마친 사람이 약사에게 보여 줄 복용 리포트를 연다", async ({ page }) => {
  // 1~2. 회원가입
  await signUpFromHome(page, "s5")

  // 3~5. '약·영양제 추가' → '비맥스' → '비맥스제트정'의 '추가'
  await addBySearch(page, "비맥스", "비맥스제트정")

  // 6~8. '약·영양제 추가' → '칼슘' → '칼슘'의 '추가'
  await addBySearch(page, "칼슘", "칼슘")

  // 9. 내 목록에서 '검진하기'
  await page.getByRole("button", { name: "검진하기" }).click()
  await expect(page.getByRole("heading", { name: "검진 결과" })).toBeVisible()

  // 10. 검진 결과에서 '복용 리포트'
  await page.getByRole("link", { name: "복용 리포트" }).click()
  await expect(page.getByRole("heading", { name: "복용 리포트" })).toBeVisible()

  // expected: 맨 위에 비맥스제트정과 칼슘 조합, 식약처 출처 링크, 약사에게 물을 질문 / 아래에 비맥스제트정과 칼슘
  const firstCard = page.getByTestId("warning-card").first()
  await expect(firstCard).toContainText("비맥스제트정")
  await expect(firstCard).toContainText("칼슘")
  await expect(firstCard.getByRole("link", { name: "식약처 e약은요 원문 보기" })).toBeVisible()
  await expect(firstCard).toContainText("약사에게 물어보세요")

  const taking = page.getByRole("list", { name: "복용 중인 약·영양제" })
  await expect(taking.getByRole("listitem").filter({ hasText: "비맥스제트정" })).toBeVisible()
  await expect(taking.getByRole("listitem").filter({ hasText: "칼슘" })).toBeVisible()

  // 조합 카드가 복용 목록보다 위에 있다
  const cardBox = await firstCard.boundingBox()
  const listBox = await taking.boundingBox()
  expect(cardBox && listBox && cardBox.y < listBox.y).toBe(true)
})
