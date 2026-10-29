import { expect, test } from "@playwright/test"
import { expectHome } from "../helpers"

test("S1 유튜브 추천 영양제를 먹는 20~30대가 서비스 소개를 보고 회원가입한다", async ({ page }) => {
  // 1. 첫 화면에서 서비스 소개와 '처방이나 진단을 하지 않아요' 안내를 확인한다
  await page.goto("/")
  const main = page.getByRole("main")
  await expect(main.getByRole("heading", { level: 1 })).toContainText("TwoPills")
  await expect(main.getByText("처방이나 진단을 하지 않아요")).toBeVisible()

  // 2. 첫 화면의 '회원가입'
  await main.getByRole("link", { name: "회원가입" }).click()

  // 3~6. 이메일 · 8자 이상 비밀번호 · 비밀번호 확인 → '가입하기'
  await page.getByLabel("이메일").fill(`s1-${Date.now()}@example.com`)
  await page.getByLabel("비밀번호", { exact: true }).fill("test-1234")
  await page.getByLabel("비밀번호 확인").fill("test-1234")
  await page.getByRole("button", { name: "가입하기" }).click()

  // expected: 홈에 '복용 목록'·'검진하기' 두 칸과 '영양제 추천받기', "먹고 있는 약이나 영양제를 추가해 보세요"
  await expectHome(page)
  await expect(page.getByRole("main").getByText("먹고 있는 약이나 영양제를 추가해 보세요")).toBeVisible()
})
