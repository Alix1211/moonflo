// 문플로·썬플로 우체통 (v2) — 이 코드 전체를 Apps Script에 붙여 넣고, 「배포 관리 → 연필 → 새 버전 → 배포」
// 첫 번째 탭: 달해에게 가는 편지 (번호, 도착시각, 보낸이, 내용, 돈, 다이아, 힌트, 꽃)
// 「답장」 탭: 케인에게 가는 편지 (받은시각, 보낸이, 내용, 돈, 꽃, 번호, 도착시각)
var GIFT_DELAY_MIN = 30;   // 선물은 30분 뒤 도착

function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function iso(v) { return v instanceof Date ? v.toISOString() : (v || ''); }
function mainTab() { return SpreadsheetApp.getActive().getSheets()[0]; }
function kaneTab() {
  var ss = SpreadsheetApp.getActive(), t = ss.getSheetByName('답장');
  if (!t) { t = ss.insertSheet('답장'); t.appendRow(['받은시각', '보낸이', '내용']); }
  if (!t.getRange(1, 4).getValue()) t.getRange(1, 4, 1, 4).setValues([['돈', '꽃', '번호', '도착시각']]);
  return t;
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.ping) return out({ v: 2 });
  var list = [];
  if (p.box === 'kane') {                       // 썬플로(케인)가 받을 편지: 번호가 있는 줄만 (예전 답장은 제외)
    var v = kaneTab().getDataRange().getValues();
    for (var i = 1; i < v.length; i++) {
      var r = v[i]; if (!r[5] || !r[2]) continue;
      list.push({ id: String(r[5]), at: iso(r[6]), from: r[1], body: r[2], coins: r[3] || 0, flowers: r[4] || '' });
    }
  } else {                                      // 문플로(달해)가 받을 편지: 첫 번째 탭 (케인이 직접 쓴 줄 포함)
    var t = mainTab(); if (!t.getRange(1, 8).getValue()) t.getRange(1, 8).setValue('꽃');
    var v = t.getDataRange().getValues();
    for (var i = 1; i < v.length; i++) {
      var r = v[i]; if (!r[3]) continue;
      list.push({ id: String(r[0] || ('row' + (i + 1))), at: iso(r[1]), from: r[2], body: r[3], coins: r[4] || 0, gems: r[5] || 0, hint: r[6] || 0, flowers: r[7] || '' });
    }
  }
  return out(list);
}

function doPost(e) {
  var d = {}; try { d = JSON.parse(e.postData.contents); } catch (x) { return out({ ok: false }); }
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    var now = new Date(), at = d.gift ? new Date(now.getTime() + GIFT_DELAY_MIN * 60000) : now;
    var id = d.cid ? String(d.cid) : ('a' + now.getTime());
    if (d.to === 'dalhae') {                    // 케인 → 달해 (첫 번째 탭)
      var t = mainTab(), ids = t.getRange(1, 1, Math.max(1, t.getLastRow()), 1).getValues().map(function (x) { return String(x[0]); });
      if (ids.indexOf(id) < 0) t.appendRow([id, at, d.from || '케인', d.body || '', d.coins || '', '', '', d.flowers || '']);
    } else {                                    // 달해 → 케인 (「답장」 탭, 예전 답장도 여기로)
      var k = kaneTab(), last = k.getLastRow(), ids2 = last > 1 ? k.getRange(2, 6, last - 1, 1).getValues().map(function (x) { return String(x[0]); }) : [];
      if (ids2.indexOf(id) < 0) k.appendRow([now, d.from || '달해', d.body || '', d.coins || '', d.flowers || '', id, at]);
    }
    return out({ ok: true });
  } finally { lock.releaseLock(); }
}
