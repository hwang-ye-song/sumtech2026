import { expect, test } from "@playwright/test"
import { addBySearch, signUpFromHome } from "../helpers"

test("S6 검진을 마친 사람이 간단한 설문에 답하고 지금 먹는 약과 겹치지 않는 비타민 추천을 받는다", async ({ page }) => {
  // 1~2. 회원가입
  await signUpFromHome(page, "s6")

  // 3~5. '약·영양제 추가' → '비맥스' → '비맥스제트정'의 '추가'
  await addBySearch(page, "비맥스", "비맥스제트정")

  // 6. 내 목록에서 '검진하기'
  await page.getByRole("button", { name: "검진하기" }).click()
  await expect(page.getByRole("heading", { name: "검진 결과" })).toBeVisible()

  // 7. 검진 결과에서 '비타민 추천받기'
  await page.getByRole("link", { name: "비타민 추천받기" }).click()
  await expect(page.getByRole("heading", { name: "비타민 추천" })).toBeVisible()

  // 8. '좋아지고 싶은 부분'에서 '기타'를 고르고 '오후에 쉽게 지쳐요'를 입력
  const goals = page.getByRole("group", { name: "좋아지고 싶은 부분" })
  await goals.getByRole("checkbox", { name: "기타" }).check()
  await goals.getByLabel("기타 내용").fill("오후에 쉽게 지쳐요")

  // 9. '하루에 몇 알까지'에서 '2~3알'
  await page.getByRole("group", { name: "하루에 몇 알까지" }).getByRole("radio", { name: "2~3알" }).check()

  // 10. '추천받기' (실제 AI 응답을 기다린다)
  await page.getByRole("button", { name: "추천받기" }).click()
  await expect(page.getByRole("heading", { name: "추천 결과" })).toBeVisible({ timeout: 60_000 })

  // expected: 추천마다 식약처 기능성 문구·출처 링크·"확인한 자료에서는 보고된 문제가 없어요. 걱정되면 약사에게 확인하세요", 칼슘은 없음, 제품 이름·구매 링크 없음
  const items = page.getByTestId("recommendation")
  await expect(items.first()).toBeVisible()
  const count = await items.count()
  expect(count).toBeGreaterThan(0)
  for (let i = 0; i < count; i += 1) {
    const item = items.nth(i)
    await expect(item).toContainText("식약처 기능성 내용")
    await expect(item.getByRole("link", { name: "식약처 출처 보기" })).toBeVisible()
    await expect(item).toContainText("확인한 자료에서는 보고된 문제가 없어요. 걱정되면 약사에게 확인하세요")
    await expect(item.getByRole("heading")).not.toHaveText("칼슘")
    await expect(item).not.toContainText("구매")
  }
})
