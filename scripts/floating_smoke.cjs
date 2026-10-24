const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const {readFileSync,writeFileSync,unlinkSync} = require('node:fs');
const {resolve} = require('node:path');

(async () => {
  const fixtureName = `.native-${Date.now()}.webm`;
  const fixturePath = resolve(__dirname,'../avatar/signs',fixtureName);
  writeFileSync(fixturePath,readFileSync(resolve(__dirname,'../test-avatar.webm')),{flag:'wx'});
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const base = process.env.TEST_URL || 'http://127.0.0.1:8000';
    await page.addInitScript(() => {
      navigator.mediaDevices.getDisplayMedia = async () => {
        const audio = new AudioContext();
        const sink = audio.createMediaStreamDestination();
        const tone = audio.createOscillator(); tone.connect(sink); tone.start(); await audio.resume();
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 100;
        canvas.getContext('2d').fillRect(0,0,100,100);
        window.testSharedStream = new MediaStream([...sink.stream.getTracks(), ...canvas.captureStream(5).getTracks()]);
        return window.testSharedStream;
      };
    });
    await page.goto(`${base}/live.html`);
    const health = await (await page.request.get(`${base}/api/health`)).json();
    const speechReady = health.speech.ready;
    assert.ok(!await page.locator('.signbridge-float').isVisible());
    assert.ok(!await page.getByRole('button', {name:'Share YouTube tab audio'}).isEnabled());
    const native = await page.evaluate(() => !!window.documentPictureInPicture?.requestWindow);
    assert.ok(native, 'Chrome exposes Document Picture-in-Picture');
    await page.getByRole('button', {name:'Open floating avatar'}).click();
    await page.getByText(/Avatar stays above other windows/).waitFor();
    assert.equal(await page.getByRole('button', {name:'Share YouTube tab audio'}).isEnabled(), speechReady);
    assert.ok(await page.evaluate(() => {
      const pip = window.documentPictureInPicture.window;
      return pip.document.querySelector('canvas').ownerDocument === pip.document && pip.document.querySelector('.floating-controls').textContent.includes('Stop listening');
    }));
    // Use a second normal tab to exercise the detached avatar while the launcher loses focus.
    const other = await context.newPage();
    await other.goto('about:blank');
    await page.evaluate(async () => {
      const pip = window.documentPictureInPicture.window;
      await new Promise(resolve => pip.requestAnimationFrame(resolve));
      pip.document.querySelector('.sb-status').textContent = 'Floating window responsive';
      const {SignBridgePlayer} = await import('/player.js');
      const player = new SignBridgePlayer({canvas:pip.document.querySelector('canvas'),video:pip.document.querySelector('video'),status:pip.document.querySelector('.sb-status'),caption:pip.document.querySelector('.sb-caption')});
      window.floatingFixturePlayer = player;
      await player.ready;
      const pose = [[0,-.65],[-.5,0],[.5,0],[-.7,.7],[.7,.7],[-.4,1.3],[.4,1.3]];
      const motion = {fps:30,frames:Array.from({length:8},()=>({pose,lh:null,rh:null}))};
      window.floatingMotionDone = false;
      player.playAsset({motionData:motion},'Synthetic test',player.generation).then(()=>window.floatingMotionDone=true);
    });
    await page.waitForFunction(()=>window.floatingMotionDone,null,{polling:100,timeout:5000});
    assert.ok(await page.evaluate(name=>window.floatingFixturePlayer.playAsset({video:name},'Synthetic video',window.floatingFixturePlayer.generation),fixtureName));
    await page.evaluate(() => window.documentPictureInPicture.window.close());
    await page.getByText(/Avatar closed/).waitFor();
    assert.ok(!await page.getByRole('button', {name:'Share YouTube tab audio'}).isEnabled());
    await page.getByRole('button', {name:'Open floating avatar'}).click();
    await page.getByText(/Avatar stays above other windows/).waitFor();
    if (speechReady) {
      await page.getByRole('button',{name:'Share YouTube tab audio'}).click();
      await page.getByText('Capturing shared tab audio in 4-second chunks.',{exact:true}).waitFor();
    }
    await page.evaluate(() => window.documentPictureInPicture.window.close());
    if (speechReady) {
      await page.getByText('Capture stopped.',{exact:true}).waitFor({timeout:10000});
      assert.ok(await page.evaluate(()=>window.testSharedStream.getTracks().every(track=>track.readyState==='ended')));
    } else await page.getByText(/Avatar closed/).waitFor();
    await page.bringToFront();
    await page.screenshot({path:'floating-launcher-preview.png',fullPage:true});
    assert.deepEqual(errors, []);
    console.log(`PASS: real Chrome PiP, motion and real served video away from launcher, reopen; capture cleanup ${speechReady?'verified':'skipped (speech not prepared)'}. No network mocks or embedded avatar.`);
  } finally {await browser.close();unlinkSync(fixturePath);}
})().catch(error=>{console.error(error);process.exitCode=1;});
