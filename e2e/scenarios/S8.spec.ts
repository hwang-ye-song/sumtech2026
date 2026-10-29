import { expect, test } from "@playwright/test"
import { listRows, openListFromHome, register, searchAndPick, signUpFromHome } from "../helpers"

test("S8 뼈에 좋다는 칼슘을 많이 드시는 50~60대 부모님이 하루 기준량을 넘었는지 확인한다", async ({ page }) => {
  // 1~3. 첫 화면 '회원가입' → 이메일·비밀번호·확인 → '가입하기' (목록을 바꾸는 흐름이라 새 계정)
  await signUpFromHome(page, "s8")

  // 4~9. '복용 목록' → '검색으로 등록' → '칼슘' 검색 → '칼슘' → 하루 2개, 한 알 1500mg → '등록'
  await openListFromHome(page)
  await searchAndPick(page, "칼슘", "칼슘")
  await register(page, 2, 1500)

  // expected: 처음 등록할 때는 경고 창 없이 목록에 추가된다
  await expect(listRows(page).filter({ hasText: "칼슘" })).toBeVisible()
  await expect(page.getByRole("dialog")).toHaveCount(0)

  // 10~11. 메뉴의 '검진하기' → '검진 시작'
  await page.getByRole("navigation", { name: "주 메뉴" }).getByRole("link", { name: "검진하기" }).click()
  await page.getByRole("button", { name: "검진 시작" }).click()

  // expected: "하루 기준량을 넘어요", 내 하루 칼슘 3000mg, 기준량 두 개, 출처 링크, 약사 상담 안내
  const card = page.getByTestId("intake-card").filter({ hasText: "칼슘" })
  await expect(card).toContainText("하루 기준량을 넘어요")
  await expect(card).toContainText(/내 하루 칼슘\s*3,?000\s*mg/)
  await expect(card).toContainText(/2,500\s*mg/)
  await expect(card).toContainText(/2,000\s*mg/)
  await expect(card.getByRole("link", { name: "출처 보기" })).toHaveAttribute("href", "https://medlineplus.gov/ency/article/002412.htm")
  await expect(page.getByTestId("report-disclaimer")).toContainText("복용을 바꾸기 전에 약사·의사와 상담하세요")
})
