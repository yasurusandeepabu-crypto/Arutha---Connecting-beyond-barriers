const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
  try {
    const page = await browser.newPage({viewport:{width:1100,height:850}});
    const errors = [], failed = [];
    page.on('pageerror', error => errors.push(error.stack));
    page.on('requestfailed', request => failed.push({url:request.url(),error:request.failure()?.errorText}));
    await page.goto('https://vhg.cmp.uea.ac.uk/tech/jas/vhg2026/CWASA-plus-gui-panel.html',{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(()=>!!window.CWASA?.playSiGMLText && document.querySelectorAll('canvas').length>0,null,{timeout:60000});
    await page.evaluate(async()=>{await CWASA.ready;window.cwasaProbe=[];for(const type of ['status','avatarready','avatarloading','avatarloaded','sigmlloaded','animactive','animidle'])CWASA.addHook(type,event=>window.cwasaProbe.push({...event,type}));});
    console.log(await page.evaluate(()=>({play: CWASA.playSiGMLURL.toString(),selects:[...document.querySelectorAll('select')].map(s=>s.outerHTML)})));
    await page.locator('select').first().selectOption('anna');
    await page.waitForFunction(()=>window.cwasaProbe.some(event=>event.type==='avatarready'),null,{timeout:60000,polling:100}).catch(error=>console.log('Avatar readiness:',error.message));
    await page.evaluate(()=>CWASA.playSiGMLURL('https://vhg.cmp.uea.ac.uk/tech/jas/vhg2026/sigml/iTakeMug.sigml',0));
    await page.waitForFunction(()=>window.cwasaProbe.some(event=>event.type==='sigmlloaded'),null,{timeout:60000,polling:100});
    await page.waitForFunction(()=>window.cwasaProbe.some(event=>event.type==='animidle'),null,{timeout:30000,polling:100});
    assert.ok(await page.evaluate(()=>window.cwasaProbe.some(event=>event.type==='sigmlloaded' && event.msg?.s>0)),'SiGML must generate sign frames');
    assert.deepEqual(errors,[],'Renderer should not produce JavaScript errors');
    console.log(JSON.stringify({events:await page.evaluate(()=>window.cwasaProbe),errors,failed},null,2));
    await page.screenshot({path:'cwasa-reference-check.png'});
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
