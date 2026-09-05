/**
 * BUILDMODE GEN-AI HACKATHON 2026 —— 交件自動化
 *
 * 表單提交 → 寫成 .md 落檔到 Drive → 同時通知 A 和 B
 *
 * 和 SetupForm.gs 放在同一個 Apps Script 專案裡（兩個檔共用全域變數）。
 * 先改下面的 CFG，再去跑 SetupForm.gs 的 setup()。
 *
 * 表單 ID、資料夾 ID 這些由 setup() 自動存進 ScriptProperties，不用手抄。
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


// 共同題的題目文字 —— 和 SetupForm.gs 建出來的一致，改題目的話這裡也要改
var Q = {
  WHO:  '你是誰',
  TYPE: '交件類型',
  WHAT: '這是什麼（一句）',
  SECT: '要放提案哪一節',
  SRC:  '資料來源',
};


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


function sanitize(name) {
  return String(name).replace(/[\\\/:*?"<>|]/g, '-').replace(/\s+/g, '_');
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
