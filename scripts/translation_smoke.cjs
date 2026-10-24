const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const base = process.env.TEST_URL || 'http://127.0.0.1:8000';
    await page.goto(`${base}/live.html`);
    await page.getByText('Team tools & demo setup', {exact:true}).click();
    await page.getByText(/AGE-NINE.*PENDING/).waitFor();
    const preview = page.getByRole('checkbox', {name:'Preview unverified team clips (review only)'});
    assert.equal(await preview.isChecked(), false);
    await page.getByText('No-key text test', {exact:true}).click();
    await page.locator('#text').fill("I don't like cats. I am nineteen years old. My name is Sarah.");
    await page.getByRole('button', {name:'Interpret text',exact:true}).click();
    await page.getByText('Some signing needs review. Captions remain available.',{exact:true}).waitFor();
    const report = JSON.parse(await page.locator('#translation-report').textContent());
    assert.equal(report.frames[0].polarity, 'NEGATIVE');
    assert.equal(report.frames[1].slots.age, '19');
    assert.equal(report.frames[2].slots.name, 'sarah');
    assert.equal(report.timeline.items.length, 0);
    await page.locator('#text').fill('I like cats.');
    await page.getByRole('button', {name:'Interpret text',exact:true}).click();
    await page.getByText(/UNVERIFIED_CONSTRUCTION: LIKE-CATS/).waitFor();
    await page.getByText(/MISSING_ANIMATION: No local video or motion asset for LIKE-CATS/).waitFor();
    const response = await page.request.post(`${base}/api/translate`, {data:{text:'I like cats.',preview_unverified:true}});
    const data = await response.json();
    assert.equal(response.status(), 200);
    assert.equal(data.translations[0].construction_id, 'LIKE-CATS');
    assert.deepEqual(data.tokens, []);
    assert.deepEqual(errors, []);
    await page.screenshot({path:'translation-preview.png',fullPage:true});
    console.log('PASS: real translation API and UI, explicit review mode, negation, age/name preservation, pending review and missing-asset gating; no mocked responses.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
