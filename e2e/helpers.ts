import { expect, type Page } from "@playwright/test"

/**
 * 흐름(docs/scenarios.yaml)에서 반복되는 화면 조작. 각 spec이 직접 import한다.
 * page.goto는 창마다 처음 한 번(첫 화면 `/`)만 쓴다. 그 뒤로는 화면의 링크·버튼으로 이동한다.
 * 가입·로그인 뒤 도착하는 화면이 scenarios.yaml의 '홈'(마이페이지: '복용 목록'·'검진하기' 두 칸과 '영양제 추천받기')이다.
 */

/** 가입·로그인 뒤 '홈'에 왔는지 확인한다. */
export async function expectHome(page: Page): Promise<void> {
  const main = page.getByRole("main")
  await expect(main.getByRole("link", { name: /복용 목록/ })).toBeVisible()
  await expect(main.getByRole("link", { name: /검진하기/ })).toBeVisible()
  await expect(main.getByRole("link", { name: "영양제 추천받기" })).toBeVisible()
}

/** 첫 화면에서 '회원가입'을 눌러 새 계정으로 가입한다. 이메일은 실행마다 다르게 만든다. 끝나면 홈이다. */
export async function signUpFromHome(page: Page, prefix: string): Promise<string> {
  const email = `${prefix}-${Date.now()}@example.com`
  await page.goto("/")
  await page.getByRole("main").getByRole("link", { name: "회원가입" }).click()
  await page.getByLabel("이메일").fill(email)
  await page.getByLabel("비밀번호", { exact: true }).fill("test-1234")
  await page.getByLabel("비밀번호 확인").fill("test-1234")
  await page.getByRole("button", { name: "가입하기" }).click()
  await expectHome(page)
  return email
}

/** 첫 화면에서 '로그인'을 눌러 시드 계정(복용자)으로 들어간다. 끝나면 홈이다. */
export async function logInFromHome(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/")
  await page.getByRole("main").getByRole("link", { name: "로그인" }).click()
  await page.getByLabel("이메일").fill(email)
  await page.getByLabel("비밀번호", { exact: true }).fill(password)
  await page.getByRole("main").getByRole("button", { name: "로그인" }).click()
  await expectHome(page)
}

/** 홈에서 '복용 목록'을 누른다. */
export async function openListFromHome(page: Page): Promise<void> {
  await page.getByRole("main").getByRole("link", { name: /복용 목록/ }).click()
  await expect(page.getByRole("link", { name: "검색으로 등록" })).toBeVisible()
}

/** 홈에서 '검진하기' → '검진 시작'. 끝나면 복용 리포트다. */
export async function startCheckFromHome(page: Page): Promise<void> {
  await page.getByRole("main").getByRole("link", { name: /검진하기/ }).click()
  await page.getByRole("button", { name: "검진 시작" }).click()
  await expect(page.getByRole("heading", { name: /주의할 항목/ })).toBeVisible()
}

/** 복용 목록에서 '검색으로 등록' → 검색창에 입력 → '검색' → 결과에서 `resultName`을 고른다. */
export async function searchAndPick(page: Page, query: string, resultName: string): Promise<void> {
  await page.getByRole("link", { name: "검색으로 등록" }).click()
  await page.getByRole("searchbox", { name: "검색창" }).fill(query)
  await page.getByRole("button", { name: "검색", exact: true }).click()
  await page.getByRole("list", { name: "검색 결과" }).getByRole("button", { name: resultName, exact: true }).click()
  await expect(page.getByLabel("하루에 먹는 개수")).toBeVisible()
}

/** 고른 항목의 '하루에 먹는 개수'(와 영양제면 '한 알 함량')를 넣고 '등록'을 누른다. */
export async function register(page: Page, count: number, amountMg?: number): Promise<void> {
  await page.getByLabel("하루에 먹는 개수").fill(String(count))
  if (amountMg !== undefined) await page.getByLabel(/한 알 함량/).fill(String(amountMg))
  await page.getByRole("button", { name: "등록", exact: true }).click()
}

/** 복용 목록 표(약·영양제)에 있는 이름들 */
export function listRows(page: Page) {
  return page.getByTestId("list-row")
}
