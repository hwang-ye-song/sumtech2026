import { expect, test } from "@playwright/test"
import { E2E_USER_EMAIL, E2E_USER_PASSWORD } from "../env"
import { listRows, logInFromHome, openListFromHome, register, searchAndPick } from "../helpers"

test("S3 감기에 걸린 50~60대 부모님이 비타민C를 더하면 안전하다고 단정하지 않는 안내를 받고, 잘못 넣은 것은 지운다", async ({ page }) => {
  await logInFromHome(page, E2E_USER_EMAIL, E2E_USER_PASSWORD)

  // 1~6. '복용 목록' → '비타민C' 검색 → '비타민C' → 하루 1개 → '등록'
  await openListFromHome(page)
  await searchAndPick(page, "비타민C", "비타민C")
  await register(page, 1)

  // expected: 단정하지 않는 문구와 확인한 자료·날짜. "안전", "문제없어요", "먹어도 돼요"는 없다
  const notice = page.getByTestId("no-record")
  await expect(notice).toContainText("확인한 자료에서는 보고된 문제가 없어요. 걱정되면 약사에게 확인하세요")
  await expect(notice).toContainText("확인한 자료:")
  await expect(notice).toContainText("DB 확인 날짜")
  for (const word of ["안전", "문제없어요", "먹어도 돼요"]) await expect(notice).not.toContainText(word)
  await expect(listRows(page).filter({ hasText: "비타민C" })).toBeVisible()

  // 7~8. 비타민C 줄의 '삭제' → '삭제할까요?' 창의 '삭제' (흐름 안에서 목록을 되돌린다)
  await listRows(page).filter({ hasText: "비타민C" }).getByRole("button", { name: "삭제" }).click()
  const dialog = page.getByRole("dialog", { name: "삭제할까요?" })
  await dialog.getByRole("button", { name: "삭제" }).click()

  // expected: 삭제 안내, 비타민C가 사라지고 레보티록신·칼슘은 남는다
  await expect(page.getByText("등록된 약·영양제가 목록에서 삭제되었습니다.")).toBeVisible()
  await expect(listRows(page).filter({ hasText: "비타민C" })).toHaveCount(0)
  await expect(listRows(page).filter({ hasText: "레보티록신" })).toBeVisible()
  await expect(listRows(page).filter({ hasText: "칼슘" })).toBeVisible()
})
