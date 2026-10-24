const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel:'chrome', headless:true });
  try {
    const context = await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',acceptDownloads:true});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const base = process.env.TEST_URL || 'http://127.0.0.1:8000';
    await page.addInitScript(() => {
      navigator.mediaDevices.getDisplayMedia = async () => {
        const audio = new AudioContext(), sink = audio.createMediaStreamDestination();
        const tone = audio.createOscillator(); tone.connect(sink); tone.start(); await audio.resume();
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 100;
        canvas.getContext('2d').fillRect(0,0,100,100);
        window.testSharedStream = new MediaStream([...sink.stream.getTracks(),...canvas.captureStream(5).getTracks()]);
        return window.testSharedStream;
      };
    });
    await page.goto(base);
    await page.getByRole('heading',{name:'A world that speaks. A screen that signs.'}).waitFor();
    assert.ok((await page.title()).includes('SignBridge'));
    await page.waitForFunction(()=>[...document.images].every(image=>image.complete));
    await page.evaluate(()=>document.fonts.ready);
    for (let y=0;y<await page.evaluate(()=>document.body.scrollHeight);y+=700) {
      await page.evaluate(y=>scrollTo(0,y),y); await page.waitForTimeout(120);
    }
    await page.evaluate(()=>scrollTo(0,0)); await page.waitForTimeout(700);
    await page.screenshot({path:'arutha-desktop-preview.png',fullPage:true});
    await page.getByRole('link',{name:'Open Your Signing Companion',exact:true}).nth(1).click();
    await page.getByRole('region',{name:'Live signing session'}).waitFor();
    await page.waitForFunction(()=>!!window.documentPictureInPicture?.window);
    assert.ok(await page.evaluate(()=>window.documentPictureInPicture.window.document.querySelector('header strong').textContent.includes('SignBridge')));
    const load = page.getByRole('button',{name:'Load speech engine',exact:true});
    if (await load.isVisible()) {
      await load.click();
      await page.getByText('Speech engine ready. Choose your video tab and enable Share tab audio.',{exact:true}).waitFor({timeout:180000});
    }
    await page.getByRole('button',{name:'Share tab audio',exact:true}).click();
    await page.getByText('Listening',{exact:true}).waitFor();
    assert.ok(await page.getByRole('button',{name:'Stop listening',exact:true}).isEnabled());
    await page.evaluate(()=>window.documentPictureInPicture.window.close());
    await page.getByText('Capture stopped.',{exact:true}).waitFor({timeout:20000});
    assert.ok(await page.evaluate(()=>window.testSharedStream.getTracks().every(track=>track.readyState==='ended')));
    await page.getByText('Team tools & translation checks',{exact:true}).click();
    await page.getByLabel('No-key text test',{exact:true}).fill("Hello. Thank you. I don't want help.");
    await page.getByRole('button',{name:'Interpret text',exact:true}).click();
    await page.locator('.session-tools pre').filter({hasText:'"language": "ASL"'}).waitFor();
    assert.ok((await page.locator('.session-tools pre').textContent()).includes("DON'T"));
    await page.getByLabel('Prototype feedback',{exact:true}).fill('Synthetic test feedback for the Arutha prototype.');
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button',{name:'Download feedback',exact:true}).click();
    const download = await downloadEvent;
    assert.equal(download.suggestedFilename(),'signbridge-feedback.json');
    assert.equal(JSON.parse(readFileSync(await download.path(),'utf8')).feedback,'Synthetic test feedback for the Arutha prototype.');
    const phone = await context.newPage();
    await phone.setViewportSize({width:390,height:844});
    await phone.goto(base);
    await phone.getByRole('button',{name:'Open navigation menu'}).click();
    assert.ok(await phone.getByRole('link',{name:'How it works',exact:true}).first().isVisible());
    await phone.getByRole('button',{name:'Close navigation menu'}).click();
    for(let y=0;y<await phone.evaluate(()=>document.body.scrollHeight);y+=700){await phone.evaluate(y=>scrollTo(0,y),y);await phone.waitForTimeout(100);}
    await phone.evaluate(()=>scrollTo(0,0)); await phone.waitForTimeout(600);
    assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await phone.screenshot({path:'arutha-mobile-preview.png',fullPage:true});
    assert.deepEqual(errors,[]);
    console.log('PASS: designer UI, local assets, real companion PiP, synthetic tab capture and cleanup, real translation, feedback download and mobile layout.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
