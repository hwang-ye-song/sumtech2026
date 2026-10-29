import { expect, test } from "@playwright/test"
import { addBySearch, signUpFromHome } from "../helpers"

test("S1 처음 가입한 사람이 지금 먹는 갑상선약과 칼슘을 넣고 검진해 흡수 감소 경고를 받는다", async ({ page }) => {
  // 1~2. 첫 화면에서 '회원가입' → 이메일·비밀번호 → '가입하기'
  await signUpFromHome(page, "s1")

  // 3~5. '약·영양제 추가' → 검색창 '레보티록신' → '레보티록신'의 '추가'
  await addBySearch(page, "레보티록신", "레보티록신")

  // 6~8. '약·영양제 추가' → 검색창 '칼슘' → '칼슘'의 '추가'
  await addBySearch(page, "칼슘", "칼슘")

  // 9. 내 목록에서 '검진하기'
  await page.getByRole("button", { name: "검진하기" }).click()
  await expect(page.getByRole("heading", { name: "검진 결과" })).toBeVisible()

  // expected: 레보티록신과 칼슘의 흡수 감소 경고, 논문(R3) 출처 링크, 약사에게 물을 질문
  const card = page.getByTestId("warning-card").filter({ hasText: "레보티록신" }).filter({ hasText: "칼슘" })
  await expect(card).toBeVisible()
  await expect(card).toContainText("흡수")
  await expect(card.getByRole("link", { name: "논문 원문 보기 (R3)" })).toBeVisible()
  await expect(card).toContainText("약사에게 물어보세요")
})
