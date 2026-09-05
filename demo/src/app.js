'use strict';
(() => {
  const $=id=>document.getElementById(id);
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const params=new URLSearchParams(location.search), demo=params.get('demo')==='1';
  const machineId=params.get('machine')||(demo?'ntut-document-kiosk':null);
  const machine=Object.prototype.hasOwnProperty.call(TT.machines,machineId)?TT.machines[machineId]:null;
  let session=machine?new TT.Session(machine,demo):null;
  let privateMode=false,version='B',recognition=null,voiceCandidate=null,voiceToken=0,asyncToken=0;
  let liveTimer,currentCopy='',helpOpen=false;
  let swipeEnabled=demo;
  const announce=(text,error=false)=>{
    const target=$(error?'error-announcer':'announcer');
    clearTimeout(liveTimer); $('announcer').textContent=''; $('error-announcer').textContent='';
    liveTimer=setTimeout(()=>{ target.textContent=text; },60);
  };
  const speech=new TT.Speech(text=>announce(text));
  const auth=new TT.DemoAuthAdapter();
  const payment=new TT.PaymentAdapter(status=>dispatch('PAYMENT_STATUS',status));
  const button=(text,event,value='',className='primary')=>`<button type="button" class="${className}" data-event="${event}" data-value="${escape(value)}">${escape(text)}</button>`;
  const actions=(primary,back=true)=>`<div class="actions">${primary}${back?button('返回上一步','BACK','','secondary'):''}</div>`;
  const choice=(text,event,value,description='')=>`<button type="button" class="choice" data-event="${event}" data-value="${escape(value)}">${escape(text)}${description?`<small>${escape(description)}</small>`:''}</button>`;
  const heading=(title,body)=>`<h1 id="step-title" tabindex="-1">${title}</h1>${body}`;
  const sensitive=()=> privateMode || ['AUTH','VERIFYING','REVIEW'].includes(session?.state);
  function swipeAction() {
    if(!session)return null;
    const defaults={
      CONNECTED:['START','','開始操作'],LANGUAGE:['CHOOSE_LANGUAGE','','選中文版'],
      ROLE:['CHOOSE_ROLE','student','選學生／校友'],AUTH:['DEMO_AUTH','','使用 Demo 身分'],
      SERVICE:['CHOOSE_SERVICE','rank','選中文成績名次證明書'],
      COPIES:['CHOOSE_COPIES',Number(document.querySelector('[name=copies]:checked')?.value||1),'確認所選份數'],
      RANK:['CHOOSE_RANK','在校各學期系科所名次','選在校各學期系科所名次'],
      SEMESTER:['CHOOSE_SEMESTER','114 學年度第 2 學期','選 114 學年度第 2 學期'],
      REVIEW:['CONFIRM','','確認申請'],COMPLETED:['RESET','','回到開始畫面']
    };
    return defaults[session.state]||null;
  }
  function updateSwipeHint() {
    document.documentElement.classList.toggle('swipe-enabled',swipeEnabled&&!!session);
    $('swipe-hint').hidden=!swipeEnabled||!session;
    $('swipe').checked=swipeEnabled;
    $('swipe').disabled=!demo;
    if(!demo)$('swipe-setting-note').textContent='直接滑動僅在 Demo 模式提供。機台引導模式請使用按鈕或系統讀屏。';
    const next=swipeAction();
    $('swipe-hint').textContent=next?`向左滑：${next[2]}。向右滑：返回。也可直接點選其他選項。`:'此步驟請依畫面確認付款／取件，或等待處理完成。上下滑可捲動。';
  }
  function guide(state) {
    const text=machine?.guidance[state]?.[version];
    return text?`<p class="note">${version} 版機台引導：${escape(text)}</p>`:'';
  }
  function summary() {
    return `<div class="card"><dl><div><dt>申請文件</dt><dd>${escape(session.service.name)}</dd></div>${session.order.rank?`<div><dt>名次類型</dt><dd>${escape(session.order.rank)}</dd></div>`:''}${session.order.semester?`<div><dt>學年期</dt><dd>${escape(session.order.semester)}</dd></div>`:''}<div><dt>份數</dt><dd>${session.order.copies}</dd></div><div><dt>單價</dt><dd>NT$${session.service.price}</dd></div><div class="total"><dt>總金額</dt><dd>NT$${session.total}</dd></div></dl></div>`;
  }
  const pages={
    CONNECTED:()=>heading('已連接',`<div class="status-icon" aria-hidden="true">✓</div><p class="eyebrow">${escape(machine.organization)}</p><h2>${escape(machine.machineName)}</h2><p class="muted">位置：${escape(machine.location)}</p><p class="note">已載入機台引導。這是互動原型，尚未連接實體設備。</p>${actions(button('開始操作','START'),false)}`),
    LANGUAGE:()=>heading('選擇語言',`<p class="instruction">本次實測使用中文引導。</p>${guide('LANGUAGE')}${actions(button('中文版 · 繼續','CHOOSE_LANGUAGE'),false)}<p class="muted">英文版尚未提供。</p>`),
    ROLE:()=>heading('選擇你的身分',`<p>請選擇對應身分。</p>${choice('學生／校友','CHOOSE_ROLE','student')}${choice('教職員工','CHOOSE_ROLE','staff','本次原型僅支援學生／校友流程')}${guide('ROLE')}${actions('',true)}`),
    AUTH:()=>heading('使用測試身分',`<p>Prototype 測試資料。請勿輸入真實個資。</p><p class="note">測試學號：12345678<br>測試生日：20000101（西元年月日）</p><button class="secondary" type="button" id="auth-private">${privateMode?'關閉':'啟用'}隱私模式</button><form id="auth-form" novalidate><label for="student-id">測試學號（8 碼）</label><input id="student-id" type="password" inputmode="numeric" autocomplete="off" maxlength="8" aria-describedby="auth-hint auth-error"><label for="birthday">測試生日（8 碼）</label><input id="birthday" type="password" inputmode="numeric" autocomplete="off" maxlength="8" aria-describedby="auth-hint auth-error"><p id="auth-hint" class="muted">僅接受上述測試值。也可直接使用下方 Demo 身分。</p><p id="auth-error" class="error-text"></p><div class="actions"><button class="primary" type="submit">驗證測試資料</button>${button('使用 Demo 身分繼續','DEMO_AUTH','','secondary')}${button('返回上一步','BACK','','secondary')}</div></form>${guide('AUTH')}`),
    VERIFYING:()=>heading('認證處理中',`<div class="pulse" aria-hidden="true"></div><p role="status">正在驗證測試身分，請稍候。</p><p class="muted">這是本機模擬，未傳送資料。</p>`),
    SERVICE:()=>heading('選擇申請文件',`<p>先選文件，下一步選擇份數。</p>${machine.availableServices.map(s=>s.enabled?choice(`${s.name} · NT$${s.price}`,'CHOOSE_SERVICE',s.id,s.description):`<div class="card"><strong>${escape(s.name)} · NT$${s.price}</strong><p class="muted">${escape(s.description)}</p></div>`).join('')}${guide('SERVICE')}${actions('',true)}`),
    COPIES:()=>heading('需要幾份？',`<p>${escape(session.service.name)} · 每份 NT$${session.service.price}</p><form id="copies-form"><fieldset><legend>選擇份數</legend>${Array.from({length:session.service.maxCopies},(_,i)=>`<label class="check"><input type="radio" name="copies" value="${i+1}" ${session.order.copies===i+1?'checked':''}>${i+1} 份</label>`).join('')}</fieldset><p class="total" id="copies-total">總金額 NT$${session.total}</p>${guide('COPIES')}<div class="actions"><button type="submit" class="primary">確認份數</button>${button('返回上一步','BACK','','secondary')}</div></form>`),
    RANK:()=>heading('選擇名次類型',`<p>R2 實測選擇「在校各學期系科所名次」。</p>${machine.rankTypes.map(r=>choice(r,'CHOOSE_RANK',r)).join('')}${guide('RANK')}${actions('',true)}`),
    SEMESTER:()=>heading('選擇學年期',`<p>R2 實測使用 114 學年度第 2 學期。</p>${machine.semesters.map(s=>choice(s,'CHOOSE_SEMESTER',s)).join('')}<section aria-label="語音選擇學期" class="card"><button type="button" class="secondary" id="voice-start">使用語音選擇</button><p id="voice-status">${window.SpeechRecognition||window.webkitSpeechRecognition?'說出學年與學期，確認後才會套用。':'此瀏覽器目前無法使用網頁語音辨識。你仍然可以使用手機的系統語音輸入，或使用上方選項完成操作。'}</p><div id="voice-result"></div></section>${guide('SEMESTER')}${actions('',true)}`),
    REVIEW:()=>heading('確認申請',`<p>請確認文件、學年期與金額。</p><button type="button" class="secondary" id="review-private">${privateMode?'關閉':'啟用'}隱私模式</button>${summary()}${guide('REVIEW')}${actions(button('確認申請','CONFIRM'))}`),
    PAYMENT_METHOD:()=>heading('先選擇現金',`<p class="total">應付金額 NT$${session.total}</p><div class="card"><p><strong>${escape(machine.physicalActions.cash)}</strong></p><p>${escape(machine.physicalActions.coins)}</p></div>${guide('PAYMENT_METHOD')}${actions(button(demo?'現金 · 開始模擬付款':'已在機台按下現金','CASH'))}<p class="muted">${demo?'此按鈕只模擬付款等待，不會收款。':'請先在實體機台按下現金，再回到手機繼續。'}</p>`),
    PAYMENT_WAITING:()=>heading('等待機台付款',`<p class="total">應付金額 NT$${session.total}</p><p class="instruction">${demo?'模擬付款等待中，請由陪同者使用下方 Demo controls。':'請在實體機台確認應繳金額與投入金額。這個原型不會自動取得機台付款資訊。'}</p><div class="card"><p>${escape(machine.physicalActions.cash)}</p><p><strong>${escape(machine.physicalActions.coins)}</strong></p></div>${guide('PAYMENT_WAITING')}${!demo?actions(button('已確認機台收款完成','MANUAL_PAID'),false):''}<button type="button" class="secondary" id="help">請求協助</button>`),
    PAYMENT_SUCCESS:()=>heading('付款成功',`<div class="status-icon" aria-hidden="true">✓</div><p>${demo?'模擬付款已確認。':'已依你的確認記錄收款狀態。'}</p><p>接著處理文件，請稍候。</p>`),
    PROCESSING:()=>heading('文件正在處理',`<div class="pulse" aria-hidden="true"></div><p role="status">正在準備列印文件。</p><p>${demo?'請由陪同者在 Demo controls 模擬列印完成。':'請等待實體機台顯示列印成功，並確認文件已送出。'}</p>${!demo?actions(button('機台已列印成功','PRINT_READY'),false):''}`),
    PRINTING:()=>heading('文件已列印完成',`<div class="status-icon" aria-hidden="true">✓</div><p>${demo?'模擬文件已送至機台列印。':'已依你的確認記錄列印完成。'}</p><p>${escape(session.service.name)}已完成列印。</p><div class="card"><p>${escape(machine.physicalActions.collect)}</p><p>文件取出口在機身最下方；收據出口在機身中段。</p>${session.service.id==='english'||session.service.id==='enrollment-en'?'<p>英文文件領取後，請至櫃台加蓋鋼印。</p>':''}</div>${guide('PRINTING')}${actions(button('已取走文件、收據與找零','COLLECT'),false)}`),
    COMPLETED:()=>heading('操作完成',`<div class="status-icon" aria-hidden="true">✓</div><p>本次文件申請流程已完成，測試身分與申請資料已清除。</p><p class="note">${escape(machine.physicalActions.collect)}</p>${guide('COMPLETED')}${actions(button('完成操作','RESET')+button('再次申請文件','AGAIN','','secondary'),false)}`),
    ERROR:()=>{
      const kind=session.error.kind;
      const messages={timeout:['操作時間已到','600 秒已到。目前尚未收到新的機台狀態。請先確認實體機台是否已回到首頁；手機無法延長機台時間。'],payment:['付款未完成','目前無法確認收款結果。若已投入款項，請保留在機台前並請求協助，避免重複投幣。'],unavailable:['機台暫時無法使用','請確認現場機台狀態，或請陪同者協助。'],role:['此身分尚未提供','目前原型支援學生／校友流程。請返回選擇。']};
      const [title,text]=messages[kind]||messages.unavailable;
      const resume=kind==='payment'?'回到等待付款':kind==='timeout'?'已確認機台仍有效，繼續等待':'返回原步驟';
      return heading(title,`<p class="error-text">${text}</p>${kind==='timeout'?'<p>繼續等待只會重新啟動手機提醒，不代表機台交易仍有效。</p>':''}${actions(button(resume,'RESUME')+button('請求協助','HELP','','secondary')+button('重新開始','ASK_RESET','','secondary'),false)}`);
    }
  };
  function cancelRecognition() { ++voiceToken; if(recognition) { recognition.abort(); recognition=null; } voiceCandidate=null; }
  function dispatch(event,value) {
    if(event==='HELP') { showHelp(); return; }
    if(event==='ASK_RESET') { $('reset-dialog').showModal(); return; }
    if(event==='DEMO_AUTH') { verify('12345678','20000101'); return; }
    if(event==='MANUAL_PAID') { payment.receive('PAID'); return; }
    if(event==='AGAIN') { clearSession(); session.dispatch('START'); render(); return; }
    if(event==='RESET') { clearSession(); render(); return; }
    if(event==='CASH') payment.begin();
    if(event==='RESUME' && session.error?.kind==='payment') { payment.begin(); session.payment='WAITING'; }
    const changed=session.dispatch(event,value);
    if(!changed) return;
    cancelRecognition(); ++asyncToken; speech.stop(); render();
    if(session.state==='VERIFYING') {
      const token=asyncToken;
      setTimeout(()=>{ if(token===asyncToken) dispatch('VERIFIED'); },1100);
    }
    if(session.state==='PAYMENT_SUCCESS') {
      const token=asyncToken;
      setTimeout(()=>{ if(token===asyncToken) payment.receive('PROCESSING'); },1800);
    }
  }
  function clearSession() { ++asyncToken; cancelRecognition(); speech.stop(); payment.clear(); session.reset(); $('announcer').textContent=''; $('error-announcer').textContent=''; helpOpen=false; }
  async function verify(id,birthday) {
    const valid=await auth.verify(id,birthday);
    if(!valid) {
      $('auth-error').textContent='僅接受指定的測試學號與生日。請檢查格式，或使用 Demo 身分繼續。';
      ['student-id','birthday'].forEach(i=>{ $(i).setAttribute('aria-invalid','true'); $(i).value=''; });
      $('student-id').focus(); announce('測試資料不符。請使用頁面提供的測試值。',true); return;
    }
    dispatch('AUTHENTICATE');
  }
  function showHelp() {
    if(helpOpen) { $('help-message')?.focus(); return; }
    helpOpen=true;
    const p=document.createElement('p'); p.id='help-message'; p.className='card warning'; p.tabIndex=-1;
    p.textContent='請向身旁陪同者或現場服務人員尋求協助。此按鈕不會傳送求助訊息；若已投幣，請先不要重複付款。';
    $('main').append(p); p.focus(); announce('請向陪同者或現場服務人員尋求協助。');
  }
  function updateProgress() {
    const current=session?.screen||0;
    $('screen-label').textContent=current?`機台畫面 ${current} / 12 · ${machine.screens[current-1].name}`:'手機引導 · 準備開始';
    $('progress-track').innerHTML=Array.from({length:12},(_,i)=>`<i class="${i<current?'done':''}"></i>`).join('');
    $('clock').textContent=session?.startedAt!==null&&session?`手機提醒剩餘 ${Math.floor(session.remaining/60)} 分 ${session.remaining%60} 秒`:'開始操作後啟動 600 秒提醒';
    $('screen-list').innerHTML=machine?machine.screens.map(s=>`<li ${s.id===current?'aria-current="step"':''}>${s.id}. ${escape(s.name)}${s.id===current?'（目前）':''}</li>`).join(''):'';
  }
  function renderDemo() {
    $('demo-panel').hidden=!demo || !session;
    if(!demo||!session) return;
    const state=session.state;
    $('demo-actions').innerHTML=`${state==='PAYMENT_WAITING'?button('模擬：付款完成','SIM_PAID','','secondary')+button('模擬：付款失敗','SIM_FAILED','','secondary'):''}${state==='PROCESSING'?button('模擬：列印完成','PRINT_READY','','secondary'):''}${!['CONNECTED','COMPLETED','ERROR'].includes(state)?button('模擬：600 秒逾時','SIM_TIMEOUT','','secondary'):''}${state!=='ERROR'?button('模擬：機台無法使用','SIM_UNAVAILABLE','','secondary'):''}${state==='SEMESTER'?button('模擬：語音辨識失敗','SIM_SPEECH','','secondary')+button('模擬：麥克風權限拒絕','SIM_DENIED','','secondary'):''}${button('Reset Demo','ASK_RESET','','secondary')}`;
  }
  function render(focus=true) {
    helpOpen=false;
    if(!session) {
      $('main').innerHTML=heading(machineId?'無法識別這台機器':'等待連接機台',`<p>${machineId?'這個機台代號尚未提供引導。請確認開啟的連結。':'開啟機台連結後，即可開始操作。你也可以先體驗 Demo。'}</p><div class="actions"><a class="card" href="?machine=ntut-document-kiosk&amp;demo=1">進入 Demo</a></div>`);
      currentCopy=machineId?'無法識別這台機器，請確認連結。':'等待連接機台。';
    } else {
      $('main').innerHTML=pages[session.state]();
      currentCopy=$('main').querySelector('h1').textContent+'。';
      if(session.state==='CONNECTED') currentCopy=`已連接${machine.organization}${machine.machineName}。選擇開始操作以繼續。這是本機互動原型。`;
      if(!sensitive()) {
        currentCopy+=(machine.guidance[session.state]?.[version]||'');
        if(['PAYMENT_METHOD','PAYMENT_WAITING'].includes(session.state)) currentCopy+=machine.physicalActions.cash+machine.physicalActions.coins;
        if(['PRINTING','COMPLETED'].includes(session.state)) currentCopy+=machine.physicalActions.collect;
      }
    }
    $('mode-label').textContent=demo?'DEMO · 模擬體驗':'PROTOTYPE · 機台引導';
    updateProgress(); renderDemo(); updateSwipeHint();
    $('replay').disabled=!speech.enabled;
    $('speech-stop').disabled=!speech.enabled;
    if(focus && !$('settings').open && !$('reset-dialog').open) $('step-title').focus({preventScroll:true});
    if(focus) window.scrollTo(0,0);
    const messages={CONNECTED:'已連接國立臺北科技大學校園文件自動服務機。選擇開始操作以繼續。',COPIES:'已加入文件。請選擇份數。',AUTH:'請使用測試身分。',VERIFYING:'正在驗證測試身分。',REVIEW:'請確認申請內容。',PAYMENT_WAITING:'正在等待付款。',PAYMENT_SUCCESS:'付款成功。',PROCESSING:'文件正在處理。',PRINTING:'文件已列印完成，請取走文件、收據與找零。',COMPLETED:'操作完成。本次資料已清除。'};
    announce(messages[session?.state]||$('step-title').textContent,session?.state==='ERROR'||!!(machineId&&!machine));
    speech.speak(currentCopy,sensitive());
  }
  $('main').addEventListener('click',e=>{
    const b=e.target.closest('button'); if(!b) return;
    if(b.dataset.event) dispatch(b.dataset.event,b.dataset.value);
    else if(['auth-private','review-private'].includes(b.id)) { setPrivate(!privateMode); b.textContent=privateMode?'關閉隱私模式':'啟用隱私模式'; }
    else if(b.id==='help') showHelp();
    else if(b.id==='voice-start') startRecognition();
    else if(b.id==='voice-confirm' && voiceCandidate) dispatch('CHOOSE_SEMESTER',voiceCandidate);
    else if(b.id==='voice-retry') startRecognition();
    else if(b.id==='voice-cancel') { cancelRecognition(); $('voice-result').textContent=''; $('voice-status').textContent='已停止聆聽。請使用學期選項繼續。'; $('voice-start').focus(); }
  });
  $('main').addEventListener('submit',e=>{
    e.preventDefault();
    if(e.target.id==='auth-form') verify($('student-id').value,$('birthday').value);
    if(e.target.id==='copies-form') dispatch('CHOOSE_COPIES',Number(new FormData(e.target).get('copies')));
  });
  $('main').addEventListener('change',e=>{ if(e.target.name==='copies') {
    const total=Number(e.target.value)*session.service.price;
    $('copies-total').textContent=`總金額 NT$${total}`;
    announce(privateMode?'份數已更新。':`份數已更新，總金額 ${total} 元。`);
  } });
  $('demo-actions').addEventListener('click',e=>{
    if(!demo) return;
    const event=e.target.closest('button')?.dataset.event;
    if(event==='SIM_PAID') payment.receive('PAID');
    else if(event==='SIM_FAILED') payment.receive('FAILED');
    else if(event==='SIM_TIMEOUT') dispatch('FAIL','timeout');
    else if(event==='SIM_UNAVAILABLE') dispatch('FAIL','unavailable');
    else if(event==='SIM_SPEECH') recognitionFailure('no-speech');
    else if(event==='SIM_DENIED') recognitionFailure('not-allowed');
    else if(event) dispatch(event);
  });
  function recognitionFailure(error) {
    cancelRecognition();
    const text=error==='not-allowed'?'麥克風權限未開啟。你仍可使用學期選項完成操作。':'這次沒有成功辨識。請重試，或使用學期選項完成操作。';
    if($('voice-status')) $('voice-status').textContent=text;
    if($('voice-result')) $('voice-result').innerHTML='';
    $('voice-start')?.focus(); announce(text,true);
  }
  function startRecognition() {
    cancelRecognition(); speech.stop();
    const API=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!API) { announce('此瀏覽器目前無法使用網頁語音辨識，請使用學期選項。'); return; }
    const token=voiceToken;
    const rec=new API(); recognition=rec; rec.lang='zh-TW'; rec.interimResults=false; rec.continuous=false;
    $('voice-status').textContent='正在聆聽……語音服務可能使用瀏覽器提供的網路辨識。';
    $('voice-result').innerHTML='<button id="voice-cancel" type="button">停止聆聽</button>';
    announce('正在聆聽，請說出學年與學期。');
    rec.onresult=e=>{
      if(token!==voiceToken||session.state!=='SEMESTER') return;
      const transcript=e.results[0][0].transcript;
      const normalized=transcript.replace(/一一五/g,'115').replace(/一一四/g,'114').replace(/一一三/g,'113').replace(/第一/g,'第1').replace(/第二/g,'第2').replace(/\s/g,'');
      voiceCandidate=machine.semesters.find(s=>normalized.includes(s.slice(0,3)) && normalized.includes(s.includes('第 2')?'第2':'第1'))||null;
      $('voice-status').textContent=voiceCandidate?'已辨識。請確認選擇。':'沒有找到對應學期。請重新說一次，或使用學期選項。';
      $('voice-result').innerHTML=`<p id="heard"></p>${voiceCandidate?'<button type="button" id="voice-confirm">確認使用這個學期</button>':''}<button type="button" id="voice-retry">重新說一次</button>`;
      // Never interpret recognition output as HTML or an instruction.
      $('heard').textContent=`我聽到：${transcript}`;
      $(voiceCandidate?'voice-confirm':'voice-retry').focus(); announce('辨識完成，請確認或重新說一次。');
    };
    rec.onerror=e=>{ if(token===voiceToken) recognitionFailure(e.error); };
    rec.onend=()=>{ if(token===voiceToken && $('voice-cancel')) recognitionFailure('no-speech'); };
    try { rec.start(); } catch { recognitionFailure('failed'); }
  }
  function setPrivate(value) {
    privateMode=value; speech.stop(); cancelRecognition();
    document.documentElement.classList.toggle('private',value);
    $('private-banner').hidden=!value; $('private').checked=value;
    // opacity hides pixels only, keeping the entire operating surface in the accessibility tree.
    announce(value?'隱私模式已開啟。':'隱私模式已關閉。');
  }
  $('private-exit').onclick=()=>{ setPrivate(false); $('step-title').focus(); };
  $('swipe').onchange=e=>{swipeEnabled=demo&&e.target.checked;updateSwipeHint();};
  new TT.SwipeNavigator($('main'),()=>swipeEnabled&&!!session&&!$('settings').open&&!$('reset-dialog').open,direction=>{
    if(direction==='back') {
      const previous=session.state;
      dispatch('BACK');
      if(session.state===previous) {announce('此步驟無法返回，請依畫面提示繼續。');speech.speak('此步驟無法返回，請依畫面提示繼續。',sensitive());}
      return;
    }
    const next=swipeAction();
    if(next)dispatch(next[0],next[1]);
    else {const message='請先依畫面確認付款或取件，處理中請稍候。';announce(message);speech.speak(message,sensitive());}
  });
  $('settings-open').onclick=()=>{ speech.stop(); cancelRecognition(); $('settings').showModal(); $('settings-title').focus(); };
  $('settings-close').onclick=()=> $('settings').close();
  $('settings').addEventListener('close',()=>{ $('settings-open').focus(); });
  $('tts').onchange=e=>{ speech.enabled=e.target.checked; if(speech.enabled) { speech.unlock(); speech.speak(currentCopy,sensitive()); } else speech.stop(); $('replay').disabled=!speech.enabled; $('speech-stop').disabled=!speech.enabled; };
  $('rate').oninput=e=>{ speech.rate=Number(e.target.value); $('rate-value').textContent=e.target.value; };
  document.querySelectorAll('[name=version]').forEach(input=>input.onchange=e=>{ version=e.target.value; render(false); });
  $('private').onchange=e=>setPrivate(e.target.checked);
  $('contrast').onchange=e=>document.documentElement.classList.toggle('contrast',e.target.checked);
  $('large').onchange=e=>document.documentElement.classList.toggle('large',e.target.checked);
  $('replay').onclick=()=>{ speech.unlock(); speech.speak(currentCopy,sensitive()); if(sensitive()) announce('目前為敏感步驟或隱私模式，Demo 語音保持靜音，請使用螢幕閱讀器。'); };
  $('speech-stop').onclick=()=>speech.stop();
  $('restart').onclick=()=>{ $('settings').close(); $('reset-dialog').showModal(); };
  $('reset-cancel').onclick=()=> $('reset-dialog').close();
  $('reset-confirm').onclick=()=>{ $('reset-dialog').close(); if(session) clearSession(); render(); };
  const measures={};
  try { Object.assign(measures,JSON.parse(localStorage.getItem('taskA_measures')||'{}')); } catch {}
  [['measure-w','W'],['measure-h','H'],['measure-floor','floor']].forEach(([id,key])=>{
    if(Number.isFinite(measures[key]) && measures[key]>0) $(id).value=measures[key];
    $(id).oninput=()=>{
      const n=Number($(id).value); measures[key]=Number.isFinite(n)&&n>0?n:null;
      try { localStorage.setItem('taskA_measures',JSON.stringify(measures)); $('measure-note').textContent='機台尺寸已記錄；引導距離仍為【待填】。'; }
      catch { $('measure-note').textContent='此瀏覽器無法保存設定；尺寸僅保留到本頁關閉。'; }
    };
  });
  function tick() {
    if(!session) return;
    const event=session.tick(); updateClock();
    if(event==='timeout') { cancelRecognition(); ++asyncToken; speech.stop(); render(); }
    else if(event==='reminder') { const line=`手機引導剩餘約 ${Math.ceil(session.remaining/60)} 分鐘，請留意實體機台倒數。`; announce(line); speech.speak(line,privateMode); }
  }
  function updateClock() { if(session?.startedAt!==null&&session) $('clock').textContent=`手機提醒剩餘 ${Math.floor(session.remaining/60)} 分 ${session.remaining%60} 秒`; }
  setInterval(tick,1000);
  document.addEventListener('visibilitychange',()=>{ if(document.hidden) { speech.stop(); cancelRecognition(); } else tick(); });
  window.addEventListener('pagehide',()=>{ clearTimeout(liveTimer); if(session) clearSession(); document.querySelectorAll('input[type=password]').forEach(i=>i.value=''); });
  window.addEventListener('pageshow',e=>{ if(e.persisted) render(); });
  render(false);
  if(location.protocol==='http:'||location.protocol==='https:') {
    if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(()=>{ $('offline-status').textContent='離線快取已就緒。也可下載 index.html 單檔備援。'; }).catch(()=>{ $('offline-status').textContent='離線快取未啟用；請使用下載的 index.html 單檔備援。'; });
  }
})();
