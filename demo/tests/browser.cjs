// Optional browser QA: node tests/browser.cjs [path-to-playwright-module]
const {chromium}=require(process.argv[2]||'playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const page=await context.newPage(); const errors=[],checks=[];
  page.on('pageerror',e=>errors.push(e.message));
  const check=(name)=>{checks.push(name);console.log('PASS '+name);};
  const url='http://127.0.0.1:4173/?machine=ntut-document-kiosk&demo=1';
  const heading=async text=>{await page.getByRole('heading',{level:1,name:text,exact:true}).waitFor();};
  const click=async name=>page.getByRole('button',{name,exact:true}).click();
  async function layout() {
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'horizontal overflow');
    assert.equal(await page.locator('h1').count(),1);
    const missing=await page.locator('button:visible').evaluateAll(bs=>bs.filter(b=>!b.textContent.trim()&&!b.getAttribute('aria-label')).length);assert.equal(missing,0);
    const small=await page.locator('button:visible').evaluateAll(bs=>bs.filter(b=>{const r=b.getBoundingClientRect();return r.width<44||r.height<44}).map(b=>b.textContent));assert.deepEqual(small,[]);
  }
  async function start() {await page.goto(url);await click('開始操作');await click('中文版 · 繼續');await click('學生／校友');}
  async function service() {await click('使用 Demo 身分繼續');await heading('選擇申請文件');await page.getByRole('button',{name:/中文成績名次證明書 · NT\$20/}).click();await click('確認份數');await click('在校各學期系科所名次');}
  await page.goto('http://127.0.0.1:4173/');await heading('等待連接機台');
  await page.goto('http://127.0.0.1:4173/?machine=unknown');await heading('無法識別這台機器');check('missing / unknown machine routing');
  await start();
  await page.locator('#student-id').fill('00000000');await page.locator('#birthday').fill('99999999');await click('驗證測試資料');
  assert.equal(await page.locator('#student-id').getAttribute('aria-invalid'),'true');assert.equal(await page.evaluate(()=>document.activeElement.id),'student-id');check('mock-only authentication validation and error focus');
  await service();await heading('選擇學年期');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'step-title');
  await layout();
  // In this browser force the enhancement absent without making ordinary controls unusable.
  await page.evaluate(()=>{window.SpeechRecognition=undefined;window.webkitSpeechRecognition=undefined;});
  await click('使用語音選擇');await click('114 學年度第 2 學期');await heading('確認申請');
  assert.match(await page.locator('#main').innerText(),/NT\$20/);check('R2 document/rank/semester/20 NTD happy path and recognition fallback');
  await click('啟用隱私模式');
  assert.equal(await page.locator('#surface').evaluate(e=>getComputedStyle(e).opacity),'0');
  const aria=await page.locator('#main').ariaSnapshot();assert.match(aria,/確認申請/);assert.match(aria,/中文成績名次證明書/);
  assert.equal(await page.locator('#surface').getAttribute('aria-hidden'),null);
  await page.locator('#private-exit').click();check('private mode keeps interactive accessibility tree');
  for(const width of [320,375,390,430]) {await page.setViewportSize({width,height:844});await layout();}
  await click('設定');await page.locator('#large').check();await click('返回操作');await layout();
  await click('設定');await page.locator('#large').uncheck();await click('返回操作');check('320/375/390/430 widths, large text, buttons and semantic headings');
  await click('確認申請');await heading('先選擇現金');
  await click('現金 · 開始模擬付款');await heading('等待機台付款');
  assert.match(await page.locator('#main').innerText(),/勿投 1 元/);
  await page.locator('#demo-panel summary').click();await click('模擬：付款失敗');await heading('付款未完成');
  await click('回到等待付款');await heading('等待機台付款');await click('模擬：付款完成');await heading('付款成功');await heading('文件正在處理');
  await click('模擬：列印完成');await heading('文件已列印完成');assert.match(await page.locator('#main').innerText(),/拿出卡片/);
  await click('已取走文件、收據與找零');await heading('操作完成');assert.doesNotMatch(await page.locator('#main').innerText(),/12345678|20000101/);check('payment failed/recover/paid/processing/printing/collect flow');
  await click('完成操作');await heading('已連接');
  await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'開始操作');await page.keyboard.press('Enter');await heading('選擇語言');check('keyboard-only activation and new heading focus');
  await page.clock.install();await page.goto(url);await click('開始操作');await page.clock.fastForward(120001);await page.clock.runFor(200);assert.match(await page.locator('#announcer').textContent(),/剩餘約 8 分鐘/);
  await page.clock.fastForward(480001);await heading('操作時間已到');await click('已確認機台仍有效，繼續等待');await heading('選擇語言');check('120 second reminder, 600 second expiration, explicit resume');
  await page.clock.resume();
  await page.goto('http://127.0.0.1:4173/?machine=ntut-document-kiosk');assert.equal(await page.locator('#demo-panel').isVisible(),false);check('demo panel hidden outside demo mode');
  await page.goto(url);await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await context.setOffline(true);await page.reload();await heading('已連接');await click('開始操作');await heading('選擇語言');await context.setOffline(false);check('service worker offline navigation preserves URL machine/demo parameters');
  await page.goto(pathToFileURL(path.resolve(__dirname,'../dist/index.html')).href+'?demo=1');await heading('已連接');await click('開始操作');await heading('選擇語言');check('self-contained file:// offline entry');
  await page.goto(url);await click('設定');await page.getByText('實測值輸入',{exact:true}).click();await page.locator('#measure-w').fill('100');await page.locator('#measure-h').fill('80');await page.reload();await click('設定');assert.equal(await page.locator('#measure-w').inputValue(),'100');
  const keys=await page.evaluate(()=>Object.keys(localStorage));assert.deepEqual(keys,['taskA_measures']);check('only non-sensitive dimensions persist');
  await click('返回操作');await page.screenshot({path:path.resolve(__dirname,'../../tapthrough-preview.png'),fullPage:true});
  assert.deepEqual(errors,[]);check('no uncaught browser errors');
  await browser.close();console.log(`${checks.length} browser check groups passed.`);
})().catch(e=>{console.error(e);process.exit(1);});
