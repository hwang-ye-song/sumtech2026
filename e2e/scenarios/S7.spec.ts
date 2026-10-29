import fs from "node:fs"
import path from "node:path"
import { expect, test } from "@playwright/test"
import { E2E_USER_EMAIL, E2E_USER_PASSWORD } from "../env"
import { listRows, logInFromHome, openCheckFromHome, register } from "../helpers"

// docs/scenarios.yaml 머리말: 올릴 사진은 e2e/fixtures에 커밋한다.
const BLURRY = path.join(__dirname, "..", "fixtures", "blurry-pill.jpg")
const BOX = path.join(__dirname, "..", "fixtures", "ferobau-box.jpg")

test("S7 성분표를 읽기 어려운 50~60대 부모님이 약 상자를 사진으로 찍어 등록하려다, 흐린 사진은 다시 찍고 경고를 받는다", async ({ page }) => {
  expect(fs.existsSync(BLURRY) && fs.existsSync(BOX), "e2e/fixtures/blurry-pill.jpg·ferobau-box.jpg 사진이 필요해요").toBe(true)
  await logInFromHome(page, E2E_USER_EMAIL, E2E_USER_PASSWORD)

  // 1~2. '검진하기' → '사진으로 등록'
  await openCheckFromHome(page)
  await page.getByRole("link", { name: "사진으로 등록" }).click()

  // expected: 보내기 전에 동의 안내
  await expect(page.getByTestId("photo-consent")).toContainText("읽은 뒤 사진은 바로 지우고 저장하지 않아요")

  // 3. '동의하고 찍기' → 촬영 안내 네 줄
  await page.getByRole("button", { name: "동의하고 찍기" }).click()
  const tips = page.getByTestId("photo-tips")
  for (const tip of ["플래시를 켜 주세요", "처방전이 보이게 찍어 주세요", "상표명이 보이게 찍어 주세요", "흐리지 않게 찍어 주세요"]) {
    await expect(tips).toContainText(tip)
  }

  // 4. 흐린 알약 사진 → "사진이 흐려서 읽지 못했어요. 다시 찍어 주세요" (AI 응답을 기다린다)
  await page.getByLabel("사진 올리기").setInputFiles(BLURRY)
  await expect(page.getByText("사진이 흐려서 읽지 못했어요. 다시 찍어 주세요")).toBeVisible({ timeout: 60_000 })

  // 5~6. '다시 찍기' → 훼로바-유서방정 상자 사진
  await page.getByRole("button", { name: "다시 찍기" }).click()
  await page.getByLabel("사진 올리기").setInputFiles(BOX)

  // 7~9. 후보 '훼로바-유서방정' → 하루 1개 → '등록'
  const candidates = page.getByRole("list", { name: "후보 목록" })
  await expect(candidates).toBeVisible({ timeout: 60_000 })
  await expect(candidates).toContainText("건조황산제일철")
  await candidates.getByRole("button", { name: /훼로바-유서방정/ }).click()
  await register(page, 1)

  // expected: "시간을 띄워 드세요"와 "레보티록신(갑상선약) ↔ 철분" 경고가 출처와 함께
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByRole("heading", { level: 3 })).toHaveText("시간을 띄워 드세요")
  const card = dialog.getByTestId("warning-card").filter({ hasText: "레보티록신(갑상선약) ↔ 철분" })
  await expect(card.getByRole("link", { name: "출처 보기" }).first()).toBeVisible()

  // 10. '취소' → 목록에 레보티록신과 칼슘만 있다
  await dialog.getByRole("button", { name: "취소" }).click()
  await page.getByRole("navigation", { name: "주 메뉴" }).getByRole("link", { name: "검진하기" }).click()
  await expect(listRows(page)).toHaveCount(2)
  await expect(listRows(page).filter({ hasText: "레보티록신" })).toBeVisible()
  await expect(listRows(page).filter({ hasText: "칼슘" })).toBeVisible()
})
