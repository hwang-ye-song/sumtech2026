import { expect, type Page } from "@playwright/test"

/**
 * 흐름(docs/scenarios.yaml)에서 반복되는 화면 조작. 각 spec이 직접 import한다.
 * page.goto는 창마다 처음 한 번(첫 화면 `/`)만 쓴다. 그 뒤로는 화면의 링크·버튼으로 이동한다.
 */

/** 첫 화면에서 '회원가입'을 눌러 새 계정으로 가입한다. 이메일은 실행마다 다르게 만든다. */
export async function signUpFromHome(page: Page, prefix: string): Promise<string> {
  const email = `${prefix}-${Date.now()}@example.com`
  await page.goto("/")
  await page.getByRole("main").getByRole("link", { name: "회원가입" }).click()
  await page.getByLabel("이메일").fill(email)
  await page.getByLabel("비밀번호").fill("test-1234")
  await page.getByRole("button", { name: "가입하기" }).click()
  await expect(page.getByRole("heading", { name: "내 목록" })).toBeVisible()
  return email
}

/** 첫 화면에서 '로그인'을 눌러 시드 계정으로 들어간다. */
export async function logInFromHome(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/")
  await page.getByRole("main").getByRole("link", { name: "로그인" }).click()
  await page.getByLabel("이메일").fill(email)
  await page.getByLabel("비밀번호").fill(password)
  await page.getByRole("button", { name: "로그인" }).click()
  await expect(page.getByRole("heading", { name: "내 목록" })).toBeVisible()
}

/** '약·영양제 추가'를 누르고 검색창에 입력한 뒤, 결과에서 `resultName`의 '추가'를 누른다. 끝나면 내 목록 화면이다. */
export async function addBySearch(page: Page, query: string, resultName: string): Promise<void> {
  await page.getByRole("link", { name: "약·영양제 추가" }).click()
  await page.getByRole("searchbox", { name: "검색창" }).fill(query)
  await page.getByRole("button", { name: `${resultName} 추가`, exact: true }).click()
  await expect(page.getByRole("heading", { name: "내 목록" })).toBeVisible()
}
