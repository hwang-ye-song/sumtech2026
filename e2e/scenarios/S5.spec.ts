import { expect, test } from "@playwright/test"
import { E2E_USER_EMAIL, E2E_USER_PASSWORD } from "../env"
import { logInFromHome, startCheckFromHome } from "../helpers"

test("S5 30~40대 자녀가 부모님 목록을 검진해, 약사에게 보여 드릴 리포트와 근거를 확인한다", async ({ page }) => {
  await logInFromHome(page, E2E_USER_EMAIL, E2E_USER_PASSWORD)

  // 1. 홈에서 '검진하기' (바로 점검하고 리포트로 간다)
  await startCheckFromHome(page)

  // expected: 맨 위 "주의할 항목 1개", 레보티록신 ↔ 칼슘 경고(할 일·질문·상담 안내), 아래에 레보티록신 1정과 칼슘 1000mg
  await expect(page.getByTestId("report-title")).toHaveText("주의할 항목 1개")
  const card = page.getByTestId("warning-card").filter({ hasText: "레보티록신" }).filter({ hasText: "칼슘" })
  await expect(card).toContainText("레보티록신과 최소 4시간 띄워 드세요")
  await expect(card).toContainText("약사에게 물어보세요")
  await expect(page.getByTestId("report-disclaimer")).toContainText("복용을 바꾸기 전에 약사·의사와 상담하세요")
  const table = page.getByRole("table", { name: "복용 중인 약·영양제" })
  await expect(table.getByRole("row").filter({ hasText: "레보티록신" })).toContainText("1정")
  await expect(table.getByRole("row").filter({ hasText: "칼슘" })).toContainText("1000mg")

  // 3. '레보티록신 ↔ 칼슘' 항목의 '자세히'
  await card.getByRole("link", { name: "자세히" }).click()

  // expected: 논문·공식 자료 두 출처, DB 확인 날짜, '출처 보기' 링크 주소
  await expect(page.getByTestId("detail-title")).toContainText("레보티록신")
  const sources = page.getByTestId("rule-source")
  const paper = sources.filter({ hasText: "Absorption of Levothyroxine When Coadministered with Various Calcium Formulations" })
  await expect(paper).toContainText("논문")
  await expect(paper.getByRole("link", { name: "출처 보기" })).toHaveAttribute("href", "https://pmc.ncbi.nlm.nih.gov/articles/PMC3092723/")
  const medline = sources.filter({ hasText: "Levothyroxine (MedlinePlus)" })
  await expect(medline.getByRole("link", { name: "출처 보기" })).toHaveAttribute("href", "https://medlineplus.gov/druginfo/meds/a682461.html")
  await expect(page.getByTestId("detail-checked")).toContainText(/DB 확인 날짜 \d{4}-\d{2}-\d{2}/)
})
