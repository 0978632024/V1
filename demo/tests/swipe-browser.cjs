const {chromium}=require(process.argv[2]||'playwright');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  const page=await browser.newPage({viewport:{width:390,height:900},hasTouch:true,isMobile:true});
  const cdp=await page.context().newCDPSession(page);
  const url=pathToFileURL(path.resolve(__dirname,'../dist/index.html')).href;
  const heading=async name=>page.getByRole('heading',{level:1,name,exact:true}).waitFor();
  async function swipe(direction,amount=190) {
    const box=await page.locator('#main').boundingBox();
    const y=Math.max(80,Math.min(650,box.y+45));
    const start=direction==='back'?80:285;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start,y}]});
    for(let i=1;i<=5;i++) {
      const x=direction==='vertical'?start:start+(direction==='back'?1:-1)*amount*i/5;
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:direction==='vertical'?y+amount*i/5:y}]});
      await page.waitForTimeout(20);
    }
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.waitForTimeout(450);
  }
  await page.goto(url+'?demo=1');await heading('已連接');
  await swipe('next',30);await heading('已連接');
  await swipe('vertical',100);await heading('已連接');
  await swipe('next');await heading('選擇語言');
  await swipe('next');await heading('選擇你的身分');
  await swipe('back');await heading('選擇語言');
  await swipe('next');await swipe('next');await heading('使用測試身分');
  await swipe('next');await heading('選擇申請文件');
  await swipe('next');await heading('需要幾份？');
  await page.getByLabel('2 份',{exact:true}).check();
  await swipe('next');await heading('選擇名次類型');
  await swipe('next');await heading('選擇學年期');
  await swipe('next');await heading('確認申請');
  assert.match(await page.locator('#main').innerText(),/NT\$40/);
  await swipe('next');await heading('先選擇現金');
  await swipe('next');await heading('先選擇現金');
  console.log('PASS native touch left/right, short/vertical filtering, R2 defaults, selected copies, payment confirmation guard');
  await page.getByRole('button',{name:'設定',exact:true}).click();
  await page.locator('#swipe').uncheck();await page.getByRole('button',{name:'返回操作',exact:true}).click();
  await swipe('back');await heading('先選擇現金');
  console.log('PASS settings can disable gesture handling');
  await page.goto(url+'?machine=ntut-document-kiosk');await swipe('next');await heading('已連接');
  console.log('PASS gestures do not activate outside demo mode');
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
