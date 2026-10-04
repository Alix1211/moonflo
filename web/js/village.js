// 플라워빌리지(마을) — 지도에서 가게를 누르면 가게 안(배경 + 사장님 + 메뉴창)으로 들어감
'use strict';
(() => {
  // 가게 자리 (그림 크기에 대한 비율 x1,y1,x2,y2)
  const SHOPS = [
    { id: 'seed',      name: '씨앗 가게', pad: [.09, .28, .22, .53], phone: [.02, .52, .41, .68] },
    { id: 'flower',    name: '꽃 도매상', pad: [.30, .27, .45, .52], phone: [.61, .44, .96, .59] },
    { id: 'general',   name: '잡화점',    pad: [.58, .28, .71, .52], phone: [.04, .25, .37, .39] },
    { id: 'furniture', name: '가구공방',  pad: [.77, .24, .96, .52], phone: [.61, .23, .96, .39] },
    { id: 'lock1', lock: true, pad: [.24, .05, .36, .25], phone: [.065, .10, .37, .22] },
    { id: 'lock2', lock: true, pad: [.44, .05, .57, .25], phone: [.39, .04, .65, .15] },
    { id: 'lock3', lock: true, pad: [.65, .05, .78, .25], phone: [.65, .10, .94, .22] },
  ];
  const SIDE = { seed: .72, flower: .72, general: .72, furniture: .26 };   // 가게 안 사장님 가로 위치
  const st = { from: 'garden', shop: null, line: '', face: 'n', btns: [], tw: 0 };
  const rectOf = s => { const r = s[G.mode]; return [r[0] * G.L.W, r[1] * G.L.H, (r[2] - r[0]) * G.L.W, (r[3] - r[1]) * G.L.H]; };
  function cover(im) {
    if (!im) { ctx.fillStyle = '#8fbf6a'; ctx.fillRect(0, 0, G.L.W, G.L.H); return; }
    const k = Math.max(G.L.W / im.width, G.L.H / im.height), w = im.width * k, h = im.height * k;
    ctx.drawImage(im, (G.L.W - w) / 2, (G.L.H - h) / 2, w, h);
  }
  const pd = () => G.mode === 'pad';
  function exitBtn(label, fn) {
    const r = pd() ? [G.L.W - 330, G.L.H - 150, 290, 110] : [G.L.W - 470, G.L.H - 200, 430, 150];
    button(r, label, { size: pd() ? 36 : 44 }); st.btns.push({ rect: r, fn });
  }
  function enterShop(s) {
    if (s.lock) { toast('아직 불이 꺼져 있어요. 언젠가 문을 열 거예요.'); return; }
    st.shop = s; Story.enter(s.id); st.tw = Date.now() + 1200; G.dirty = true;
  }
  function drawMap() {
    cover(G.img[pd() ? 'vil_map_pad' : 'vil_map_phone']);
    const fs = pd() ? 34 : 44;
    for (const s of SHOPS) {
      if (s.lock) continue;
      const [x, y, w, h] = rectOf(s), cx = x + w / 2, ty = y + h + (pd() ? 6 : 10);
      ctx.font = font(fs, 800); const tw = ctx.measureText(s.name).width + 36;
      rrect(cx - tw / 2, ty, tw, fs + 22, (fs + 22) / 2); ctx.fillStyle = 'rgba(255,248,232,.92)'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#9b7148'; ctx.stroke();
      text(s.name, cx, ty + (fs + 22) / 2 + 2, fs, '#6e4b28', 'center');
      if (Story.hasQuest(s.id)) {                       // 부탁이 있으면 가게 위에 느낌표가 통통 튐
        const R = pd() ? 34 : 44, by2 = y - R * .3 - 6 + Math.sin(Date.now() / 230) * 7;
        ctx.beginPath(); ctx.arc(cx, by2, R, 0, 7); ctx.fillStyle = '#ffc928'; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = '#fff8e8'; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, by2, R + 3, 0, 7); ctx.lineWidth = 3; ctx.strokeStyle = '#c0522c'; ctx.stroke();
        text('!', cx, by2 + 3, R * 1.5, '#c0522c', 'center');
      }
    }
    const pg = Story.prog();
    if (pg >= 0) { const t = '박람회 준비  ' + '●'.repeat(Math.min(pg, 4)) + '○'.repeat(Math.max(0, 4 - pg)), f2 = pd() ? 34 : 42; ctx.font = font(f2, 800); const tw = ctx.measureText(t).width + 50;
      rrect(G.L.W / 2 - tw / 2, pd() ? 24 : 40, tw, f2 + 30, (f2 + 30) / 2); ctx.fillStyle = 'rgba(255,248,232,.92)'; ctx.fill(); text(t, G.L.W / 2, (pd() ? 24 : 40) + (f2 + 30) / 2 + 2, f2, '#c0522c', 'center'); }
    exitBtn('돌아가기', () => go(st.from));
  }
  function drawShop() {
    const s = st.shop;
    cover(G.img['vil_st_' + s.id]);
    const ln = Story.line(), face = ln && ln[0] === 'k' ? ln[1] : 'n';
    const im = G.img[`vil_kp_${s.id}_${Date.now() < st.tw && ln && ln[0] === 'k' ? 't' : face === 't' ? 'n' : face}`] || G.img[`vil_kp_${s.id}_n`];
    const panelY = pd() ? G.L.H * .70 : G.L.H * .62;
    if (im) {
      const h = pd() ? G.L.H * .62 : G.L.H * .32, w = h * im.width / im.height, cx = G.L.W * (pd() ? SIDE[s.id] : .5);
      ctx.drawImage(im, cx - w / 2, panelY - h, w, h);
    }
    const px = pd() ? 40 : 30, pw = G.L.W - px * 2, ph = G.L.H - panelY - (pd() ? 30 : 30);
    rrect(px, panelY, pw, ph, 34); ctx.fillStyle = 'rgba(255,248,232,.95)'; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = '#9b7148'; ctx.stroke();
    const fs = pd() ? 34 : 44;
    const c = Story.cur, who = ln ? (ln[0] === 'me' ? STORY_HERO.me : KEEPER[s.id]) : KEEPER[s.id];
    text(who, px + 40, panelY + 50, fs + 4, ln && ln[0] === 'me' ? '#3f6fa8' : '#6e4b28', 'left');
    if (ln) wrap(Story.fill(ln[2]), px + 40, panelY + 50 + fs + 20, pw - 80, fs, '#5c3d1e');
    st.btns = [];
    const bh = pd() ? 110 : 150, by = G.L.H - (pd() ? 150 : 200), bw = pd() ? 360 : 520;
    if (c && c.phase === 'lines' && (c.i < c.lines.length - 1 || c.then !== 'idle')) {
      text('▼ 눌러서 다음', G.L.W - px - 40, panelY + ph - 30, fs - 8, '#b89a72', 'right');     // 이야기 중: 화면 누르면 다음
    } else if (c && c.phase === 'choice') {
      c.sc.choice.forEach((o, k) => { const r = [px + 40 + k * (bw + 30), by, bw + (pd() ? 80 : 0), bh]; if (!pd()) r[1] = by - k * (bh + 20); button(r, o.label, { size: pd() ? 32 : 40 }); st.btns.push({ rect: r, fn: () => Story.choose(k) }); });
      return;
    } else if (c && c.phase === 'need') {
      wrap('필요: ' + Story.needText(c.sc.need), px + 40, panelY + 50 + fs * 2 + 40, pw - 80, fs - 4, '#c0522c');
      const r1 = [px + 40, by, bw * .8, bh], r2 = [px + 60 + bw * .8, by, bw * .8, bh], ok = Story.canGive();
      button(r1, c.sc.need.mini ? '확인' : '드리기', { size: pd() ? 34 : 42, disabled: !ok }); st.btns.push({ rect: r1, fn: () => ok && Story.deliver() });
      button(r2, '나중에', { size: pd() ? 34 : 42 }); st.btns.push({ rect: r2, fn: () => Story.later() });
    } else {
      const r = [px + 40, by, bw, bh];
      button(r, '물건 사기', { size: pd() ? 36 : 44 }); st.btns.push({ rect: r, fn: () => { G._shopId = s.id; go('shop'); } });
    }
    exitBtn('마을로', () => { st.shop = null; G.dirty = true; });
  }
  G.screens.village = {
    onEnter(prev) { if (prev && prev !== 'shop') { st.from = prev; st.shop = null; } },
    busy: () => !!st.shop && Date.now() < st.tw + 50,
    slow: () => !st.shop && SHOPS.some(o => !o.lock && Story.hasQuest(o.id)),   // 느낌표가 튀는 동안만 부드럽게 다시 그림
    onButton() {},
    draw() { st.btns = []; if (st.shop) drawShop(); else drawMap(); },
    up(p, tap) {
      if (!tap) return;
      for (let i = st.btns.length - 1; i >= 0; i--) if (inRect(p, st.btns[i].rect)) { st.btns[i].fn(); G.dirty = true; return; }
      if (st.shop) { Story.next(); st.tw = Date.now() + 900; G.dirty = true; return; }
      const s = SHOPS.find(o => inRect(p, rectOf(o))); if (s) enterShop(s);
    },
  };
  BUTTONS.village = [];
})();
