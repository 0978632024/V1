const {test}=require('node:test'),assert=require('node:assert/strict');
require('../src/model.js');
const machine=require('../src/machines.json')['ntut-document-kiosk'];
const make=()=>new TT.Session(machine,true);
function toReview(s) {
  for(const [e,v] of [['START'],['CHOOSE_LANGUAGE'],['CHOOSE_ROLE','student'],['AUTHENTICATE'],['VERIFIED'],['CHOOSE_SERVICE','rank'],['CHOOSE_COPIES',1],['CHOOSE_RANK','在校各學期系科所名次'],['CHOOSE_SEMESTER','114 學年度第 2 學期']]) assert.equal(s.dispatch(e,v),true,e);
}
test('R2 happy path preserves real price and clears completed order',()=>{
  const s=make();toReview(s);assert.equal(s.total,20);assert.equal(s.screen,8);
  ['CONFIRM','CASH'].forEach(e=>s.dispatch(e));
  assert.equal(s.screen,10);s.dispatch('PAYMENT_STATUS','PAID');s.dispatch('PAYMENT_STATUS','PROCESSING');s.dispatch('PRINT_READY');s.dispatch('COLLECT');
  assert.equal(s.state,'COMPLETED');assert.equal(s.screen,12);assert.deepEqual(s.order,{});assert.equal(s.startedAt,null);
});
test('out of order payment, invalid service/copies and duplicate payment rejected',()=>{
  const s=make();assert.equal(s.dispatch('PAYMENT_STATUS','PAID'),false);
  toReview(s);s.dispatch('BACK');s.dispatch('BACK');s.dispatch('BACK');assert.equal(s.state,'COPIES');
  for(const n of [0,6,-1,NaN,1.5]) assert.equal(s.dispatch('CHOOSE_COPIES',n),false);
  s.dispatch('BACK');assert.equal(s.dispatch('CHOOSE_SERVICE','student-card'),false);
  toReview(make());
  const p=new TT.PaymentAdapter(()=>{});assert.equal(p.receive('PAID'),false);p.begin();assert.equal(p.receive('PAID'),true);assert.equal(p.receive('PAID'),false);
});
test('clock reminds every 120 seconds and detects suspended/background expiry',()=>{
  let time=0;const s=new TT.Session(machine,true,()=>time);s.dispatch('START');
  time=119000;assert.equal(s.tick(),null);time=120000;assert.equal(s.tick(),'reminder');assert.equal(s.remaining,480);assert.equal(s.tick(),null);
  time=240000;assert.equal(s.tick(),'reminder');time=601000;assert.equal(s.tick(),'timeout');assert.equal(s.state,'ERROR');assert.equal(s.screen,1);
  s.dispatch('RESUME');assert.equal(s.state,'LANGUAGE');assert.equal(s.remaining,600);
});
test('payment received during timeout is accepted without double charging',()=>{
  const s=make();toReview(s);s.dispatch('CONFIRM');s.dispatch('CASH');s.fail('timeout');
  assert.equal(s.dispatch('PAYMENT_STATUS','PAID'),true);assert.equal(s.state,'PAYMENT_SUCCESS');
});
test('non-semester service skips rank and semester',()=>{
  const s=make();toReview(s);s.state='SERVICE';s.dispatch('CHOOSE_SERVICE','history');s.dispatch('CHOOSE_COPIES',2);
  assert.equal(s.state,'REVIEW');assert.equal(s.total,30);assert.equal(s.order.semester,undefined);
});
test('configuration has 12 mapped screens, 11 official prices, all distance guidance unfilled',()=>{
  assert.equal(machine.screens.length,12);assert.equal(machine.availableServices.length,11);
  for(const variants of Object.values(machine.guidance)) for(const text of Object.values(variants)) {assert.ok(text.includes('【待填】'));assert.doesNotMatch(text,/\d+(公分|指寬|手掌)/);}
  const text=JSON.stringify(machine.physicalActions);for(const phrase of ['勿投 1 元','先按現金','拿出卡片']) assert.ok(text.includes(phrase));
});
test('auth accepts only mock data; measured V1 ratio helper requires real input',async()=>{
  const a=new TT.DemoAuthAdapter();assert.equal(await a.verify('12345678','20000101'),true);assert.equal(await a.verify('anything','anything'),false);
  assert.equal(TT.measuredCoordinate(machine,'cash',0,0),null);assert.deepEqual(TT.measuredCoordinate(machine,'cash',100,100),{x:50,y:63});
});
