/**
 * BUILDMODE GEN-AI HACKATHON 2026 —— 一鍵建表單
 *
 * 跑 setup() 一次，它會幫你做完：
 *   1. 建 Drive 資料夾（交件的 .md 會落在這，給 Drive for Desktop 鏡像）
 *   2. 建整張 Google Form（4 個區段、分流、必填全設好）
 *   3. 建回覆試算表並掛上
 *   4. 裝 onFormSubmit 觸發器
 *   5. 把所有 ID 存進 ScriptProperties（不用手抄）
 *   6. 印出三個網址給你填回專案
 *
 * 怎麼跑：
 *   script.google.com → 新專案 → 貼入這個檔和 FormIntake.gs
 *   → 改 FormIntake.gs 的 CFG（收件人 email）→ 選 setup 執行 → 授權 → 看執行紀錄
 *
 * ⚠️ setup() 每跑一次就多建一份表單。要重來的話先把舊的刪掉。
 */

// ---- 三位交件夥伴的名字（要和 build-status.ps1 的 $PEOPLE form 欄位一字不差）----
// 改完跑 renameMembers() 就會更新表單選項，不用重建表單
var MEMBERS = ['過勞星語', '黑奴小恩', '佐佐木阿崴'];

// ---- 提案節次，取自 deck/OUTLINE.md（第 4、5 節是 A/B 的，不給 C 選）----
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
