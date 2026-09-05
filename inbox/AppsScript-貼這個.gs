/**
 * BUILDMODE GEN-AI HACKATHON 2026 —— 交件自動化（貼這一個檔就好）
 *
 * ============ 表單已經建好了，你現在要跑的是： ============
 *   addOtherOptions()  兩題各加「其他」（跑一次就好）
 *   renameMembers()    改「你是誰」的選項（改完 MEMBERS 再跑）
 *   testGitHub()       確認 GITHUB_TOKEN 通不通
 *   testOnce()         送一筆假交件，走完整條路
 *   showConfig()       忘記網址時印出來
 *   backfillAll()      漏件補跑
 *
 * ⚠️ 不要跑 setup() —— 那是第一次建表單用的。再跑會建出第二份，
 *    現在的表單、試算表、觸發器全部作廢。
 *
 * ============ 重貼這個檔會不會掉設定 ============
 *   NOTIFY_EMAILS  已經填在下面了，不用再補
 *   GITHUB_TOKEN   存在「專案設定 → 指令碼屬性」，不會掉
 *   時區            存在「專案設定」，不會掉
 *   → 所以重貼完直接存檔就好。
 *
 * ============ 檔案上傳題 ============
 *   Apps Script 的 FormApp 沒有建立檔案上傳題的 API，這裡做不到。
 *   要的話去表單編輯畫面手動加，見 inbox/FORM-SPEC.md。
 */



// ===================== 只改這一段 =====================

var CFG = {
  // 通知信收件人：A 和 B 都要放。
  // ⚠️ 只放一個的話，Day 1 B 單飛時就收不到任何通知。
  //    已經填好了，重貼這個檔不用再補。
  NOTIFY_EMAILS: ['a96020183@gmail.com', 'lint96409@gmail.com'],

  // Google Chat 空間的 webhook 網址；留空字串就不發 Chat
  CHAT_WEBHOOK: '',

  TZ: 'Asia/Taipei',

  // 交件檔直接 commit 進 GitHub 的 inbox/，A 和 B 換機器只要 clone 就有。
  GITHUB_REPO:   'a96020183/buildmode2026',
  GITHUB_BRANCH: 'main',
  // ⚠️ token 不要寫在這裡。放「專案設定 → 指令碼屬性」，
  //    屬性名 GITHUB_TOKEN。寫在程式碼裡會跟著這個檔被複製、貼進 repo。
};

// =====================================================


// ---- 三位交件夥伴的名字（要和 build-status.ps1 的 $PEOPLE form 欄位一字不差）----

var MEMBERS = ['過勞星語', '黑奴小恩', '佐佐木阿崴'];

var SECTIONS = [
  '1 問題',
  '2 為什麼是現在',
  '3 解法',
  '6 市場與競品',
  '7 商業模式',
  '8 下一步',
  '不放提案（QA 回報用）'
];

var TYPE_RESEARCH = '研究素材';
var TYPE_QA       = 'QA 回報';
var TYPE_SECTION  = '提案段落';
var TYPE_OTHER    = '其他';


// 共同題的題目文字 —— 和 setup() 建出來的一致，改題目的話這裡也要改

var Q = {
  WHO:  '你是誰',
  TYPE: '交件類型',
  WHAT: '這是什麼（一句）',
  SECT: '要放提案哪一節',
  SRC:  '資料來源',
};


//////////////////////////////////////////////////////////////////////
// ↓↓↓ 常用的在這裡 ↓↓↓
//////////////////////////////////////////////////////////////////////


/**
 * 給「已經建好」的表單補上兩個「其他」。跑一次就好，重複跑會偵測並跳過。
 *
 *   ① 交件類型  → 加第 4 個選項「其他」＋對應區段
 *   ② 放提案哪一節 → 加「其他」讓人自己打字
 *
 * 兩處都不用 showOtherOption 或都得換題型，原因不同：
 *   ① 交件類型是分流題，而表單的「其他」選項不能設定跳轉 —— 選了會掉到
 *      下一個區段（研究素材）。所以要用真正的第 4 個選項配一個新區段。
 *   ② 放哪一節是下拉選單，下拉選單根本沒有「其他」。而 Apps Script 不能改
 *      既有題目的型別，只能刪掉、重建成單選題、再搬回原位。
 */
function addOtherOptions() {
  var formId = prop('FORM_ID');
  if (!formId) throw new Error('沒有 FORM_ID —— 先跑 setup()');

  var form = FormApp.openById(formId);
  var done = [];

  // ---------- ① 交件類型：第 4 個選項 + 新區段 ----------
  var items = form.getItems();
  var typeItem = null, pbs = {};
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    if (it.getTitle() === Q.TYPE && it.getType() === FormApp.ItemType.MULTIPLE_CHOICE) {
      typeItem = it.asMultipleChoiceItem();
    }
    if (it.getType() === FormApp.ItemType.PAGE_BREAK) {
      pbs[it.getTitle()] = it.asPageBreakItem();
    }
  }
  if (!typeItem) throw new Error('找不到「' + Q.TYPE + '」那一題（要是單選題）');

  if (pbs[TYPE_OTHER]) {
    done.push('「' + Q.TYPE + '」已經有「' + TYPE_OTHER + '」區段，跳過');
  } else {
    var pbOther = form.addPageBreakItem()
        .setTitle(TYPE_OTHER)
        .setHelpText('上面三類都不是的話走這裡');
    form.addTextItem()
        .setTitle('那是什麼？（自己描述類型）')
        .setRequired(true);
    form.addParagraphTextItem()
        .setTitle('內容')
        .setHelpText('想交什麼就寫這裡。有出處的話一定要附上。')
        .setRequired(true);
    form.addParagraphTextItem()
        .setTitle('附件連結')
        .setHelpText('截圖或檔案貼到群組後，把連結貼這裡');

    var choices = [];
    [TYPE_RESEARCH, TYPE_QA, TYPE_SECTION].forEach(function (x) {
      if (!pbs[x]) throw new Error('找不到「' + x + '」區段，表單結構被改過？');
      choices.push(typeItem.createChoice(x, pbs[x]));
    });
    choices.push(typeItem.createChoice(TYPE_OTHER, pbOther));
    typeItem.setChoices(choices);
    pbOther.setGoToPage(FormApp.PageNavigationType.SUBMIT);
    done.push('「' + Q.TYPE + '」已加第 4 個選項「' + TYPE_OTHER + '」＋新區段');
  }

  // ---------- ② 放提案哪一節：加「其他」 ----------
  items = form.getItems();          // 上面動過結構，重新抓
  var idx = -1;
  for (var k = 0; k < items.length; k++) {
    if (items[k].getTitle() === Q.SECT) { idx = k; break; }
  }
  if (idx === -1) throw new Error('找不到「' + Q.SECT + '」那一題');

  var sectItem = items[idx];
  if (sectItem.getType() === FormApp.ItemType.MULTIPLE_CHOICE) {
    sectItem.asMultipleChoiceItem()
            .setChoiceValues(SECTIONS)
            .setRequired(true)
            .showOtherOption(true);
    done.push('「' + Q.SECT + '」已確保有「其他」（原本就是單選題）');
  } else {
    form.deleteItem(sectItem);
    var mc = form.addMultipleChoiceItem()
                 .setTitle(Q.SECT)
                 .setHelpText('都不是的話選「其他」自己打')
                 .setChoiceValues(SECTIONS)
                 .setRequired(true);
    mc.showOtherOption(true);
    form.moveItem(form.getItems().length - 1, idx);
    done.push('「' + Q.SECT + '」原本是下拉選單、沒有「其他」，'
            + '已換成單選題並搬回第 ' + (idx + 1) + ' 題');
  }

  var msg = done.join('　｜　') + '　｜　既有回覆不受影響。';
  Logger.log(msg);
  return msg;
}

/**
 * 只換「你是誰」的選項，不重建表單。
 * 改上面的 MEMBERS 之後跑這個 —— 網址、試算表、觸發器、既有回覆全部不受影響。
 */
function renameMembers() {
  var formId = prop('FORM_ID');
  if (!formId) throw new Error('沒有 FORM_ID —— 先跑 setup()');

  var items = FormApp.openById(formId).getItems();
  var hit = null;
  for (var i = 0; i < items.length; i++) {
    if (items[i].getTitle() === Q.WHO) { hit = items[i]; break; }
  }
  if (!hit) throw new Error('找不到「' + Q.WHO + '」那一題，題目文字是不是被改過？');

  var t = hit.getType();
  if (t === FormApp.ItemType.LIST) {
    hit.asListItem().setChoiceValues(MEMBERS);
  } else if (t === FormApp.ItemType.MULTIPLE_CHOICE) {
    hit.asMultipleChoiceItem().setChoiceValues(MEMBERS);
  } else {
    throw new Error('「' + Q.WHO + '」不是選擇題（型別 ' + t + '）');
  }

  var msg = [
    '已把「' + Q.WHO + '」的選項換成：' + MEMBERS.join('、'),
    '注意：build-status.ps1 裡 $PEOPLE 的 form 欄位要跟這三個字串一字不差。'
  ].join(' ');
  Logger.log(msg);
  return msg;
}

/** 活動前先測 token 通不通，不要等真的有人交件才發現 */
function testGitHub() {
  var token = prop('GITHUB_TOKEN');
  if (!token) {
    var m = '沒有 GITHUB_TOKEN。去「專案設定 → 指令碼屬性 → 新增指令碼屬性」，'
          + '屬性名填 GITHUB_TOKEN，值填你的 fine-grained PAT。';
    Logger.log(m);
    return m;
  }
  var res = UrlFetchApp.fetch('https://api.github.com/repos/' + CFG.GITHUB_REPO, {
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' },
    muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  var msg;
  if (code === 200) {
    var j = JSON.parse(res.getContentText());
    msg = 'token 正常。repo = ' + j.full_name + '（' + (j.private ? 'private' : 'public') + '）'
        + '，權限 push = ' + (j.permissions && j.permissions.push);
    if (!(j.permissions && j.permissions.push)) {
      msg += '  ⚠️ 沒有 push 權限，token 要給 Contents: Read and write';
    }
  } else if (code === 401) {
    msg = 'token 無效或過期（401）。重新產一個。';
  } else if (code === 404) {
    msg = 'repo 找不到或 token 沒授權給它（404）。fine-grained PAT 要在 '
        + 'Repository access 明確勾選 ' + CFG.GITHUB_REPO + '。';
  } else {
    msg = '未預期的回應 ' + code + '：' + res.getContentText().slice(0, 180);
  }
  Logger.log(msg);
  return msg;
}

/** 不用等人交件，自己送一筆假的測整條路 */
function testOnce() {
  var fake = {};
  fake[Q.WHO]  = '測試';
  fake[Q.TYPE] = 'QA 回報';
  fake[Q.WHAT] = '這是一筆測試，確認落檔和通知都會動';
  fake[Q.SECT] = '不放提案（QA 回報用）';
  fake[Q.SRC]  = '我自己實測';
  fake['嚴重程度'] = 'A 級 —— 評審看到會當場出戲（跑不起來、算錯、卡住、亂碼）';
  var md = buildMarkdown(fake);
  var f  = writeFile(md.filename, md.body);
  var gh = pushToGitHub(md.filename, md.body);
  notify(md, f, gh);
  var msg = '測試完成：Drive 已落檔 ' + f.getName()
          + ' ／ ' + gh.msg
          + ' ／ 通知已寄給 ' + CFG.NOTIFY_EMAILS.join('、');
  Logger.log(msg);
  return msg;
}

/** 印出目前存的設定，忘記網址時跑這個 */
function showConfig() {
  var p = PropertiesService.getScriptProperties().getProperties();
  var lines = ['---- 目前設定 ----'];
  Object.keys(p).sort().forEach(function (k) { lines.push(k + ' = ' + p[k]); });
  if (p.FORM_ID) {
    try {
      var f = FormApp.openById(p.FORM_ID);
      lines.push('填答網址 = ' + f.getPublishedUrl());
      lines.push('編輯網址 = ' + f.getEditUrl());
    } catch (err) { lines.push('（表單讀不到：' + err + '）'); }
  }
  var out = lines.join('\n');
  Logger.log(out);
  return out;
}

/**
 * 補跑：觸發器壞掉、或裝之前已經有人交過件時用。
 * 重新落檔所有回覆，同名檔案會跳過，可以安全重複跑。
 */
function backfillAll() {
  var formId = prop('FORM_ID');
  if (!formId) throw new Error('沒有 FORM_ID —— 先跑 SetupForm.gs 的 setup()');

  var folder = DriveApp.getFolderById(prop('FOLDER_ID'));
  var responses = FormApp.openById(formId).getResponses();
  var added = 0, skipped = 0;

  responses.forEach(function (r) {
    var a = {};
    r.getItemResponses().forEach(function (ir) {
      var v = ir.getResponse();
      a[ir.getItem().getTitle()] = (v instanceof Array) ? v.join('、') : String(v == null ? '' : v).trim();
    });
    var md = buildMarkdown(a);
    if (folder.getFilesByName(md.filename).hasNext()) { skipped++; return; }
    folder.createFile(md.filename, md.body, MimeType.PLAIN_TEXT);
    pushToGitHub(md.filename, md.body);
    added++;
  });

  var msg = '補跑完成：新增 ' + added + ' 份，跳過 ' + skipped + ' 份（已存在）。';
  Logger.log(msg);
  return msg;
}


//////////////////////////////////////////////////////////////////////
// ↓↓↓ setup() 只有第一次建表單才跑。已經有表單了就不要碰。 ↓↓↓
//////////////////////////////////////////////////////////////////////


function setup() {
  var props = PropertiesService.getScriptProperties();

  // ---------- 1. Drive 資料夾 ----------
  var parent = DriveApp.createFolder('BUILDMODE 2026 交件');
  var files  = parent.createFolder('交件檔案');   // ← Drive for Desktop 鏡像這個
  props.setProperty('FOLDER_ID', files.getId());

  // ---------- 2. 表單 ----------
  var form = FormApp.create('BUILDMODE 2026 · 交件');
  form.setDescription(
    '一次交一個主題。必填欄位填不完整就送不出去，所以你不會遇到「交了才被退回」。\n\n' +
    '⚠️ 不要交「AI 一次生出來的完整章節」——讀起來每句都對，但沒有一句能用，我們只能整段重寫。\n' +
    '要交的是有出處的東西：具體的數字、名稱、報價，或真人說過的話。\n\n' +
    '交完請在群組貼一行「我交了什麼、哪一類」。'
  );
  form.setConfirmationMessage('收到了。記得去群組貼一行說你交了什麼。')
      .setAllowResponseEdits(true)
      .setLimitOneResponsePerUser(false)
      .setProgressBar(true)
      .setShowLinkToRespondAgain(true)
      .setCollectEmail(false);

  // ===== 第 1 區：共同，全部必填 =====
  form.addListItem()
      .setTitle('你是誰')
      .setChoiceValues(MEMBERS)
      .setRequired(true);

  // 分流題先佔位，選項要等後面的區段建好才能指過去
  var typeItem = form.addMultipleChoiceItem()
      .setTitle('交件類型')
      .setHelpText('選一個，後面的問題會跟著換')
      .setRequired(true);

  form.addTextItem()
      .setTitle('這是什麼（一句）')
      .setRequired(true);

  // 單選題而不是下拉選單 —— 下拉選單沒有「其他」選項
  form.addMultipleChoiceItem()
      .setTitle('要放提案哪一節')
      .setHelpText('都不是的話選「其他」自己打')
      .setChoiceValues(SECTIONS)
      .setRequired(true)
      .showOtherOption(true);

  form.addParagraphTextItem()
      .setTitle('資料來源')
      .setHelpText('哪裡來的？連結、報告名稱、或你問了誰。QA 回報就寫「我自己實測」。')
      .setRequired(true);

  // ===== 第 2 區：研究素材 =====
  var pbResearch = form.addPageBreakItem()
      .setTitle(TYPE_RESEARCH)
      .setHelpText('競品、市場數據、使用者訪談');

  form.addTextItem()
      .setTitle('我查到什麼（一行講完）')
      .setRequired(true);

  form.addParagraphTextItem()
      .setTitle('具體內容')
      .setHelpText(
        '一條一行，每條都要有出處。\n' +
        '✕ 會被退：「主要競品包括多家國內外廠商」\n' +
        '✓ 能用：「競品 A：月費 $299、缺 XX 功能（我實際註冊試用過）」')
      .setRequired(true);

  form.addParagraphTextItem()
      .setTitle('這對我們的提案有什麼用（我的看法）')
      .setHelpText('這段是你的判斷，不用出處，但講清楚是你的看法')
      .setRequired(true);

  form.addParagraphTextItem()
      .setTitle('我查了但沒查到的')
      .setHelpText('也很有用，寫出來省得別人重查一次');

  form.addParagraphTextItem()
      .setTitle('附件連結')
      .setHelpText('截圖或檔案貼到群組後，把連結貼這裡');

  // ===== 第 3 區：QA 回報 =====
  var pbQa = form.addPageBreakItem()
      .setTitle(TYPE_QA)
      .setHelpText('把 demo 拿去玩，找出評審看到會出事的地方。請用電腦測。');

  form.addTextItem()
      .setTitle('裝置 / 瀏覽器')
      .setRequired(true);

  form.addTextItem()
      .setTitle('測的是哪個版本或網址')
      .setRequired(true);

  form.addParagraphTextItem()
      .setTitle('我做了什麼（一步一步，越細越好）')
      .setHelpText('1. …\n2. …\n3. …')
      .setRequired(true);

  form.addParagraphTextItem()
      .setTitle('我以為會發生什麼')
      .setRequired(true);

  form.addParagraphTextItem()
      .setTitle('實際發生了什麼')
      .setRequired(true);

  form.addMultipleChoiceItem()
      .setTitle('嚴重程度')
      .setHelpText('三天內只保證修 A 級。B / C 級照樣寫，有空會修，也可能寫進提案的「下一步」。')
      .setChoiceValues([
        'A 級 —— 評審看到會當場出戲（跑不起來、算錯、卡住、亂碼）',
        'B 級 —— 難用，但不會壞',
        'C 級 —— 只是我覺得可以更好'
      ])
      .setRequired(true);

  form.addParagraphTextItem()
      .setTitle('截圖 / 錄影')
      .setHelpText('貼到群組後把連結貼這裡，或寫「已貼群組」');

  form.addParagraphTextItem()
      .setTitle('我建議怎麼改')
      .setHelpText('可以寫，我們不一定照做——有時候改動的風險比問題本身大');

  // ===== 第 4 區：提案段落 =====
  var pbSection = form.addPageBreakItem()
      .setTitle(TYPE_SECTION)
      .setHelpText('你認養那一節的文字');

  form.addTextItem()
      .setTitle('這一節唯一要說的一句話')
      .setHelpText('先寫這句。寫不出來就別往下寫——表示這節還沒想清楚。')
      .setRequired(true);

  form.addParagraphTextItem()
      .setTitle('內文（3–6 句，不要更長）')
      .setHelpText('簡報一頁講不完 6 句。寫 20 句我們也只會用 5 句，而且是我們挑的不是你挑的。')
      .setRequired(true);

  form.addTextItem()
      .setTitle('這頁如果只放一張圖或一個數字，放什麼')
      .setRequired(true);

  form.addTextItem()
      .setTitle('支撐材料（哪一份研究素材支持這段）');

  // ===== 第 5 區：其他 =====
  var pbOther = form.addPageBreakItem()
      .setTitle(TYPE_OTHER)
      .setHelpText('上面三類都不是的話走這裡');

  form.addTextItem()
      .setTitle('那是什麼？（自己描述類型）')
      .setRequired(true);

  form.addParagraphTextItem()
      .setTitle('內容')
      .setHelpText('想交什麼就寫這裡。有出處的話一定要附上。')
      .setRequired(true);

  form.addParagraphTextItem()
      .setTitle('附件連結')
      .setHelpText('截圖或檔案貼到群組後，把連結貼這裡');

  // ---------- 接上分流 ----------
  // 註：「其他」用真正的第 4 個選項，不用 showOtherOption ——
  // 表單的「其他」選項不能設定跳轉，選了會掉到下一個區段。
  typeItem.setChoices([
    typeItem.createChoice(TYPE_RESEARCH, pbResearch),
    typeItem.createChoice(TYPE_QA,       pbQa),
    typeItem.createChoice(TYPE_SECTION,  pbSection),
    typeItem.createChoice(TYPE_OTHER,    pbOther)
  ]);

  // 每個區段做完就送出，不要往下掉到別的區段
  pbResearch.setGoToPage(FormApp.PageNavigationType.SUBMIT);
  pbQa.setGoToPage(FormApp.PageNavigationType.SUBMIT);
  pbSection.setGoToPage(FormApp.PageNavigationType.SUBMIT);
  pbOther.setGoToPage(FormApp.PageNavigationType.SUBMIT);

  // ---------- 3. 回覆試算表 ----------
  var ss = SpreadsheetApp.create('BUILDMODE 2026 · 交件回覆');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  props.setProperty('FORM_ID',  form.getId());
  props.setProperty('SHEET_ID', ss.getId());
  props.setProperty('SHEET_URL', ss.getUrl());

  // 收進同一個資料夾，Drive 根目錄才不會亂
  try {
    DriveApp.getFileById(form.getId()).moveTo(parent);
    DriveApp.getFileById(ss.getId()).moveTo(parent);
  } catch (err) {
    Logger.log('搬檔案失敗（不影響功能）：' + err);
  }

  // ---------- 4. 觸發器 ----------
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'onFormSubmit') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onFormSubmit').forForm(form).onFormSubmit().create();

  // ---------- 5. 印出來 ----------
  var out = [
    '',
    '========== 建好了 ==========',
    '',
    '① 填答網址（傳給 C 三人）',
    '   ' + form.getPublishedUrl(),
    '',
    '② 編輯網址（你要改題目時用）',
    '   ' + form.getEditUrl(),
    '',
    '③ 回覆試算表',
    '   ' + ss.getUrl(),
    '',
    '④ 交件檔案資料夾（Drive for Desktop 鏡像這個）',
    '   ' + files.getUrl(),
    '   FOLDER_ID = ' + files.getId(),
    '',
    '========== 還要做兩件事 ==========',
    '',
    '1. FormIntake.gs 的 CFG.NOTIFY_EMAILS 要放 A 和 B「兩個」email，',
    '   不然 Day 1 B 單飛時會收不到。改完不用重跑 setup()。',
    '',
    '2. 去表單編輯畫面手動加「檔案上傳」題（Apps Script 建不了這種題型，',
    '   是 API 限制）。不加也能跑——現在用的是「貼連結」的替代題。',
    '',
    '把 ① 填進 inbox/HOW-TO-SUBMIT.md 和 dashboard 的說明，',
    '把 ④ 的本機鏡像路徑填進 sync-inbox.ps1 的 $Src。',
    ''
  ].join('\n');
  Logger.log(out);
  return out;
}


//////////////////////////////////////////////////////////////////////
// 以下是觸發器和工具函式，平常不用管
//////////////////////////////////////////////////////////////////////


function prop(k) {
  return PropertiesService.getScriptProperties().getProperty(k) || '';
}

/**
 * 把兩種觸發器的事件物件都正規化成 { 題目: 答案 }。
 *   表單綁定（setup() 裝的）→ e.response
 *   試算表綁定（舊做法）    → e.namedValues
 */
function toAnswers(e) {
  var out = {};
  if (e && e.namedValues) {
    Object.keys(e.namedValues).forEach(function (k) {
      var v = e.namedValues[k];
      out[k] = (v && v[0] != null) ? String(v[0]).trim() : '';
    });
    return out;
  }
  if (e && e.response) {
    e.response.getItemResponses().forEach(function (ir) {
      var v = ir.getResponse();
      out[ir.getItem().getTitle()] = (v instanceof Array) ? v.join('、') : String(v == null ? '' : v).trim();
    });
  }
  return out;
}

/** 主流程：表單每提交一次跑一次 */
function onFormSubmit(e) {
  try {
    var md = buildMarkdown(toAnswers(e));
    var f  = writeFile(md.filename, md.body);          // Drive 落檔（備份，網頁看得到）
    var gh = pushToGitHub(md.filename, md.body);       // GitHub 才是主路
    notify(md, f, gh);
  } catch (err) {
    // 落檔或通知失敗時至少讓自己知道，不要靜靜地掉件
    try {
      MailApp.sendEmail(
        CFG.NOTIFY_EMAILS[0],
        '[交件自動化] 執行失敗，請手動去試算表看',
        String(err) + '\n\n' + (err.stack || '')
      );
    } catch (e2) { /* 連信都寄不出去就算了，至少留在執行紀錄 */ }
    throw err;
  }
}

/** 把一筆回覆組成 markdown（開頭三行是 CLAUDE.md 的 intake 規則要讀的） */
function buildMarkdown(a) {
  function g(k) { return (a[k] != null && a[k] !== '') ? String(a[k]).trim() : ''; }

  var who  = g(Q.WHO)  || '未填';
  var type = g(Q.TYPE) || '未分類';
  var what = g(Q.WHAT) || '(未填)';
  var sect = g(Q.SECT) || '(未填)';
  var src  = g(Q.SRC)  || '(未填)';

  var now   = new Date();
  var stamp = Utilities.formatDate(now, CFG.TZ, 'MMdd-HHmm');
  var full  = Utilities.formatDate(now, CFG.TZ, 'yyyy-MM-dd HH:mm');

  var body = '';
  body += '這是什麼：' + what + '\n';
  body += '要放提案哪一節：' + sect + '\n';
  body += '資料來源：' + src + '\n';
  body += '\n---\n\n';
  body += '- 交件人：' + who + '\n';
  body += '- 交件類型：' + type + '\n';
  body += '- 交件時間：' + full + '\n\n';

  // 其餘題目照原題目文字當標題輸出 —— 表單加題不用改這支腳本
  var skip = {};
  [Q.WHO, Q.TYPE, Q.WHAT, Q.SECT, Q.SRC, '時間戳記', 'Timestamp'].forEach(function (k) { skip[k] = true; });
  Object.keys(a).forEach(function (k) {
    if (skip[k]) return;
    var v = String(a[k] == null ? '' : a[k]).trim();
    if (!v) return;
    body += '## ' + k + '\n\n' + v + '\n\n';
  });

  return {
    filename: sanitize(stamp + '_' + who + '_' + type + '.md'),
    body: body,
    who: who, type: type, what: what, sect: sect,
  };
}

function writeFile(filename, body) {
  var id = prop('FOLDER_ID');
  if (!id) throw new Error('沒有 FOLDER_ID —— 先跑 SetupForm.gs 的 setup()');
  return DriveApp.getFolderById(id).createFile(filename, body, MimeType.PLAIN_TEXT);
}

/**
 * 把交件檔直接 commit 進 GitHub 的 inbox/。
 * token 從指令碼屬性 GITHUB_TOKEN 讀 —— 沒設就靜靜略過（Drive 還是有落檔）。
 */
function pushToGitHub(filename, body) {
  var token = prop('GITHUB_TOKEN');
  if (!token) {
    return { ok: false, skipped: true, msg: '沒設 GITHUB_TOKEN，略過 GitHub' };
  }

  var path = 'inbox/' + filename;
  var url  = 'https://api.github.com/repos/' + CFG.GITHUB_REPO + '/contents/'
           + path.split('/').map(encodeURIComponent).join('/');

  var res = UrlFetchApp.fetch(url, {
    method: 'put',
    contentType: 'application/json; charset=UTF-8',
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    payload: JSON.stringify({
      message: '交件：' + filename,
      content: Utilities.base64Encode(body, Utilities.Charset.UTF_8),
      branch: CFG.GITHUB_BRANCH
    }),
    muteHttpExceptions: true
  });

  var code = res.getResponseCode();
  if (code === 201 || code === 200) {
    return { ok: true, msg: '已進 GitHub inbox/' + filename };
  }
  if (code === 422) {
    return { ok: true, msg: 'GitHub 已有同名檔，跳過' };   // 補跑時會遇到，不算錯
  }
  return {
    ok: false,
    msg: 'GitHub 推送失敗 ' + code + '：' + res.getContentText().slice(0, 180)
  };
}

/** 通知 A + B。Chat 優先（手機看得快），email 一定寄（附全文） */
function notify(md, file, gh) {
  var title = '[交件] ' + md.who + ' ・ ' + md.type;
  var lines = [
    title,
    '這是什麼：' + md.what,
    '放哪一節：' + md.sect,
    '落檔：' + file.getName(),
  ];
  // GitHub 的結果一定要寫進通知 —— 靜靜失敗的話會以為交件進來了其實沒有
  if (gh) lines.push(gh.ok ? gh.msg : ('⚠️ ' + gh.msg));
  var sheet = prop('SHEET_URL');
  if (sheet) lines.push('試算表：' + sheet);
  var summary = lines.join('\n');

  if (CFG.CHAT_WEBHOOK) {
    try {
      UrlFetchApp.fetch(CFG.CHAT_WEBHOOK, {
        method: 'post',
        contentType: 'application/json; charset=UTF-8',
        payload: JSON.stringify({ text: summary }),
        muteHttpExceptions: true,
      });
    } catch (err) {
      Logger.log('Chat 通知失敗（不擋 email）：' + err);
    }
  }

  if (CFG.NOTIFY_EMAILS && CFG.NOTIFY_EMAILS.length) {
    MailApp.sendEmail({
      to: CFG.NOTIFY_EMAILS.join(','),
      subject: title + ' ・ ' + md.what.slice(0, 60),
      body: summary + '\n\n----- 全文 -----\n\n' + md.body,
    });
  }
}

function sanitize(name) {
  return String(name).replace(/[\\\/:*?"<>|]/g, '-').replace(/\s+/g, '_');
}
