const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const base = process.env.TEST_URL || 'http://127.0.0.1:8000';
    await context.route('**/api/health', route => route.fulfill({ json: { speech: { ready: true } } }));
    await page.addInitScript(() => {
      Object.defineProperty(window, 'documentPictureInPicture', { value: undefined, configurable: true });
      navigator.mediaDevices.getDisplayMedia = async () => {
        const audio = new AudioContext();
        const destination = audio.createMediaStreamDestination();
        const tone = audio.createOscillator();
        tone.connect(destination); tone.start();
        await audio.resume();
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 100;
        canvas.getContext('2d').fillRect(0, 0, 100, 100);
        return new MediaStream([...destination.stream.getAudioTracks(), ...canvas.captureStream(5).getVideoTracks()]);
      };
    });
    let chunks = 0;
    await context.route('**/api/audio', async route => {
      const request = route.request();
      const bytes = request.postDataBuffer();
      assert.equal(bytes.subarray(0, 4).toString('hex'), '1a45dfa3', 'each recording starts with its own WebM header');
      chunks++;
      const response = await context.request.post(`${base}/api/interpret`, { data: {
        text: chunks === 1 ? 'Hello everyone, nice to' : chunks === 2 ? 'meet you. Let me introduce myself.' : '',
        session_id: request.headers()['x-session-id'], sequence: Number(request.headers()['x-chunk-sequence']),
      } });
      assert.equal(response.status(), 200);
      const result = await response.json();
      assert.equal(result.tokens.length, 0, 'real catalog has no approved assets');
      const fixtureTokens = result.translations.filter(r => r.construction_id).map(r => ({type: 'clip', value: r.construction_id}));
      await route.fulfill({ json: { ...result, tokens: fixtureTokens, preview_only: true, stt_ms: 10 } });
    });
    const videoData = readFileSync(resolve(__dirname, '../test-avatar.webm'));
    assert.ok(videoData.length > 100, 'generated video fixture is nonempty');
    await context.route('**/signs/manifest.json', route => route.fulfill({ json: {
      signs: {}, letters: {}, phrases: {
        GREETING: { video: 'test.webm' }, INTRODUCTION: { video: 'test.webm' },
      },
    } }));
    await context.route('**/signs/test.webm', route => {
      const data = Buffer.from(videoData);
      const match = /bytes=(\d+)-(\d*)/.exec(route.request().headers().range || '');
      if (!match) return route.fulfill({ contentType: 'video/webm', body: data });
      const start = Number(match[1]), end = match[2] ? Number(match[2]) : data.length - 1;
      return route.fulfill({ status: 206, contentType: 'video/webm', headers: {
        'Content-Range': `bytes ${start}-${end}/${data.length}`, 'Accept-Ranges': 'bytes',
      }, body: data.subarray(start, end + 1) });
    });
    await page.goto(`${base}/live.html`);
    await page.getByText('Team tools & demo setup', {exact:true}).click();
    const popupEvent = page.waitForEvent('popup');
    await page.getByRole('button', { name: 'Open floating avatar' }).click();
    const popup = await popupEvent;
    await popup.locator('canvas').waitFor();
    await popup.evaluate(() => {
      window.playedClips = [];
      document.querySelector('video').addEventListener('playing', () => window.playedClips.push(document.querySelector('.sb-status').textContent));
    });
    await page.getByRole('button', { name: 'Share YouTube tab audio' }).click();
    await page.getByText('Waiting for the rest of: Hello everyone, nice to', { exact: true }).waitFor({ timeout: 15000 });
    await page.getByText('GREETING → INTRODUCTION', { exact: true }).waitFor({ timeout: 15000 });
    try {
      await popup.waitForFunction(() => window.playedClips.includes('INTRODUCTION'), null, { timeout: 10000, polling: 100 });
    } catch (error) {
      console.log(await popup.evaluate(() => ({ played: window.playedClips, status: document.querySelector('.sb-status').textContent,
        video: document.querySelector('video').outerHTML, error: document.querySelector('video').error?.message,
        paused: document.querySelector('video').paused, muted: document.querySelector('video').muted,
        ready: document.querySelector('video').readyState, visible: document.visibilityState })));
      throw error;
    }
    assert.deepEqual(await popup.evaluate(() => window.playedClips), ['GREETING', 'INTRODUCTION']);
    await page.getByRole('button', { name: 'Stop capture', exact: true }).click();
    await page.getByText('Capture stopped.', { exact: true }).waitFor({ timeout: 15000 });
    assert.ok(chunks >= 2);
    assert.ok(await page.getByRole('button', { name: 'Share YouTube tab audio' }).isEnabled());
    assert.ok((await page.locator('#captions').textContent()).includes('nice to meet you'));
    assert.deepEqual(errors, []);
    await page.screenshot({ path: 'live-preview.png', fullPage: true });
    console.log('PASS: chunk recording, upload order, real meaning matching, popup queue and captions. Speech, assets and playback eligibility use explicit synthetic fixtures.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
