const {chromium}=require(process.argv[2]||'playwright');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  const page=await browser.newPage({viewport:{width:320,height:800}});
  await page.addInitScript(()=>{
    window.speechCalls=[];
    Object.defineProperty(window,'speechSynthesis',{value:{
      getVoices:()=>[],
      cancel:()=>speechCalls.push({type:'cancel',at:performance.now()}),
      speak:u=>speechCalls.push({type:'speak',text:u.text,at:performance.now()})
    }});
    class FakeRecognition {
      start(){ window.activeRecognition=this; }
      abort(){}
    }
    window.SpeechRecognition=FakeRecognition;
  });
  const click=async name=>page.getByRole('button',{name,exact:true}).click();
  const heading=async name=>page.getByRole('heading',{level:1,name,exact:true}).waitFor();
  await page.goto('http://127.0.0.1:4173/?demo=1');
  assert.equal(await page.evaluate(()=>speechCalls.filter(x=>x.type==='speak').length),0);
  await click('設定');await page.locator('#tts').check();await page.waitForTimeout(230);
  const calls=await page.evaluate(()=>speechCalls), spoken=calls.filter(x=>x.type==='speak');
  assert.equal(spoken[0].text,' ');assert.ok(spoken.length>1);
  const firstText=spoken[1],lastCancel=calls.filter(x=>x.type==='cancel'&&x.at<=firstText.at).at(-1);assert.ok(firstText.at-lastCancel.at>=140);
  await page.locator('#private').check();const count=await page.evaluate(()=>speechCalls.filter(x=>x.type==='speak').length);
  await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>speechCalls.filter(x=>x.type==='speak').length),count);
  await page.locator('#private').uncheck();await page.locator('#tts').uncheck();await click('返回操作');
  console.log('PASS default TTS off, gesture unlock, cancel/delay, private-mode suppression');
  await click('開始操作');await click('中文版 · 繼續');await click('學生／校友');await click('使用 Demo 身分繼續');await heading('選擇申請文件');
  await page.getByRole('button',{name:/中文成績名次證明書 · NT\$20/}).click();await click('確認份數');await click('在校各學期系科所名次');
  await click('使用語音選擇');
  await page.evaluate(()=>activeRecognition.onresult({results:[[{transcript:'114 學年度第二學期 <img src=x onerror=alert(1)>'}]]}));
  await heading('選擇學年期');assert.equal(await page.locator('#voice-result img').count(),0);await click('確認使用這個學期');await heading('確認申請');
  await click('返回上一步');await click('使用語音選擇');await page.evaluate(()=>activeRecognition.onerror({error:'not-allowed'}));
  assert.match(await page.locator('#voice-status').textContent(),/麥克風權限未開啟/);await click('114 學年度第 2 學期');await heading('確認申請');
  console.log('PASS recognition confirmation, untrusted transcript rendered as text, permission-denied fallback');
  await page.evaluate(()=>document.documentElement.style.fontSize='36px');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await click('設定');
  assert.equal(await page.locator('#settings').evaluate(e=>e.scrollWidth<=e.clientWidth),true);
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'settings-open');
  console.log('PASS 200% text at 320px, dialog overflow, Escape and focus restoration');
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
