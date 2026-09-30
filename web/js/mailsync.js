// 문플로 — 구글 시트 편지함: 시트에서 편지를 받아 오고, 달해가 쓴 답장을 시트로 보냄
'use strict';
(() => {
  const url = () => RULES.mailUrl || '';
  const q = u => u + (u.includes('?') ? '&' : '?') + 't=' + Date.now();
  let busy = false;
  async function pull() {
    if (!url() || !G.S || busy) return; busy = true;
    try {
      await flush();
      const r = await fetch(q(url())), list = await r.json(); if (!Array.isArray(list)) return;
      let n = 0; const now = Date.now();
      for (const L of list) {
        const id = 'r_' + L.id; if (G.S.mails.some(m => m.id === id)) continue;
        if (L.at && new Date(L.at).getTime() > now) continue;
        const m = { id, from: L.from || '', body: L.body || '', read: false };
        if (L.coins || L.gems || L.hint) m.gift = { coins: +L.coins || 0, gems: +L.gems || 0, hint: +L.hint || 0 };
        G.S.mails.push(m); n++;
      }
      try { if (window.FarmBridge && FarmBridge.mailSync) FarmBridge.mailSync(url(), G.S.mails.filter(m => m.id.indexOf('r_') === 0).map(m => m.id.slice(2)).join(',')); } catch (e) {}
      if (n) { save(); G.dirty = true; toast(n > 1 ? `새 편지가 ${n}통 왔어요` : '우체통에 새 편지가 왔어요', 3200); }
    } catch (e) {} finally { busy = false; }
  }
  async function flush() {                      // 못 보낸 답장을 다시 보냄
    const box = G.S.outbox || []; if (!box.length || !url()) return;
    const left = [];
    for (const m of box) {
      try { const r = await fetch(url(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(m) }); if (!r.ok) left.push(m); }
      catch (e) { left.push(m); }
    }
    G.S.outbox = left; save();
  }
  window.sendReply = async function (body) {
    G.S.outbox = G.S.outbox || []; G.S.outbox.push({ from: RULES.mailFrom || '달해', body, at: Date.now() }); save();
    const before = G.S.outbox.length; await flush();
    return !(G.S.outbox && G.S.outbox.length >= before);
  };
  window.mailReady = () => !!url();
  window.pullMails = pull;
  setInterval(pull, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) pull(); });
  const t = setInterval(() => { if (G.S) { clearInterval(t); setTimeout(pull, 2500); } }, 500);
})();
