import fs from "node:fs"
import path from "node:path"
import { expect, test } from "@playwright/test"
import { E2E_USER_EMAIL, E2E_USER_PASSWORD } from "../env"
import { listRows, logInFromHome, openListFromHome } from "../helpers"

// docs/scenarios.yaml 머리말: 올릴 사진은 e2e/fixtures에 커밋한다.
const BLURRY = path.join(__dirname, "..", "fixtures", "blurry-pill.jpg")
const BOX = path.join(__dirname, "..", "fixtures", "ferobau-box.jpg")

test("S7 성분표를 읽기 어려운 50~60대 부모님이 약 상자를 사진으로 찍어 등록하려다, 흐린 사진은 다시 찍고 경고를 받는다", async ({ page }) => {
  expect(fs.existsSync(BLURRY) && fs.existsSync(BOX), "e2e/fixtures/blurry-pill.jpg·ferobau-box.jpg 사진이 필요해요").toBe(true)
  await logInFromHome(page, E2E_USER_EMAIL, E2E_USER_PASSWORD)

  // 1. '복용 목록' (검색 칸 옆에 '사진 등록' 칸이 있다)
  await openListFromHome(page)

  // expected: 올리기 전에 '사진 등록' 칸에 저장하지 않는다는 안내
  const photo = page.getByTestId("section-photo")
  await expect(photo).toContainText("읽은 뒤 사진은 바로 지우고 저장하지 않아요")

  // 2. '사진 올리기'로 흐린 알약 사진 → "사진이 흐려서 읽지 못했어요. 다시 찍어 주세요" (AI 응답을 기다린다)
  await photo.getByLabel("사진 올리기").setInputFiles(BLURRY)
  await expect(page.getByText("사진이 흐려서 읽지 못했어요. 다시 찍어 주세요")).toBeVisible({ timeout: 60_000 })

  // 3~4. '다시 찍기' → 훼로바-유서방정 상자 사진
  await page.getByRole("button", { name: "다시 찍기" }).click()
  await photo.getByLabel("사진 올리기").setInputFiles(BOX)

  // 5~6. 후보에는 사진 속 약(훼로바-유서방정)만 골라진 채로 있다 → '고른 1개 모두 등록'
  const candidates = page.getByTestId("candidates")
  await expect(candidates).toBeVisible({ timeout: 60_000 })
  await expect(candidates.getByTestId("candidate")).toHaveCount(1)
  await expect(candidates.getByRole("checkbox", { name: /훼로바-유서방정/ })).toBeChecked()
  await expect(candidates.getByRole("spinbutton", { name: /훼로바-유서방정.*하루에 먹는 개수/ })).toHaveValue("1")
  await page.getByRole("button", { name: "고른 1개 모두 등록" }).click()

  // expected: "시간을 띄워 드세요"와 "레보티록신(갑상선약) ↔ 철분" 경고가 출처와 함께
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByRole("heading", { level: 3 })).toHaveText("시간을 띄워 드세요")
  const card = dialog.getByTestId("warning-card").filter({ hasText: "레보티록신(갑상선약) ↔ 철분" })
  await expect(card.getByRole("link", { name: "출처 보기" }).first()).toBeVisible()

  // 7. '취소' → 목록에 레보티록신과 칼슘만 있다
  await dialog.getByRole("button", { name: "취소" }).click()
  await page.getByRole("navigation", { name: "주 메뉴" }).getByRole("link", { name: "복용 목록" }).click()
  await expect(listRows(page)).toHaveCount(2)
  await expect(listRows(page).filter({ hasText: "레보티록신" })).toBeVisible()
  await expect(listRows(page).filter({ hasText: "칼슘" })).toBeVisible()
})
