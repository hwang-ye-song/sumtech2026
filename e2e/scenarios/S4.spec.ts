import { expect, test } from "@playwright/test"
import { addBySearch, signUpFromHome } from "../helpers"

test("S4 기록 없는 조합을 검진하면 안전하다고 단정하지 않고 약사 확인을 권한다", async ({ page }) => {
  // 1~2. 회원가입
  await signUpFromHome(page, "s4")

  // 3~5. '약·영양제 추가' → '타이레놀' → '타이레놀정500밀리그람(아세트아미노펜)'의 '추가'
  await addBySearch(page, "타이레놀", "타이레놀정500밀리그람(아세트아미노펜)")

  // 6~8. '약·영양제 추가' → '오메가3' → '오메가3'의 '추가'
  await addBySearch(page, "오메가3", "오메가3")

  // 9. 내 목록에서 '검진하기'
  await page.getByRole("button", { name: "검진하기" }).click()
  await expect(page.getByRole("heading", { name: "검진 결과" })).toBeVisible()

  // expected: "확인한 자료에서는 보고된 문제가 없어요. 걱정되면 약사에게 확인하세요"가 보이고, 경고 카드는 보이지 않는다
  await expect(page.getByText("확인한 자료에서는 보고된 문제가 없어요. 걱정되면 약사에게 확인하세요")).toBeVisible()
  await expect(page.getByTestId("warning-card")).toHaveCount(0)
})
