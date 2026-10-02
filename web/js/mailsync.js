// 문플로·썬플로 공통 — 구글 시트 우체통: 편지(무제한)와 선물(꽃·골드, 하루 3번, 30분 뒤 도착)을 서로 주고받음
'use strict';
(() => {
  const url = () => RULES.mailUrl || '';
  const q = (u, extra) => u + (u.includes('?') ? '&' : '?') + 't=' + Date.now() + (extra || '');
  const GIFT_DAY = 3, LIM = () => ({ coins: 500, flowers: 10 });   // 선물: 하루 3번, 한 번에 골드 500·꽃 10송이까지 (나중에 늘릴 수 있음)
  let busy = false, flushing = false, ver = 0;
  const parseFl = s => { const o = {}; String(s || '').split(',').forEach(p => { const [k, v] = p.split(':'); if (k && FLOWER[k.trim()] && +v > 0) o[k.trim()] = +v; }); return o; };
  async function checkVer() {                   // 시트 쪽 프로그램이 선물을 지원하는지 (새 버전이면 {v:2})
    if (ver || !url()) return;
    try { const r = await fetch(q(url(), '&ping=1')), j = await r.json(); ver = (j && !Array.isArray(j) && j.v) || 1; } catch (e) {}
  }
  async function pull() {
    if (!url() || !G.S || busy) return; busy = true;
    try {
      await checkVer(); if (url().includes('box=') && ver < 2) return;   // 케인 우체통은 시트가 새 버전일 때만
      await flush();
      const r = await fetch(q(url())), list = await r.json(); if (!Array.isArray(list)) return;
      let n = 0, gifts = 0; const now = Date.now();
      for (const L of list) {
        const id = 'r_' + L.id; if (G.S.mails.some(m => m.id === id)) continue;
        if (L.at && new Date(L.at).getTime() > now) continue;            // 아직 도착 전(택배 30분)
        const m = { id, from: L.from || '', body: L.body || '', read: false }, fl = parseFl(L.flowers);
        if (L.coins || L.gems || L.hint || Object.keys(fl).length) { m.gift = { coins: +L.coins || 0, gems: +L.gems || 0, hint: +L.hint || 0 }; if (Object.keys(fl).length) m.gift.flowers = fl; gifts++; }
        G.S.mails.push(m); n++;
      }
      try { if (window.FarmBridge && FarmBridge.mailSync) FarmBridge.mailSync(url(), G.S.mails.filter(m => m.id.indexOf('r_') === 0).map(m => m.id.slice(2)).join(',')); } catch (e) {}
      if (n) { save(); G.dirty = true; toast(gifts ? '우체통에 선물이 도착했어요!' : n > 1 ? `새 편지가 ${n}통 왔어요` : '우체통에 새 편지가 왔어요', 3200); }
    } catch (e) {} finally { busy = false; }
  }
  async function flush() {                      // 못 보낸 편지·선물을 다시 보냄 (같은 번호는 시트가 한 번만 받음)
    const box = G.S.outbox || []; if (!box.length || !url() || flushing) return; flushing = true;
    try {
      const left = [];
      for (const m of box) {
        if (m.gift && ver < 2) { left.push(m); continue; }               // 시트가 아직 옛 버전이면 선물은 보관
        try { const r = await fetch(url(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(m) }); if (!r.ok) left.push(m); }
        catch (e) { left.push(m); }
      }
      G.S.outbox = left; save();
    } finally { flushing = false; }
  }
  const cid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  let sending = false;
  window.sendReply = async function (body) {
    if (sending) return true; sending = true;                            // 여러 번 눌러도 한 번만
    try {
      G.S.outbox = G.S.outbox || []; G.S.outbox.push({ cid: cid(), to: RULES.mailTo || 'kane', from: RULES.mailFrom || '달해', body, at: Date.now() }); save();
      const before = G.S.outbox.length; await flush();
      return !(G.S.outbox && G.S.outbox.length >= before);
    } finally { sending = false; }
  };
  // 선물: coins(골드), flowers({꽃id: 송이}) — 내 것에서 바로 빠지고, 상대에게 30분 뒤 도착
  window.giftLeft = () => { const S = G.S, d = todayKey(); if (!S.giftSent || S.giftSent.day !== d) S.giftSent = { day: d, n: 0 }; return Math.max(0, GIFT_DAY - S.giftSent.n); };
  window.giftLimits = LIM;
  window.sendGift = async function (coins, flowers, body) {
    const S = G.S, GIFT_COINS = LIM().coins, GIFT_FLOWERS = LIM().flowers; coins = Math.max(0, Math.min(GIFT_COINS, coins | 0));
    const fl = {}; let tot = 0;
    for (const id in flowers) { const n = Math.min(flowers[id] | 0, S.flowers[id] || 0); if (n > 0) { fl[id] = n; tot += n; } }
    if (tot > GIFT_FLOWERS || (!coins && !tot) || coins > S.coins || giftLeft() <= 0 || sending) return false;
    sending = true;
    try {
      S.coins -= coins; for (const id in fl) S.flowers[id] -= fl[id]; S.giftSent.n++;
      S.outbox = S.outbox || [];
      S.outbox.push({ cid: cid(), to: RULES.mailTo || 'kane', from: RULES.mailFrom || '달해', body: body || '선물을 보내요', coins, flowers: Object.keys(fl).map(k => k + ':' + fl[k]).join(','), gift: 1, at: Date.now() });
      save(); G.dirty = true; await flush(); return true;
    } finally { sending = false; }
  };
  window.mailReady = () => !!url() && (!url().includes('box=') || ver >= 2);
  window.giftReady = () => !!url() && ver >= 2;
  window.pullMails = pull;
  setInterval(pull, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) pull(); });
  const t = setInterval(() => { if (G.S) { clearInterval(t); setTimeout(pull, 2500); } }, 500);
})();
