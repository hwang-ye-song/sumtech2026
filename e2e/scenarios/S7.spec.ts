import path from "node:path"
import { expect, test } from "@playwright/test"
import { signUpFromHome } from "../helpers"

test("S7 사진으로 약 상자를 찍어 올리면 그 약이 내 목록에 추가된다", async ({ page }) => {
  // 1~2. 회원가입
  await signUpFromHome(page, "s7")

  // 3. 내 목록에서 '사진으로 추가'
  await page.getByRole("link", { name: "사진으로 추가" }).click()
  await expect(page.getByRole("heading", { name: "사진으로 추가" })).toBeVisible()

  // 4. 비맥스제트정 상자 사진을 올린다 (고르면 바로 인식을 시작한다. 실제 AI 응답을 기다린다)
  await page.getByLabel("사진 올리기").setInputFiles(path.join(__dirname, "../fixtures/bemax-z.jpg"))
  await expect(page.getByRole("heading", { name: "인식 결과" })).toBeVisible({ timeout: 60_000 })

  // 5. 인식 결과에서 '비맥스제트정'의 '추가'
  await page.getByRole("list", { name: "인식 결과" }).getByRole("button", { name: "비맥스제트정 추가", exact: true }).click()

  // expected: 내 목록에 비맥스제트정이 추가되어 보인다
  await expect(page.getByRole("heading", { name: "내 목록" })).toBeVisible()
  await expect(page.getByRole("listitem").filter({ hasText: "비맥스제트정" })).toBeVisible()
})
