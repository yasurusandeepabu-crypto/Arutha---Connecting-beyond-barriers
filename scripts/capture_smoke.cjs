const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true,
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  try {
    const context = await browser.newContext({ permissions: ['camera'] });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const base = process.env.TEST_URL || 'http://127.0.0.1:8000';
    await page.goto(`${base}/capture.html`);
    await page.getByRole('button', { name: 'Start camera & tracking' }).click();
    await page.getByText('Tracking ready. Enter a sign label and capture one short movement.', { exact: true }).waitFor({ timeout: 60000 });
    await page.getByText(/Tracking lost: show shoulders/).waitFor();
    await page.getByRole('button', { name: 'Capture movement' }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Finish capture' }).click();
    await page.getByText(/Too much missing body tracking|Capture at least five tracked/).waitFor();
    await page.getByRole('button', { name: 'Camera off', exact: true }).click();
    assert.ok(await page.getByRole('button', { name: 'Start camera & tracking' }).isEnabled());
    const pose = [[0,-.65],[-.5,0],[.5,0],[-.7,.7],[.7,.7],[-.4,1.3],[.4,1.3]];
    const motion = { gloss: 'HELLO', fps: 30, frames: Array.from({ length: 30 }, () => ({ pose, lh: null, rh: null })) };
    await page.locator('#import').setInputFiles({ name: 'HELLO.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(motion)) });
    await page.getByText('Imported HELLO into the local SLSL library.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Replay', exact: true }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'capture-preview.png', fullPage: true });
    await page.goto(`${base}/index.html`);
    await page.getByText('Ready · 1 recorded signs', { exact: true }).waitFor();
    assert.ok(await page.locator('canvas').isVisible());
    assert.deepEqual(errors, []);
    console.log('PASS: real tracking models, fake camera, loss rejection, camera off, motion import, replay and library loading in the debug player.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
