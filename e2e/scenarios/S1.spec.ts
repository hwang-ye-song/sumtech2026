import { expect, test } from "@playwright/test"
import { listRows, register, searchAndPick } from "../helpers"

test("S1 갑상선약을 드시는 50~60대 부모님이 서비스 소개를 보고 가입해 레보티록신을 등록한다", async ({ page }) => {
  // 1. 첫 화면에서 서비스 소개와 '처방이나 진단을 하지 않아요' 안내를 확인한다
  await page.goto("/")
  const main = page.getByRole("main")
  await expect(main.getByRole("heading", { level: 1 })).toContainText("TwoPills")
  await expect(main.getByText("처방이나 진단을 하지 않아요")).toBeVisible()
  // 대제목 아래 가운데에 메인 기능 '검진하기'·'영양제 추천' 버튼이 있다
  await expect(main.getByTestId("hero-check")).toHaveText("검진하기")
  await expect(main.getByTestId("hero-recommend")).toHaveText("영양제 추천")

  // 2. 첫 화면 위쪽의 '회원가입'
  await page.getByRole("banner").getByRole("link", { name: "회원가입" }).click()

  // 3~6. 이메일 · 8자 이상 비밀번호 · 실수로 다른 비밀번호 확인 · 건강 정보 동의 체크 → '가입하기'
  const email = `s1-${Date.now()}@example.com`
  const consent = page.getByLabel(/건강 정보 수집·이용과 사진 AI 판독에 동의해요/)
  await page.getByLabel("이메일").fill(email)
  await page.getByLabel("비밀번호", { exact: true }).fill("test-1234")
  await page.getByLabel("비밀번호 확인").fill("test-9999")
  await consent.check()
  await page.getByRole("button", { name: "가입하기" }).click()

  // expected: 가입되지 않고 오류 안내, 이메일과 동의 체크는 그대로
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("비밀번호 확인이 비밀번호와 달라요.")
  await expect(page).toHaveURL(/\/signup/)
  await expect(page.getByLabel("이메일")).toHaveValue(email)
  await expect(consent).toBeChecked()

  // 7~8. 비밀번호와 비밀번호 확인을 같게 다시 입력 → '가입하기'
  await page.getByLabel("비밀번호", { exact: true }).fill("test-1234")
  await page.getByLabel("비밀번호 확인").fill("test-1234")
  await page.getByRole("button", { name: "가입하기" }).click()

  // expected: 가입하면 바로 복용 목록 화면에 등록 안내와 검색창
  await expect(page.getByTestId("welcome")).toContainText("가입을 환영해요! 지금 먹고 있는 약과 영양제를 먼저 등록해 주세요.")
  await expect(page.getByRole("searchbox", { name: "검색창" })).toBeVisible()

  // 9~12. '레보티록신' 검색 → '레보티록신' → 하루 1개 → '등록'
  await searchAndPick(page, "레보티록신", "레보티록신")
  await register(page, 1)

  // expected: 처음 등록이라 경고 창 없이 '약' 표에 레보티록신 1정
  await expect(page.getByRole("dialog")).toHaveCount(0)
  const row = page.getByRole("table", { name: "복용 목록 약" }).getByTestId("list-row").filter({ hasText: "레보티록신" })
  await expect(row).toContainText("1정")
  await expect(listRows(page)).toHaveCount(1)
})
