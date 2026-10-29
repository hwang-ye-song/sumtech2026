// docs/scenarios.yaml S1~S8을 steps 순서 그대로 누르고 expected 문구를 확인한다.
// 실행: npm run e2e  (서버가 http://localhost:3000 에 떠 있어야 한다)
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'http://localhost:3000/';
const SHOT = process.env.SHOT === '1'; // 1이면 4조합 스크린샷도 찍는다
const outDir = path.resolve('screenshots');
const results = [];
const run = Date.now().toString(36);

async function expectText(page, text, where = 'body') {
  const loc = page.locator(where).getByText(text, { exact: false }).first();
  await loc.waitFor({ state: 'visible', timeout: 4000 }).catch(() => { throw new Error(`보이지 않음: "${text}"`); });
}
async function expectNoText(page, text) {
  const n = await page.getByText(text, { exact: false }).count();
  if (n) throw new Error(`보이면 안 되는 문구가 보임: "${text}"`);
}
async function noHorizontalScroll(page) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (over > 1) throw new Error(`가로 스크롤 ${over}px`);
}
async function logout(page) {
  await page.goto(BASE);
  await page.evaluate(() => { try { const s = JSON.parse(localStorage.getItem('twopills.v1')); if (s) { s.session = null; localStorage.setItem('twopills.v1', JSON.stringify(s)); } } catch {} });
  await page.reload();
}
async function loginAs(page, email, pw) {
  await logout(page);
  await page.goto(BASE + '#/login');
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-pw').fill(pw);
  await page.getByTestId('login-submit').click();
  await page.waitForURL(/#\/home/);
}
async function fresh(ctx) { const page = await ctx.newPage(); await page.goto(BASE); await page.evaluate(() => localStorage.removeItem('twopills.v1')); await page.goto(BASE); return page; }
async function signup(page, email) {
  await page.getByRole('link', { name: '회원가입' }).first().click();
  await page.getByTestId('signup-email').fill(email);
  await page.getByTestId('signup-pw').fill('password123');
  await page.getByTestId('signup-pw2').fill('password123');
  await page.getByTestId('signup-consent').check(); // scenarios.yaml에 없는 추가 step — 학생 확인 필요
  await page.getByRole('button', { name: '가입하기' }).click();
  await page.waitForURL(/#\/home/);
}
async function searchAndPick(page, q, pick) {
  await page.getByRole('link', { name: '복용 목록' }).first().click();
  await page.getByTestId('mode-search').click();
  await page.getByTestId('search-input').fill(q);
  await page.getByTestId('search-submit').click();
  await page.getByTestId('result').filter({ hasText: pick }).first().click();
}

const S = {
  async S1(page) {
    await page.goto(BASE);
    await expectText(page, '처방이나 진단을 하지 않아요');
    await signup(page, `s1-${run}@test.local`);
    await expectText(page, '복용 목록'); await expectText(page, '분석하기'); await expectText(page, '영양제 추천받기');
    await expectText(page, '먹고 있는 약이나 영양제를 추가해 보세요');
  },
  async S2(page) {
    await loginAs(page, 'user@twopills.app', 'twopills1234');
    await searchAndPick(page, '비맥스', '비맥스제트정');
    await page.getByTestId('reg-count').fill('1');
    await page.getByTestId('reg-submit').click();
    const m = '[data-testid=modal]';
    await expectText(page, '함께 먹지 마세요', m);
    await expectText(page, '비맥스제트정 ↔ 칼슘', m);
    await expectText(page, '인산염, 칼슘염, 경구용 테트라사이클린계 제제, 제산제, 레보도파와 함께 복용하지 마십시오.', m);
    await expectText(page, '비맥스제트정 e약은요', m);
    await expectText(page, '약사에게 물어보세요', m);
    await expectText(page, '복용을 바꾸기 전에 약사·의사와 상담하세요', m);
    await page.getByTestId('modal-cancel').click();
    const rows = await page.locator('[data-testid=list-row][data-name="비맥스제트정"]').count();
    if (rows) throw new Error('취소했는데 비맥스제트정이 목록에 있음');
  },
  async S3(page) {
    await loginAs(page, 'user@twopills.app', 'twopills1234');
    await searchAndPick(page, '비타민C', '비타민C');
    await page.getByTestId('reg-count').fill('1');
    await page.getByTestId('reg-submit').click();
    await expectText(page, '확인한 자료에서는 보고된 문제가 없어요. 걱정되면 약사에게 확인하세요');
    await expectText(page, 'DB 확인 날짜');
    for (const bad of ['안전', '문제없어요', '먹어도 돼요']) await expectNoText(page, bad);
    await page.locator('[data-testid=list-row][data-name="비타민C"]').getByTestId('row-delete').click();
    await expectText(page, '삭제할까요?');
    await page.getByTestId('confirm-delete').click();
    await expectText(page, '등록된 약·영양제가 목록에서 삭제되었습니다.');
    if (await page.locator('[data-testid=list-row][data-name="비타민C"]').count()) throw new Error('비타민C가 남아 있음');
    await expectText(page, '씬지로이드정'); await expectText(page, '칼슘');
  },
  async S4(page) {
    await loginAs(page, 'user@twopills.app', 'twopills1234');
    await searchAndPick(page, '철분', '철분');
    await page.getByTestId('reg-count').fill('1');
    const m = '[data-testid=modal]';
    for (let i = 0; i < 2; i++) {
      await page.getByTestId('reg-submit').click();
      await expectText(page, '시간을 띄워 드세요', m);
      await expectText(page, '레보티록신과 최소 4시간 띄워 드세요', m);
      await expectText(page, '레보티록신(갑상선약) ↔ 철분', m);
      await expectText(page, 'Levothyroxine (MedlinePlus)', m);
      await expectText(page, '복용을 바꾸기 전에 약사·의사와 상담하세요', m);
      await expectText(page, '칼슘 ↔ 철분', m);
      for (const b of ['자세히', '그래도 추가', '취소']) await expectText(page, b, m);
      await page.getByTestId('modal-cancel').click();
    }
    await page.getByRole('link', { name: '복용 목록' }).first().click();
    if (await page.locator('[data-testid=list-row][data-name="철분"]').count()) throw new Error('철분이 목록에 있음');
    await expectText(page, '씬지로이드정'); await expectText(page, '칼슘');
  },
  async S5(page) {
    await loginAs(page, 'user@twopills.app', 'twopills1234');
    await page.getByRole('link', { name: '분석하기' }).first().click();
    await page.getByTestId('analyze-start').click();
    await page.waitForURL(/#\/report/);
    await expectText(page, '주의할 항목');
    await expectText(page, '레보티록신과 최소 4시간 띄워 드세요');
    await expectText(page, '약사에게 물어보세요');
    await expectText(page, '레보티록신 1정'); await expectText(page, '칼슘 1000mg');
    await page.locator('[data-testid=finding][data-rule="levo-ca"]').getByTestId('finding-detail').click();
    await expectText(page, 'Absorption of Levothyroxine When Coadministered with Various Calcium Formulations');
    await expectText(page, '논문'); await expectText(page, '건강한 성인 8명 연구');
    await expectText(page, 'Levothyroxine (MedlinePlus)'); await expectText(page, '공식 자료'); await expectText(page, 'DB 확인 날짜');
    const hrefs = await page.locator('[data-testid=detail-sources] [data-testid=src-link]').evaluateAll(a => a.map(x => x.href));
    for (const u of ['https://pmc.ncbi.nlm.nih.gov/articles/PMC3092723/', 'https://medlineplus.gov/druginfo/meds/a682461.html']) if (!hrefs.includes(u)) throw new Error(`출처 링크 없음 ${u}`);
  },
  async S6(page) {
    await loginAs(page, 'user@twopills.app', 'twopills1234');
    await page.getByRole('link', { name: '분석하기' }).first().click();
    await page.getByTestId('analyze-start').click();
    await page.waitForURL(/#\/report/);
    await page.getByTestId('report-recommend').click();
    await page.getByTestId('goals').getByRole('button', { name: '피로 회복' }).click();
    await page.getByTestId('symptoms').getByRole('button', { name: '쉽게 피곤해요' }).click();
    await page.getByTestId('rec-submit').click();
    await page.waitForURL(/recommend\/result/);
    await page.getByTestId('rec-ok').waitFor({ state: 'visible' });
    const okN = await page.locator('[data-testid=rec-ok] [data-testid=rec-item]').count();
    if (okN < 1) throw new Error('추천이 0개');
    const okText = await page.getByTestId('rec-ok').innerText();
    if (okText.includes('철분')) throw new Error("'추천' 칸에 철분이 있음");
    const links = await page.locator('[data-testid=rec-ok] [data-testid=src-link]').count();
    if (links < okN) throw new Error('추천마다 출처 링크가 없음');
    await expectText(page, '주의가 필요해요', '[data-testid=rec-warn]');
    await expectText(page, '이 추천은 진단이나 처방이 아니에요. 새로 드시기 전에 약사·의사와 상담하세요');
    await expectNoText(page, '구매');
  },
  async S7(page) {
    await loginAs(page, 'user@twopills.app', 'twopills1234');
    await page.getByRole('link', { name: '복용 목록' }).first().click();
    await page.getByTestId('mode-photo').click();
    await expectText(page, '읽은 뒤 사진은 바로 지우고 저장하지 않아요');
    await page.getByTestId('photo-agree').click();
    for (const t of ['플래시를 켜 주세요', '처방전이 보이게 찍어 주세요', '상표명이 보이게 찍어 주세요', '흐리지 않게 찍어 주세요']) await expectText(page, t);
    await page.getByTestId('photo-file').setInputFiles({ name: 'blurry-pill.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('x') });
    await expectText(page, '사진이 흐려서 읽지 못했어요. 다시 찍어 주세요');
    await page.getByTestId('photo-retry').click();
    await page.getByTestId('photo-file').setInputFiles({ name: 'ferobau-box.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('x') });
    await page.getByTestId('candidate').filter({ hasText: '훼로바-유서방정' }).first().click();
    await expectText(page, '건조황산제일철');
    await page.getByTestId('reg-count').fill('1');
    await page.getByTestId('reg-submit').click();
    const m = '[data-testid=modal]';
    await expectText(page, '시간을 띄워 드세요', m);
    await expectText(page, '레보티록신(갑상선약) ↔ 철분', m);
    await expectText(page, '출처 보기', m);
    await page.getByTestId('modal-cancel').click();
    if (await page.locator('[data-testid=list-row][data-name="훼로바-유서방정"]').count()) throw new Error('취소했는데 훼로바가 목록에 있음');
    await expectText(page, '씬지로이드정'); await expectText(page, '칼슘');
  },
  async S8(page) {
    await logout(page);
    await page.goto(BASE);
    await signup(page, `s8-${run}@test.local`);
    await searchAndPick(page, '칼슘', '칼슘');
    await page.getByTestId('reg-count').fill('2');
    await page.getByTestId('reg-mg').fill('1500');
    await page.getByTestId('reg-submit').click();
    await expectText(page, '하루 기준량을 넘어요', '[data-testid=modal]');
    await page.getByTestId('modal-add').click();
    await page.getByRole('link', { name: '분석하기' }).first().click();
    await page.getByTestId('analyze-start').click();
    await page.waitForURL(/#\/report/);
    await expectText(page, '하루 기준량을 넘어요');
    await expectText(page, '3,000'); await expectText(page, '2알 × 1500mg');
    await expectText(page, '19~50세 2,500mg'); await expectText(page, '50세 초과 2,000mg');
    const hrefs = await page.locator('[data-testid=src-link]').evaluateAll(a => a.map(x => x.href));
    if (!hrefs.includes('https://medlineplus.gov/ency/article/002412.htm')) throw new Error('R13 링크 없음');
    await expectText(page, '약사·의사와 상담하세요');
  },
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const errors = [];
for (const [id, fn] of Object.entries(S)) {
  const page = id === 'S1' ? await fresh(ctx) : await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errors.push(`${id}: ${m.text()}`); });
  page.on('pageerror', e => errors.push(`${id}: ${e.message}`));
  try { await fn(page); await noHorizontalScroll(page); results.push({ id, ok: true }); }
  catch (e) { results.push({ id, ok: false, why: e.message.split('\n')[0] }); if (SHOT) { fs.mkdirSync(outDir, { recursive: true }); await page.screenshot({ path: path.join(outDir, `fail-${id}.png`), fullPage: true }); } }
  await page.close();
}

if (SHOT) {
  fs.mkdirSync(outDir, { recursive: true });
  for (const vp of [{ n: 'desktop', w: 1280, h: 800 }, { n: 'mobile', w: 390, h: 844 }]) {
    for (const theme of ['light', 'dark']) {
      const c = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
      const page = await c.newPage();
      await page.goto(BASE);
      await page.evaluate(t => { try { localStorage.setItem('twopills.theme', t); } catch {} }, theme);
      await page.goto(BASE); await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(outDir, `landing-${vp.n}-${theme}.png`), fullPage: true });
      await loginAs(page, 'user@twopills.app', 'twopills1234');
      await page.goto(BASE + '#/list'); await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(outDir, `list-${vp.n}-${theme}.png`), fullPage: true });
      await page.goto(BASE + '#/analyze'); await page.getByTestId('analyze-start').click(); await page.waitForURL(/#\/report/); await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(outDir, `report-${vp.n}-${theme}.png`), fullPage: true });
      await c.close();
    }
  }
}
await browser.close();

for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.id}${r.why ? ' — ' + r.why : ''}`);
console.log(`console errors: ${errors.length}`); errors.forEach(e => console.log('  ' + e));
process.exit(results.every(r => r.ok) && errors.length === 0 ? 0 : 1);
