'use strict';
globalThis.TT = globalThis.TT || {};
(() => {
  const screenMap = {CONNECTED:0,LANGUAGE:1,ROLE:2,AUTH:3,VERIFYING:4,SERVICE:5,COPIES:5,RANK:6,SEMESTER:7,REVIEW:8,PAYMENT_METHOD:9,PAYMENT_WAITING:10,PAYMENT_SUCCESS:10,PROCESSING:11,PRINTING:11,COMPLETED:12};
  class Session {
    constructor(machine, demo=false, now=()=>Date.now()) { this.machine=machine; this.demo=demo; this.now=now; this.reset(); }
    reset() { this.state='CONNECTED'; this.order={}; this.payment='IDLE'; this.startedAt=null; this.reminder=0; this.error=null; }
    get service() { return this.machine.availableServices.find(s=>s.id===this.order.service); }
    get total() { return (this.service?.price||0)*(this.order.copies||1); }
    get screen() { return screenMap[this.state] ?? screenMap[this.error?.previous] ?? 0; }
    get remaining() { return this.startedAt===null ? 600 : Math.max(0,600-Math.floor((this.now()-this.startedAt)/1000)); }
    fail(kind) { if(this.state==='ERROR') return false; this.error={kind,previous:this.state}; this.state='ERROR'; return true; }
    tick() {
      if(this.startedAt===null || ['CONNECTED','COMPLETED','ERROR'].includes(this.state)) return null;
      if(this.remaining===0) { this.fail('timeout'); return 'timeout'; }
      const elapsed=600-this.remaining, slot=Math.floor(elapsed/120);
      if(slot>this.reminder) { this.reminder=slot; return 'reminder'; }
      return null;
    }
    dispatch(event, value) {
      const previous=this.state;
      if(event==='RESET') { this.reset(); return true; }
      if(event==='FAIL') return this.fail(value);
      if(event==='RESUME' && this.state==='ERROR') {
        if(this.error.kind==='timeout') { this.startedAt=this.now(); this.reminder=0; }
        this.state=this.error.previous; this.error=null; return true;
      }
      if(event==='START' && this.state==='CONNECTED') { this.startedAt=this.now(); this.state='LANGUAGE'; }
      else if(event==='CHOOSE_LANGUAGE' && this.state==='LANGUAGE') this.state='ROLE';
      else if(event==='CHOOSE_ROLE' && this.state==='ROLE') { if(value!=='student') return this.fail('role'); this.state='AUTH'; }
      else if(event==='AUTHENTICATE' && this.state==='AUTH') this.state='VERIFYING';
      else if(event==='VERIFIED' && this.state==='VERIFYING') this.state='SERVICE';
      else if(event==='CHOOSE_SERVICE' && this.state==='SERVICE') {
        if(!this.machine.availableServices.some(s=>s.id===value && s.enabled)) return false;
        this.order={service:value,copies:1}; this.state='COPIES';
      }
      else if(event==='CHOOSE_COPIES' && this.state==='COPIES') {
        if(!Number.isInteger(value)||value<1||value>this.service.maxCopies) return false;
        this.order.copies=value; this.state=this.service.requiresRank?'RANK':this.service.requiresSemester?'SEMESTER':'REVIEW';
      }
      else if(event==='CHOOSE_RANK' && this.state==='RANK' && this.machine.rankTypes.includes(value)) { this.order.rank=value; this.state='SEMESTER'; }
      else if(event==='CHOOSE_SEMESTER' && this.state==='SEMESTER' && this.machine.semesters.includes(value)) { this.order.semester=value; this.state='REVIEW'; }
      else if(event==='CONFIRM' && this.state==='REVIEW') this.state='PAYMENT_METHOD';
      else if(event==='CASH' && this.state==='PAYMENT_METHOD') { this.payment='WAITING'; this.state='PAYMENT_WAITING'; }
      else if(event==='PAYMENT_STATUS') {
        if(value==='PAID' && this.payment==='WAITING' && (this.state==='PAYMENT_WAITING'||(this.state==='ERROR'&&this.error.previous==='PAYMENT_WAITING'))) { this.error=null; this.payment='PAID'; this.state='PAYMENT_SUCCESS'; }
        else if(value==='PROCESSING' && this.state==='PAYMENT_SUCCESS') { this.payment=value; this.state='PROCESSING'; }
        else if(value==='FAILED' && this.state==='PAYMENT_WAITING') { this.payment='FAILED'; return this.fail('payment'); }
      }
      else if(event==='PRINT_READY' && this.state==='PROCESSING') this.state='PRINTING';
      else if(event==='COLLECT' && this.state==='PRINTING') { this.state='COMPLETED'; this.order={}; this.startedAt=null; }
      else if(event==='BACK') {
        const backs={ROLE:'LANGUAGE',AUTH:'ROLE',SERVICE:'AUTH',COPIES:'SERVICE',RANK:'COPIES',SEMESTER:this.service?.requiresRank?'RANK':'COPIES',REVIEW:this.service?.requiresSemester?'SEMESTER':'COPIES',PAYMENT_METHOD:'REVIEW'};
        if(backs[this.state]) this.state=backs[this.state];
      }
      return previous!==this.state;
    }
  }
  // Adapter contract is deliberately local: no real machine transport or credentials.
  class PaymentAdapter {
    constructor(onStatus) { this.onStatus=onStatus; this.status='IDLE'; }
    begin() { this.status='WAITING'; }
    receive(status) {
      const valid={WAITING:['PAID','FAILED'],PAID:['PROCESSING']};
      if(!valid[this.status]?.includes(status)) return false;
      this.status=status; this.onStatus(status); return true;
    }
    clear() { this.status='IDLE'; }
  }
  class DemoAuthAdapter { async verify(id,birthday) { return id==='12345678' && birthday==='20000101'; } }
  function measuredCoordinate(machine,key,width,height) {
    const p=machine.v1Ratios[key];
    return p&&Number.isFinite(width)&&Number.isFinite(height)&&width>0&&height>0 ? {x:Math.round(p.x*width),y:Math.round(p.y*height)} : null;
  }
  Object.assign(TT,{Session,PaymentAdapter,DemoAuthAdapter,measuredCoordinate});
})();
