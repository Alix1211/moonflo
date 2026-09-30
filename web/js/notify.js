// 문플로 — 알림: 꽃이 자란 때를 폰에 예약해 둠 (앱이 꺼져 있어도 알려 줌)
'use strict';
(() => {
  let timer = 0;
  function plan() {
    if (!window.FarmBridge || !FarmBridge.schedule || !G.S) return;
    const ts = [];
    for (const bed of G.S.beds) for (const c of bed) if ((c.s === 'seed' || c.s === 'bud') && c.wet && c.until > Date.now()) ts.push({ at: c.until, s: c.s });
    ts.sort((a, b) => a.at - b.at);
    const groups = [];                                       // 10분 안에 비슷하게 자라는 같은 종류는 한 번에 알림
    for (const t of ts) { const g = groups.find(x => x.s === t.s && Math.abs(t.at - x.at) < 10 * 60000); if (g) g.n++; else groups.push({ at: t.at, n: 1, s: t.s }); }
    groups.sort((a, b) => a.at - b.at);
    const out = groups.slice(0, 8).map(g => ({ at: g.at, title: '문플로', body: g.s === 'bud' ? (g.n > 1 ? `꽃 ${g.n}송이가 활짝 피었어요. 수확해 주세요` : '꽃이 활짝 피었어요. 수확해 주세요') : (g.n > 1 ? `꽃 ${g.n}송이가 자랐어요. 물을 주세요` : '꽃이 자랐어요. 물을 주세요') }));
    try { FarmBridge.schedule(JSON.stringify(out)); } catch (e) {}
  }
  const later = () => { clearTimeout(timer); timer = setTimeout(plan, 1500); };
  const f0 = window.save; if (typeof f0 === 'function') window.save = function (...a) { const r = f0.apply(this, a); later(); return r; };
  document.addEventListener('visibilitychange', () => { if (document.hidden) plan(); });
  const t = setInterval(() => { if (G.S) { clearInterval(t); setTimeout(plan, 3000); } }, 500);
})();
