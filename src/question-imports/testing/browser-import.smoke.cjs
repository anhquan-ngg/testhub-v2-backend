const assert = require('node:assert/strict');
const path = require('node:path');
const crypto = require('node:crypto');
const puppeteer = require('puppeteer');

// Only use a separately built frontend with synthetic auth and the disposable API.
const frontend = process.env.IMPORT_TEST_FRONTEND;
const api = process.env.IMPORT_TEST_API;
const secret = process.env.IMPORT_TEST_SECRET;
if (
  !frontend ||
  !api ||
  !secret ||
  !frontend.startsWith('http://127.0.0.1:') ||
  !api.startsWith('http://127.0.0.1:')
) {
  throw new Error(
    'Supply isolated loopback IMPORT_TEST_FRONTEND, IMPORT_TEST_API and IMPORT_TEST_SECRET',
  );
}
const fixtures = path.resolve(__dirname, '..', 'parsers', 'fixtures');
const expected = require('../parsers/fixtures/import-expected.json');
const results = [];
const tokenPart = (value) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');
const signingInput = `${tokenPart({ alg: 'HS256', typ: 'JWT' })}.${tokenPart({ role: 'LECTURER', sid: 'isolated-browser-session', token_use: 'access', exp: Math.floor(Date.now() / 1000) + 3600 })}`;
const token = `${signingInput}.${crypto.createHmac('sha256', secret).update(signingInput).digest('base64url')}`;
const apiGet = async (url) => {
  const response = await fetch(api + url);
  assert.equal(response.status, 200);
  return response.json();
};

(async () => {
  assert.equal(
    (await apiGet('/questions?limit=100')).total,
    0,
    'Use a fresh disposable harness database',
  );
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000 });
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await browser.setCookie({
      name: 'access_token',
      value: token,
      url: frontend,
      httpOnly: true,
    });
    await page.setRequestInterception(true);
    let failReviewOnce = false;
    let loseCommitOnce = false;
    const commits = [];
    page.on('request', async (request) => {
      const url = new URL(request.url());
      if (
        url.origin !== new URL(api).origin &&
        url.origin !== new URL(frontend).origin &&
        !['data:', 'blob:'].includes(url.protocol)
      ) {
        return request.abort();
      }
      const headers = {
        'content-type': 'application/json',
        'access-control-allow-origin': frontend,
        'access-control-allow-credentials': 'true',
      };
      if (url.origin === new URL(api).origin && url.pathname === '/auth/me') {
        return request.respond({
          status: 200,
          headers,
          body: JSON.stringify({
            id: 'isolated-ui-lecturer',
            full_name: 'Isolated UI Lecturer',
            email: 'fixture@example.invalid',
            role: 'LECTURER',
          }),
        });
      }
      if (
        failReviewOnce &&
        request.method() === 'GET' &&
        /\/question-imports\/[^/]+\/items$/.test(url.pathname)
      ) {
        failReviewOnce = false;
        return request.respond({
          status: 503,
          headers,
          body: JSON.stringify({ message: 'Isolated review failure' }),
        });
      }
      if (
        request.method() === 'POST' &&
        /\/question-imports\/[^/]+\/commit$/.test(url.pathname)
      ) {
        commits.push(url.pathname);
        if (loseCommitOnce) {
          loseCommitOnce = false;
          const response = await fetch(request.url(), {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: request.postData(),
          });
          assert.equal(response.status, 201);
          return request.abort();
        }
      }
      return request.continue();
    });
    const click = async (name) => {
      try {
        const handle = await page.waitForSelector(`::-p-aria(${name})`, {
          timeout: 10000,
        });
        await handle.click();
      } catch (error) {
        console.error(
          'Browser state:',
          page.url(),
          await page.$eval('body', (el) => el.innerText),
        );
        throw error;
      }
    };
    const textVisible = async (text) =>
      page.waitForFunction(
        (s) => document.body.innerText.includes(s),
        {},
        text,
      );
    const upload = async (file, locale = 'vi') => {
      await page.goto(`${frontend}/${locale}/lecturer/questions/import`, {
        waitUntil: 'networkidle0',
      });
      await click(locale === 'vi' ? 'Chủ đề' : 'Topic');
      await click('Isolated import subject');
      const input = await page.waitForSelector('input[type=file]');
      await input.uploadFile(path.join(fixtures, file));
      await click(locale === 'vi' ? 'Tải lên và kiểm tra' : 'Upload and check');
    };
    failReviewOnce = true;
    await upload('mixed.xlsx');
    await textVisible('Isolated review failure');
    await click('Thử lại');
    await textVisible('Nhập 3 câu hỏi');
    await page.waitForSelector('button[aria-label="Chỉnh sửa"]');
    await page.click('button[aria-label="Chỉnh sửa"]');
    assert.ok(
      (
        await page.$eval(
          'textarea[aria-label="Nội dung lựa chọn C"]',
          (el) => el.value,
        )
      ).includes('\n'),
    );
    assert.equal(
      await page.$eval('button::-p-text(Nhập 3 câu hỏi)', (el) => el.disabled),
      true,
    );
    await click('Thêm lựa chọn');
    const added = await page.waitForSelector(
      'textarea[aria-label="Nội dung lựa chọn B"]',
    );
    await added.type('UI test option\nSecond line');
    await click('Lưu và kiểm tra lại');
    await page.waitForFunction(
      () => !document.body.innerText.includes('Sửa dòng import'),
    );
    await page.click('button[aria-label="Chỉnh sửa"]');
    assert.equal(
      await page.$eval(
        'textarea[aria-label="Nội dung lựa chọn B"]',
        (el) => el.value,
      ),
      'UI test option\nSecond line',
    );
    await click('Đóng');
    loseCommitOnce = true;
    await click('Nhập 3 câu hỏi');
    await textVisible('Hoàn tất');
    assert.equal(commits.length, 1);
    const saved = await apiGet('/questions?limit=100');
    assert.equal(saved.total, 3);
    const first = saved.data.find(
      (q) => q.question_text === expected.questions[0].questionText,
    );
    assert.ok(first);
    const options =
      typeof first.options === 'string'
        ? JSON.parse(first.options)
        : first.options;
    assert.ok(
      options.some(
        (option) =>
          option.text === 'UI test option\nSecond line' && !option.isCorrect,
      ),
    );
    assert.equal(options.filter((option) => option.isCorrect).length, 1);
    results.push(
      'XLSX upload, failed-review retry, gap-key edit, multiline save, lost-commit recovery, PostgreSQL persistence',
    );

    await upload('mixed.docx');
    await textVisible('Nhập 3 câu hỏi');
    const edit = await page.waitForSelector('button[aria-label="Chỉnh sửa"]');
    await edit.hover();
    await page.waitForSelector('[role=tooltip]');
    await page.mouse.move(0, 0);
    for (const width of [1440, 1024, 768, 375]) {
      await page.setViewport({ width, height: 1000 });
      await page
        .waitForFunction(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
          { timeout: 3000 },
        )
        .catch(async () => {
          console.error(
            'Table ancestors',
            await page.$eval('table', (el) => {
              const values = [];
              for (let node = el; node; node = node.parentElement) {
                const rect = node.getBoundingClientRect();
                const css = getComputedStyle(node);
                values.push({
                  tag: node.tagName,
                  classes: node.className,
                  width: rect.width,
                  left: rect.left,
                  right: rect.right,
                  overflow: css.overflow,
                  position: css.position,
                  transform: css.transform,
                });
              }
              return values;
            }),
          );
        });
      const layout = await page.evaluate(() => ({
        viewport: innerWidth,
        width: document.documentElement.scrollWidth,
        overflowing: [...document.querySelectorAll('body *')]
          .filter(
            (el) =>
              el.getBoundingClientRect().right > innerWidth + 1 &&
              getComputedStyle(el).overflowX !== 'auto',
          )
          .slice(0, 8)
          .map((el) => ({
            tag: el.tagName,
            classes: el.className,
            right: el.getBoundingClientRect().right,
          })),
      }));
      assert.ok(
        layout.width <= width + 1,
        `Page overflow: ${JSON.stringify(layout)}`,
      );
    }
    await page.setViewport({ width: 1440, height: 1000 });
    await click('Nhập 3 câu hỏi');
    await textVisible('Hoàn tất');
    const afterWord = await apiGet('/questions?limit=100');
    assert.equal(afterWord.total, 4); // Edited first XLSX question differs; remaining two are skipped.
    results.push(
      'DOCX upload/review/commit; existing duplicates skipped; VI tooltip; responsive widths',
    );
    await upload('unknown-answer.docx', 'en');
    await textVisible('Needs correction 1');
    await textVisible('Selected 2');
    assert.equal(
      await page.$$eval(
        'tbody button[role=checkbox][disabled]',
        (els) => els.length,
      ),
      1,
    );
    await page.hover('button[aria-label="Edit"]');
    await page.waitForFunction(() =>
      [...document.querySelectorAll('[role=tooltip]')].some(
        (el) => el.textContent === 'Edit',
      ),
    );
    await page.click('button[aria-label="Edit"]');
    assert.equal(
      await page.$eval(
        'textarea[aria-label="Option C content"]',
        (el) => el.value,
      ),
      expected.questions[0].options[1].text,
    );
    const disabledTooltip = await page.waitForSelector(
      'span[tabindex="0"]:has(button[aria-label="Delete"][disabled])',
    );
    await disabledTooltip.focus();
    await page.waitForFunction(() =>
      [...document.querySelectorAll('[role=tooltip]')].some(
        (el) => el.textContent === 'Delete',
      ),
    );
    await click('Close');
    await click('Cancel');
    assert.equal((await apiGet('/questions?limit=100')).total, 4);
    results.push(
      'Invalid Word answer excluded from selection; EN edit/delete tooltip and disabled keyboard focus; cancel creates no questions',
    );
    assert.deepEqual(pageErrors, []);
    console.log(JSON.stringify({ passed: results, pageErrors }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
