const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext({
      permissions: ['camera'],
      acceptDownloads: true,
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const base = process.env.TEST_URL || 'http://127.0.0.1:8000';
    await page.goto(`${base}/index.html`);
    await page.getByText('Ready · 0 recorded signs', { exact: true }).waitFor();
    const invalid = await page.request.post(`${base}/api/gloss`, { data: { text: '' } });
    assert.equal(invalid.status(), 400);
    const popupEvent = page.waitForEvent('popup');
    await page.getByRole('button', { name: 'Open separate avatar window' }).click();
    const popup = await popupEvent;
    await popup.locator('.sb-status').waitFor();
    await page.locator('#text').fill('Hello Nimal');
    await page.getByRole('button', { name: 'Plan & play' }).click();
    await popup.getByText('Hello Nimal', { exact: true }).waitFor();
    assert.ok((await page.locator('#plan').textContent()).includes('UNSUPPORTED'));
    await page.getByRole('button', { name: 'Stop playback' }).click();
    assert.equal(await page.locator('.sb-status').textContent(), 'Stopped');
    const header = page.locator('.signbridge-float header');
    const box = await header.boundingBox();
    await page.mouse.move(box.x + 30, box.y + 15);
    await page.mouse.down();
    await page.mouse.move(400, 100);
    await page.mouse.up();
    assert.ok(await page.locator('.signbridge-float').evaluate(el => el.style.left !== ''));

    const pose = [[0,-.65],[-.5,0],[.5,0],[-.7,.7],[.7,.7],[-.4,1.3],[.4,1.3]];
    await context.route('**/signs/manifest.json', route => route.fulfill({ json: { signs: { HELLO: { motion: 'test.json' } }, letters: {} } }));
    await context.route('**/signs/test.json', route => route.fulfill({ json: { fps: 10, frames: [
      { pose, lh: null, rh: null },
      { pose: pose.map(([x,y], i) => [x, i === 6 ? y - .5 : y]), lh: null, rh: null },
    ] } }));
    await context.route('**/api/gloss', route => route.fulfill({ json: {
      text: 'Hello', tokens: [{type: 'sign', value: 'HELLO'}], frames: [], flags: [], review_status: 'TEST_FIXTURE', gloss_ms: 0,
    } }));
    await page.reload();
    await page.getByText('Ready · 1 recorded signs', { exact: true }).waitFor();
    await page.locator('#text').fill('Hello');
    await page.getByRole('button', { name: 'Plan & play' }).click();
    await page.locator('.sb-status').filter({ hasText: /^HELLO$/ }).waitFor();
    await page.waitForTimeout(700);
    assert.equal(await page.locator('.sb-status').textContent(), 'HELLO');
    assert.ok(await page.locator('canvas').isVisible());
    assert.deepEqual(errors, []);
    await page.screenshot({ path: process.env.SCREENSHOT_PATH || 'signbridge-preview.png', fullPage: true });
    await page.goto(`${base}/record.html`);
    assert.ok(await page.getByRole('button', { name: 'Enable camera' }).isVisible());
    console.log('PASS: planning API, no-asset labels, popup delivery, stop, dragging, synthetic motion playback, recorder page; no page errors.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
