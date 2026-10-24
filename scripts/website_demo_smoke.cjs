const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      window.avatarEvents = [];
      addEventListener('message', e => { if(e.data?.source === 'arutha-cwasa') avatarEvents.push(e.data); });
      navigator.mediaDevices.getUserMedia = async constraints => {
        window.micConstraints = constraints;
        const audio = new AudioContext(), tone = audio.createOscillator(), sink = audio.createMediaStreamDestination();
        tone.connect(sink); tone.start(); await audio.resume();
        window.testMic = sink.stream;
        return sink.stream;
      };
      navigator.mediaDevices.getDisplayMedia = async () => { throw new Error('Microphone mode must not open the tab picker'); };
    });
    await page.goto(process.env.TEST_URL || 'http://127.0.0.1:8000');
    await page.getByRole('heading',{name:'See the avatar sign. Then try live audio.'}).waitFor();
    await page.waitForFunction(()=>avatarEvents.some(e=>e.type==='ready'),null,{timeout:90000});
    assert.equal(await page.locator('#inline-avatar iframe').count(),1);
    await page.getByRole('button',{name:'Play 14-sign text demo',exact:true}).click();
    await page.waitForFunction(()=>avatarEvents.filter(e=>e.type==='ended').length>=16,null,{timeout:90000});
    const queued = await page.locator('.session-token-list b').allTextContents();
    assert.equal(new Set(queued).size,14);
    assert.equal(queued.length,16);
    assert.equal(await page.evaluate(()=>avatarEvents.filter(e=>e.type==='generated' && e.frames>0).length),16);
    await page.locator('#session').screenshot({path:'website-asl-demo.png'});
    await page.getByRole('button',{name:'Open companion',exact:true}).click();
    await page.waitForFunction(()=>!!documentPictureInPicture.window?.document.querySelector('iframe'));
    assert.equal(await page.locator('#inline-avatar iframe').count(),0,'Only one renderer should exist');
    await page.evaluate(()=>documentPictureInPicture.window.close());
    await page.waitForFunction(()=>document.querySelector('#inline-avatar')?.dataset.floating==='false');
    await page.waitForFunction(()=>document.querySelector('#inline-avatar iframe')?.contentWindow?.eval('ready'),null,{timeout:90000});
    let audioRequests=0;
    await page.route('**/api/audio',async route=>{
      audioRequests++;
      const body=route.request().postDataBuffer();
      assert.ok(body.length>100,'Microphone must send recorded audio');
      assert.equal(body.subarray(0,4).toString('hex'),'1a45dfa3','Each chunk must have a complete WebM header');
      const response=await page.request.post(new URL('/api/translate',page.url()).href,{data:{text:'Hello. Thank you.'}});
      await route.fulfill({status:200,contentType:'application/json',body:await response.text()});
    });
    const load=page.getByRole('button',{name:'Load speech engine',exact:true});
    if(await load.isVisible()) {await load.click();await page.waitForFunction(()=>!document.querySelector('.session-actions button')?.textContent.includes('Loading'),null,{timeout:180000});}
    await page.locator('.session-clear').click();
    await page.getByRole('button',{name:'Use microphone',exact:true}).click();
    await page.getByText('Live audio',{exact:true}).waitFor();
    await page.waitForFunction(()=>document.querySelector('.session-captions')?.textContent.includes('Thank you.'),null,{timeout:20000});
    await page.getByRole('button',{name:'Stop listening',exact:true}).last().click();
    await page.getByText('Capture stopped.',{exact:true}).waitFor({timeout:15000});
    assert.ok(audioRequests>0);
    assert.ok(await page.evaluate(()=>micConstraints.audio && testMic.getTracks().every(t=>t.readyState==='ended')));
    await page.setViewportSize({width:390,height:844});
    await page.locator('#session').scrollIntoViewIfNeeded();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.locator('#session').screenshot({path:'website-asl-demo-mobile.png'});
    assert.deepEqual(errors,[]);
    console.log('PASS: visible website avatar, real 16-animation text queue covering all 14 signs, move to PiP and return, synthetic microphone capture with mocked speech response, cleanup and mobile layout.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
