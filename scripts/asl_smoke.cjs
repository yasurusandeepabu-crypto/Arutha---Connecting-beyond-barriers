const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    if (process.env.DEBUG_ASL) page.on('console', msg => console.log(msg.type(), msg.text().slice(0,400)));
    await page.goto(process.env.TEST_URL || 'http://127.0.0.1:8001/live.html');
    await page.evaluate(async prefix => {
      const { createFloatingAvatar } = await import(`${prefix}/floating-window.js`);
      window.aslTest = createFloatingAvatar({brand:'SignBridge',manifestUrl:'/signs/manifest.json'});
      const button = document.createElement('button'); button.id = 'test-open'; button.textContent = 'Open test';
      button.onclick = async () => { await aslTest.open(); const pip = documentPictureInPicture.window; pip.events = []; pip.addEventListener('message', e => { if(e.data?.source==='arutha-cwasa') pip.events.push(e.data); }); };
      document.body.prepend(button);
    }, process.env.RUNTIME_PREFIX || '');
    await page.locator('#test-open').click();
    await page.waitForFunction(() => documentPictureInPicture.window?.events?.some(e=>e.type==='ready'),null,{timeout:90000});
    const signs = await page.evaluate(async () => (await (await fetch('/api/signs')).json()).signs);
    for (const sign of signs) {
      await page.evaluate(async sign => {
        const plan = await (await fetch('/api/translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:sign.replaceAll('-',' ')})})).json();
        if(plan.tokens[0]?.value!==sign) throw new Error(`No token for ${sign}`);
        documentPictureInPicture.window.events = [];
        aslTest.enqueue(plan);
      }, sign);
      await page.waitForFunction(() => documentPictureInPicture.window.events.some(e=>e.type==='ended'),null,{timeout:25000}).catch(async error => {
        console.log('Events:',await page.evaluate(() => documentPictureInPicture.window.events));
        console.log('Status:',await page.evaluate(() => documentPictureInPicture.window.document.querySelector('.sb-status').textContent));
        console.log('Frame:',await page.evaluate(() => { const w=documentPictureInPicture.window.document.querySelector('iframe').contentWindow; return w.eval('({ready,active,origin:location.origin,parentOrigin:parent.location.origin})'); }));
        console.log('Errors:',errors); throw error;
      });
      const events = await page.evaluate(() => documentPictureInPicture.window.events);
      assert.ok(events.some(e=>e.type==='generated' && e.frames>0),`${sign} must generate actual animation`);
      assert.ok(!events.some(e=>e.type==='failed'),`${sign} must render`);
      console.log(`PASS ${sign}: ${events.find(e=>e.type==='generated').frames} frames`);
    }
    await page.evaluate(() => { aslTest.enqueue({text:'Hello',tokens:[{type:'sign',value:'HELLO'}],preview_only:true}); aslTest.stop(); });
    await page.evaluate(() => documentPictureInPicture.window.close());
    await page.locator('#test-open').click();
    await page.waitForFunction(() => documentPictureInPicture.window?.events?.some(e=>e.type==='ready'),null,{timeout:90000});
    await page.evaluate(() => aslTest.enqueue({text:'Help',tokens:[{type:'sign',value:'HELP'}],preview_only:true}));
    await page.waitForFunction(() => documentPictureInPicture.window.events.some(e=>e.type==='ended'),null,{timeout:25000});
    assert.equal(await page.evaluate(() => documentPictureInPicture.window.document.querySelector('.sb-language-chip').textContent),'ASL · DEMO');
    await page.evaluate(() => documentPictureInPicture.window.resizeTo(340,690));
    await page.waitForTimeout(300);
    const pipPage = page.context().pages().find(p=>p!==page);
    if(pipPage) await pipPage.screenshot({path:'asl-floating-preview.png'});
    assert.deepEqual(errors,[]);
    console.log('PASS: all 14 ASL files animate in native PiP; queue, stop and reopening work. Rendering is not linguistic validation.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
