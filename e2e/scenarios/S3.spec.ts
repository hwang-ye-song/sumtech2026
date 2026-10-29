import { expect, test } from "@playwright/test"
import { addBySearch, signUpFromHome } from "../helpers"

test("S3 칼슘을 먹던 사람이 나중에 철분을 추가하면 영양제끼리 겹치는 경고를 받는다", async ({ page }) => {
  // 1~2. 회원가입
  await signUpFromHome(page, "s3")

  // 3~5. '약·영양제 추가' → '칼슘' → '칼슘'의 '추가'
  await addBySearch(page, "칼슘", "칼슘")

  // 6. 내 목록에서 '검진하기' (첫 검진 → 이제부터 '사용 중')
  await page.getByRole("button", { name: "검진하기" }).click()
  await expect(page.getByRole("heading", { name: "검진 결과" })).toBeVisible()

  // 7~9. '약·영양제 추가' → '철분' → '철분'의 '추가'
  await addBySearch(page, "철분", "철분")

  // expected: 철분을 추가하자마자 칼슘이 철분 흡수를 방해한다는 경고, 출처 링크, 약사에게 물을 질문
  const card = page.getByTestId("warning-card").filter({ hasText: "칼슘" }).filter({ hasText: "철분" })
  await expect(card).toBeVisible()
  await expect(card).toContainText("흡수")
  await expect(card.getByRole("link", { name: /원문 보기|출처 보기/ })).toBeVisible()
  await expect(card).toContainText("약사에게 물어보세요")
})
