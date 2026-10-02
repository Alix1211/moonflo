// 문선농장 — 정원: 화단 가로 스크롤, 칸 누르기/쓸기로 갈기·심기·물주기·수확
'use strict';
(() => {
  const st = { scroll: 0, target: null, anim: null, drag: null, cache: [], dirtyBed: [], page: 0 };

  const cfg = () => G.L.garden;
  const bedH = () => Math.round(cfg().bedW * BED.h / BED.w);
  const pitch = () => G.mode === 'pad' ? cfg().bedW + cfg().gap : G.L.W;
  const total = () => RULES.maxBeds;     // 잠긴 화단까지 포함한 전체 칸 수
  function maxScroll() {
    const n = total();
    if (G.mode === 'phone') return (n - 1) * G.L.W;
    return Math.max(0, cfg().x0 + (n - 1) * pitch() + cfg().bedW + 60 - G.L.W);
  }
  const bedX = i => cfg().x0 + i * pitch() - st.scroll;

  function cellRect(i, k) {   // 화면 좌표의 칸
    const s = cfg().bedW / BED.w, r = Math.floor(k / 4), c = k % 4;
    return [bedX(i) + (BED.x0 + c * BED.px) * s, cfg().y + (BED.y0 + r * BED.py) * s, BED.cw * s, BED.ch * s];
  }
  function hitCell(p) {       // 칸 사이 틈까지 포함해 넉넉히
    if (G.mode === 'pad' && p.x < (cfg().fadeFrom + cfg().fadeTo) / 2) return null;   // 흐려져 안 보이는 부분
    const s = cfg().bedW / BED.w;
    for (let i = 0; i < G.S.beds.length; i++) {
      const lx = (p.x - bedX(i)) / s - BED.x0 + (BED.px - BED.cw) / 2, ly = (p.y - cfg().y) / s - BED.y0 + (BED.py - BED.ch) / 2;
      const c = Math.floor(lx / BED.px), r = Math.floor(ly / BED.py);
      if (c >= 0 && c < 4 && r >= 0 && r < 4) return { b: i, k: r * 4 + c };
    }
    return null;
  }

  /* ---- 잠긴 화단: 어둡고 반투명하게 + 자물쇠와 가격 ---- */
  st.lock = [];
  const bedPrice = i => { const m = SHOP_MAILS.find(x => x.id === 'bed' + (i + 1)); return m ? m.cost : 0; };
  function lockedBed(i) {
    const W = cfg().bedW, H = bedH();
    let c = st.lock[i];
    if (c && c.width === W + 90) return c;
    c = st.lock[i] = document.createElement('canvas'); c.width = W + 90; c.height = H + 90;
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
    x.drawImage(G.img.bed_base, 30, 20, W, H);
    x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(18,12,6,.58)'; x.fillRect(0, 0, c.width, c.height);
    x.globalCompositeOperation = 'source-over';
    const cx = 30 + W / 2, cy = 20 + H / 2 - H * .05, u = W * .085;
    x.save(); x.translate(cx, cy);
    x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = u * .5; x.shadowOffsetY = u * .15;
    x.lineWidth = u * .34; x.strokeStyle = '#e9e2d2'; x.lineCap = 'round';                       // 고리
    x.beginPath(); x.arc(0, -u * .35, u * .72, Math.PI, 0); x.lineTo(u * .72, u * .15); x.moveTo(-u * .72, -u * .35); x.lineTo(-u * .72, u * .15); x.stroke();
    x.fillStyle = '#f3c65a'; x.beginPath(); x.roundRect ? x.roundRect(-u * 1.05, -u * .1, u * 2.1, u * 1.6, u * .3) : x.rect(-u * 1.05, -u * .1, u * 2.1, u * 1.6); x.fill();   // 몸통
    x.shadowColor = 'transparent'; x.fillStyle = '#9a6a1c'; x.beginPath(); x.arc(0, u * .58, u * .2, 0, 6.283); x.fill(); x.fillRect(-u * .07, u * .6, u * .14, u * .5);
    x.restore();
    const old = ctx; ctx = x;                                     // 가격: 공용 글자·동전 그림 재사용
    try {
      const py = cy + u * 2.35;
      drawCoin(cx - u * 1.25, py, u * .5);
      text(String(bedPrice(i)), cx - u * .55, py + 2, Math.round(u * 1.05), '#fff', 'left', true);
    } finally { ctx = old; }
    return c;
  }
  const bedCanvas = i => i < G.S.beds.length ? st.cache[i] : lockedBed(i);

  /* ---- 화단 한 개를 미리 그려 두기 (그릴 때마다 꽃 48개를 새로 그리지 않게) ---- */
  function renderBed(i) {
    const W = cfg().bedW, H = bedH();
    let c = st.cache[i];
    if (!c || c.width !== W + 90) { c = st.cache[i] = document.createElement('canvas'); c.width = W + 90; c.height = H + 90; }
    const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c.width, c.height);
    x.imageSmoothingQuality = 'high';
    x.save(); x.shadowColor = 'rgba(40,30,10,.42)'; x.shadowBlur = 30; x.shadowOffsetX = 8; x.shadowOffsetY = 22;
    x.drawImage(G.img.bed_base, 30, 20, W, H); x.restore();   // 그림자는 한 번만 구워 둠
    x.translate(30, 20);
    const s = W / BED.w;
    G.S.beds[i].forEach((cell, k) => {
      if (cell.s === 'empty') return;
      const r = Math.floor(k / 4), cc = k % 4;
      const cx = (BED.x0 + cc * BED.px) * s, cy = (BED.y0 + r * BED.py) * s, cw = BED.cw * s, ch = BED.ch * s;
      x.drawImage(cell.wet ? G.img.cell_wet_overlay : G.img.cell_tilled_overlay, cx, cy, cw, ch);
      if (cell.s === 'tilled') return;
      const name = `flower_${baseId(cell.f)}_${cell.s}${cell.wet && cell.s !== 'bloom' ? '_wet' : ''}`;
      const im = G.img[name]; if (!im) return;
      const sz = cw * 1.05;
      if (SPECIAL[cell.f]) drawHalo(cx + cw / 2, cy + ch * (cell.s === 'seed' ? .5 : .55), cw * (cell.s === 'bloom' ? 1.0 : .65), SPECIAL[cell.f].hue, x);
      if (cell.s === 'seed') {           // 씨앗은 칸 한가운데
        const b = alphaBox(name);
        x.drawImage(im, cx + cw / 2 - b.cx * sz, cy + ch / 2 - b.cy * sz, sz, sz);
      } else {                           // 싹·꽃은 칸 아래에 세움
        x.drawImage(im, cx + cw / 2 - sz / 2, cy + ch - sz + sz * .06, sz, sz);
      }
    });
    st.dirtyBed[i] = false; st.ver = (st.ver || 0) + 1;
  }

  /* ---- 칸 행동 ---- */
  function actionFor(cell) {
    if (cell.s === 'empty') return 'till';
    if (cell.s === 'tilled') return 'plant';
    if ((cell.s === 'seed' || cell.s === 'bud') && !cell.wet) return 'water';
    if (cell.s === 'bloom') return 'harvest';
    return 'info';
  }
  // 쓸어서 한 번에: 도구를 사야 열림 (물주기=조리개 2칸 이상, 수확=장갑 2칸 이상, 땅 갈기·심기=둘 다)
  function canSwipe(act) {
    const c = G.S.can >= 2, g = G.S.glove >= 2;
    return act === 'water' ? c : act === 'harvest' ? g : (act === 'till' || act === 'plant') ? c && g : false;
  }
  function spread(k, lv) {   // 도구 등급에 따라 함께 처리되는 옆 칸 (1칸 / 2칸 / 4칸)
    const r = Math.floor(k / 4), c = k % 4, out = [];
    if (lv >= 2 && c < 3) out.push(k + 1);
    if (lv >= 4) { if (r < 3) { out.push(k + 4); if (c < 3) out.push(k + 5); } }
    return out;
  }
  /* ---- 손맛 효과: 흙 튀기 / 물방울 / 꽃가루 ---- */
  st.fx = [];
  const sz = () => G.mode === 'pad' ? 1.8 : 2.3;
  function fxSoil(x, y, w, h, n = 11) {
    const t0 = Date.now(), cx = x + w / 2, cy = y + h * .6;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - .5) * 2.2, v = 360 + Math.random() * 420;
      st.fx.push({ k: 'soil', x: cx + (Math.random() - .5) * w * .4, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 1700, t0, life: 480 + Math.random() * 260,
        r: (7 + Math.random() * 9) * sz(), c: ['#6b4423', '#835530', '#5a3819', '#9a6a3c'][i % 4] });
    }
  }
  function fxDrops(x, y, w, h, n = 14) {
    const t0 = Date.now();
    for (let i = 0; i < n; i++) {
      const dl = Math.random() * 220;
      st.fx.push({ k: 'drop', x: x + w * (.15 + Math.random() * .7), y: y - h * .5 - Math.random() * h * .3, vx: (Math.random() - .5) * 40, vy: 420 + Math.random() * 300, g: 900,
        t0: t0 + dl, life: 420 + Math.random() * 120, r: (6 + Math.random() * 5) * sz(), ground: y + h * (.45 + Math.random() * .4) });
    }
  }
  function fxPollen(x, y, w, h, color, n = 16) {
    const t0 = Date.now(), cx = x + w / 2, cy = y + h * .45;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, v = 100 + Math.random() * 300;
      st.fx.push({ k: i % 3 ? 'pollen' : 'twinkle', x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 140, g: -120, t0, life: 700 + Math.random() * 500,
        r: (6 + Math.random() * 9) * sz(), rot: Math.random() * 3, c: i % 2 ? '#ffe98a' : (i % 5 === 0 ? color : '#fff8d0') });
    }
  }
  function drawFx() {
    const now = Date.now(); st.fx = st.fx.filter(f => now - f.t0 < f.life);
    for (const f of st.fx) {
      const t = (now - f.t0) / 1000; if (t < 0) continue; const p = (now - f.t0) / f.life;
      let x = f.x + f.vx * t, y = f.y + f.vy * t + .5 * f.g * t * t;
      if (f.k === 'drop') {
        if (y >= f.ground) {                       // 땅에 닿으면 작게 퍼짐
          ctx.globalAlpha = Math.max(0, 1 - p) * .7; ctx.strokeStyle = '#cfeeff'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.ellipse(x, f.ground, f.r * (1 + p * 2), f.r * .4 * (1 + p * 2), 0, 0, 6.283); ctx.stroke(); continue;
        }
        ctx.globalAlpha = .92; ctx.fillStyle = '#9fdcff';
        ctx.beginPath(); ctx.ellipse(x, y, f.r * .55, f.r, 0, 0, 6.283); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(x - f.r * .15, y - f.r * .3, f.r * .22, 0, 6.283); ctx.fill();
      } else if (f.k === 'soil') {
        ctx.globalAlpha = Math.min(1, (1 - p) * 2); ctx.fillStyle = f.c;
        ctx.beginPath(); ctx.ellipse(x, y, f.r, f.r * .8, t * 6, 0, 6.283); ctx.fill();
      } else {
        const tw = .6 + .4 * Math.sin(t * 18 + f.rot * 5);
        ctx.globalAlpha = Math.min(1, (1 - p) * 1.8) * (f.k === 'twinkle' ? tw : 1); ctx.fillStyle = f.c;
        if (f.k === 'twinkle') {
          const r = f.r * 1.4 * (1 - p * .4);
          ctx.save(); ctx.translate(x, y); ctx.rotate(f.rot + t * 2); ctx.beginPath();
          for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.moveTo(0, -r); ctx.quadraticCurveTo(r * .12, -r * .12, r, 0); ctx.quadraticCurveTo(r * .12, r * .12, 0, r); }
          ctx.restore(); ctx.fill();
        } else { ctx.beginPath(); ctx.arc(x, y, f.r * .5 * (1 - p * .5), 0, 6.283); ctx.fill(); }
      }
    }
    ctx.globalAlpha = 1;
  }
  function harvestOne(b, k) {
    const cell = G.S.beds[b][k], [x, y, w] = cellRect(b, k), f = FD(cell.f);
    const n = RULES.harvestYield + (G.S.glove >= 4 && Math.random() < RULES.gloveBonusChance ? 1 : 0);      // 장갑 4칸이면 가끔 한 송이 더
      + (Math.random() < bonus('harvest') ? 1 : 0);                                                              // 소품 능력: 가끔 한 송이 더
    addBloom(cell.f, n); G.S.stats.harvest++; SFX.both('harvest');
    { const [, , , hh] = cellRect(b, k); fxPollen(x, y, w, hh || w, f.color, n > RULES.harvestYield ? 34 : 22); }
    floatText(`+${n} ${f.name}`, x + w / 2, y, n > RULES.harvestYield ? '#ffe27a' : '#fff6c8');
    G.S.beds[b][k] = { s: 'empty' };
    if (Math.random() < .25 && typeof buddyReact === 'function') buddyReact('예쁘게 피었어요!', 'po_harvest'); else if (typeof buddyCheer === 'function') buddyCheer();
  }
  function waterOne(b, k) {
    const cell = G.S.beds[b][k], [x, y, w, h] = cellRect(b, k), f = FD(cell.f);
    fxDrops(x, y, w, h); SFX.play('water', 0, 120);
    const dur = f.grow[cell.s === 'seed' ? 0 : 1] * MIN * (1 - bonus('grow'));   // 소품 능력: 자라는 시간 단축
    cell.wet = true; cell.dur = dur; cell.until = Date.now() + dur;
    floatText(fmtLeft(cell.until - Date.now()), x + w / 2, y + h / 2, '#dff4ff');
  }
  function apply(b, k, act) {
    const cell = G.S.beds[b][k], [x, y, w, h] = cellRect(b, k);
    if (actionFor(cell) !== act) return false;
    const f = FD(cell.f);
    if (act === 'till') { cell.s = 'tilled'; fxSoil(x, y, w, h, 8); SFX.play('till', 0, 90); if (Math.random() < .2 && typeof buddyReact === 'function') buddyReact('쓱쓱 땅을 갈아요', 'po_hoe'); }
    else if (act === 'plant') {
      if (seedN(G.S.cur) <= 0) return false;
      takeSeed(G.S.cur); cell.s = 'seed'; cell.f = G.S.cur; cell.wet = false; fxSoil(x, y, w, h, 12); SFX.play('plant', 0, 90);
    } else if (act === 'water') {
      waterOne(b, k);                                   // 조리개가 좋아지면 옆 칸도 함께
      for (const kk of spread(k, G.S.can)) if (actionFor(G.S.beds[b][kk]) === 'water') waterOne(b, kk);
    } else if (act === 'harvest') {
      harvestOne(b, k);                                 // 장갑이 좋아지면 옆 꽃도 함께
      for (const kk of spread(k, G.S.glove)) if (actionFor(G.S.beds[b][kk]) === 'harvest') harvestOne(b, kk);
    }
    st.dirtyBed[b] = true; G.dirty = true; save();
    return true;
  }

  /* ---- 스크롤 ---- */
  function animateTo(to) { st.anim = { from: st.scroll, to, t0: Date.now(), dur: 260 }; G.dirty = true; }
  function stepAnim() {
    const a = st.anim; if (!a) return;
    const t = Math.min(1, (Date.now() - a.t0) / a.dur), e = 1 - Math.pow(1 - t, 3);
    st.scroll = a.from + (a.to - a.from) * e; if (t >= 1) st.anim = null;
  }

  /* ---- 시간의 요정: 무작위로 나타나 하늘을 날아다님. 눌러서 받음 ---- */
  const fbox = () => G.mode === 'pad' ? { x0: 120, x1: G.L.W - 120, y0: 80, y1: G.L.bottom.y - 170 } : { x0: 100, x1: G.L.W - 100, y0: 330, y1: 1800 };
  const rnd = (a, b) => a + Math.random() * (b - a);
  function nextFairyTime() { return Date.now() + RULES.fairyEveryMin * MIN * rnd(.6, 1.4); }
  function pickWp(f) { const b = fbox(); f.tx = rnd(b.x0, b.x1); f.ty = rnd(b.y0, b.y1); f.wpAt = Date.now() + rnd(2500, 5000); }
  function spawnFairy() {
    const b = fbox(), left = Math.random() < .5, f = { x: left ? -80 : G.L.W + 80, y: rnd(b.y0, b.y1), vx: 0, vy: 0, t: Date.now(), born: Date.now(), leaving: false, trail: [], ph: rnd(0, 6) };
    pickWp(f); st.fairy = f;
  }
  function fairyStep() {
    const now = Date.now();
    if (!st.fairy) { if (now >= G.S.fairyAt && !G.popup) spawnFairy(); if (!st.fairy) return; }
    const f = st.fairy, dt = Math.min(.1, (now - f.t) / 1000); f.t = now;
    if (!f.leaving && now - f.born > RULES.fairyStaySec * 1000) { f.leaving = true; f.tx = f.x < G.L.W / 2 ? -200 : G.L.W + 200; f.ty = f.y - 100; }
    if (!f.leaving && (Math.hypot(f.tx - f.x, f.ty - f.y) < 70 || now > f.wpAt)) pickWp(f);
    const dx = f.tx - f.x, dy = f.ty - f.y, dist = Math.hypot(dx, dy) || 1, sp = f.leaving ? 420 : 230;
    f.vx += (dx / dist * sp - f.vx) * Math.min(1, dt * 1.6); f.vy += (dy / dist * sp - f.vy) * Math.min(1, dt * 1.6);
    f.x += f.vx * dt; f.y += f.vy * dt;
    if (!f.trail.length || now - f.trail[f.trail.length - 1].t > 45) f.trail.push({ x: f.x, y: f.y + Math.sin(now / 300 + f.ph) * 10, t: now });
    f.trail = f.trail.filter(q => now - q.t < 700);
    if (f.leaving && (f.x < -150 || f.x > G.L.W + 150)) { st.fairy = null; G.S.fairyAt = nextFairyTime(); save(); }
    if (f.caught && now - f.caught > 500) st.fairy = null;
  }
  function drawFairy() {
    const f = st.fairy; if (!f) return;
    const now = Date.now(), bob = Math.sin(now / 300 + f.ph) * 10, cx = f.x, cy = f.y + bob;
    for (const q of f.trail) { const a = 1 - (now - q.t) / 700; ctx.beginPath(); ctx.arc(q.x, q.y, 9 * a + 2, 0, 7); ctx.fillStyle = `rgba(255,240,170,${a * .7})`; ctx.fill(); }
    if (f.caught) { const a = 1 - (now - f.caught) / 500; ctx.globalAlpha = Math.max(0, a); }
    const g = ctx.createRadialGradient(cx, cy, 6, cx, cy, 90);
    g.addColorStop(0, 'rgba(255,255,225,.95)'); g.addColorStop(.4, 'rgba(255,236,150,.55)'); g.addColorStop(1, 'rgba(255,236,150,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 90, 0, 7); ctx.fill();
    const ph = [1, 2, 3, 2][Math.floor(now / 120) % 4];                     // 날개: 위 → 중간 → 아래 → 중간
    const fim = G.img['fa_' + (f.caught ? 4 : now - f.born < 1100 ? 5 : ph)] || G.img.it_fairy;
    if (fim) {                                               // 요정 그림: 까닥·기울기·날갯짓 떨림
      const h = G.mode === 'pad' ? 270 : 310, w = h * fim.width / fim.height, tilt = Math.max(-.3, Math.min(.3, f.vx * .0011)) + Math.sin(now / 420 + f.ph) * .05;
      const flut = 1;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt); ctx.scale(flut, 1 / flut * .995 + .005); ctx.drawImage(fim, -w / 2, -h / 2, w, h); ctx.restore();
    } else {
      const flap = Math.sin(now / 55) * .35, dir = f.vx >= 0 ? 1 : -1;
      ctx.fillStyle = 'rgba(215,240,255,.9)'; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx - dir * 6 + s * 22, cy - 18, 30, 15, s * (.7 + flap), 0, 7); ctx.fill(); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(cx, cy, 15, 0, 7); ctx.fillStyle = '#ffe9c4'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#f0b860'; ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // 노란 새(소품 n5): 게시판 위에 앉아, 누르면 가진 꽃 수를 알려 줌
  const birdRect = () => { const b = G.L.board, sz = G.mode === 'pad' ? 130 : 170; return [b[0] - sz * .35, b[1] - sz * .55, sz, sz]; };
  function openBird() {
    openPopup({ title: '노란 새가 세어 봤어요', draw(r) {
      const [x, y, w] = r, pd = G.mode === 'pad', fs = pd ? 34 : 40, have = FLOWERS.filter(f => (G.S.flowers[f.id] || 0) > 0);
      if (!have.length) { wrap('아직 가진 꽃이 없어요. 수확하면 여기서 세어 줄게요.', x, y + 40, w, fs, '#6e4b28'); return; }
      const cols = 2, cw = w / cols, lh = fs + 26;
      have.forEach((f, i) => text(`${f.name}  ${G.S.flowers[f.id]}송이`, x + (i % cols) * cw + 10, y + 40 + Math.floor(i / cols) * lh, fs, '#6e4b28', 'left'));
    } });
  }
  const scr = G.screens.garden = {
    invalidate() { st.lock = []; st.dirtyBed = st.dirtyBed.map(() => true); for (let i = 0; i < G.S.beds.length; i++) st.dirtyBed[i] = true; G.dirty = true; },
    onMode() { st.scroll = 0; st.page = 0; st.anim = null; st.cache = []; st.layer = null; st.fairy = null; this.invalidate(); },
    busy: () => !!st.anim || st.fx.length > 0 || !!st.fairy || (Date.now() >= G.S.fairyAt && !G.popup),
    draw() {
      stepAnim();
      const W = cfg().bedW, H = bedH();
      for (let i = 0; i < G.S.beds.length; i++) {
        const x = bedX(i); if (x > G.L.W || x + W < 0) continue;
        if (st.dirtyBed[i] !== false || !st.cache[i]) renderBed(i);
      }
      const stage = gardenStage();
      cachedLayer('garden', `${st.ver}|${st.scroll}|${G.img[`bg_garden_${G.mode}${stage ? '_' + stage : ''}`] ? 1 : 0}|${decorKey()}|${stage}`, () => {   // 배경 + 화단: 바뀔 때만 다시 그림
        const bg = G.img[`bg_garden_${G.mode}${stage ? '_' + stage : ''}`] || G.img[`bg_garden_${G.mode}`];
        if (bg) ctx.drawImage(bg, 0, 0, G.L.W, G.L.H); else { ctx.fillStyle = '#8cc063'; ctx.fillRect(0, 0, G.L.W, G.L.H); }
        drawDecor('garden');
        if (G.mode === 'pad') {          // 왼쪽으로 밀린 화단은 꽃 장식과 안 겹치게 잘리고, 잘린 면은 흐려짐
          const gh = H + 90;
          if (!st.layer || st.layer.height !== gh) { st.layer = document.createElement('canvas'); st.layer.width = G.L.W; st.layer.height = gh; }
          const lc = st.layer.getContext('2d'); lc.globalCompositeOperation = 'source-over'; lc.clearRect(0, 0, G.L.W, gh);
          for (let i = 0; i < total(); i++) { const x = bedX(i); if (x > G.L.W || x + W < 0) continue; lc.drawImage(bedCanvas(i), x - 30, 0); }
          lc.globalCompositeOperation = 'destination-in';
          const gr = lc.createLinearGradient(cfg().fadeFrom, 0, cfg().fadeTo, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
          lc.fillStyle = gr; lc.fillRect(0, 0, G.L.W, gh);
          ctx.drawImage(st.layer, 0, cfg().y - 20);
        } else {
          for (let i = 0; i < total(); i++) { const x = bedX(i); if (x > G.L.W || x + W < 0) continue; ctx.drawImage(bedCanvas(i), x - 30, cfg().y - 20); }
        }
      });
      // 물 준 칸: 남은 시간 작은 표시
      for (let i = 0; i < G.S.beds.length; i++) G.S.beds[i].forEach((c, k) => {
        if (!c.wet || !c.until) return;
        const [x, y, w] = cellRect(i, k); if (x > G.L.W || x + w < 0 || (G.mode === 'pad' && x < cfg().fadeTo)) return;
        const left = c.until - G.now;
        const p = 1 - left / (c.dur || FD(c.f).grow[c.s === 'seed' ? 0 : 1] * MIN);
        ctx.beginPath(); ctx.arc(x + w - 14, y + 16, 13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, p)));
        ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(210,240,255,.95)'; ctx.stroke();
      });
      if (G.mode === 'phone') {                  // 쪽 표시 점
        const n = total(), cy = cfg().y + H + 45, cur = Math.round(st.scroll / G.L.W);
        for (let k = 0; k < n; k++) {
          ctx.beginPath(); ctx.arc(G.L.W / 2 + (k - (n - 1) / 2) * 60, cy, k === cur ? 16 : 12, 0, 7);
          ctx.fillStyle = k === cur ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.5)'; ctx.fill();
        }
      }
      // 그림 속 게시판·우체통: 눌러도 열림. 할 일이 있으면 빨간 표시
      for (const [r, n] of [[G.L.board, G.S.orders.filter(canDeliver).length], [G.L.mailbox, G.S.mails.filter(m => !m.read).length]]) {
        if (!n) continue;
        const bx = r[0] + r[2] - 30, by = r[1] + 40;
        ctx.beginPath(); ctx.arc(bx, by, 32, 0, 7); ctx.fillStyle = '#e24b3b'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.stroke();
        text(String(n), bx, by + 1, 36, '#fff', 'center');
      }
      if (G.S.owned.p_n5) {                              // 노란 새: 나무 게시판에 지금 가진 꽃 수를 적어 둠
        const b = G.L.board, ix = b[0] + b[2] * .13, iy = b[1] + b[3] * .3, iw = b[2] * .72, ih = b[3] * .62, fl = FLOWERS.slice(0, openKinds());
        const cols = 4, rows = Math.ceil(fl.length / cols), cw = iw / cols, ch = ih / 3, fs = Math.min(ch * .55, cw * .3), oy = (3 - rows) * ch / 2;   // 12종까지 4×3 칸, 줄 간격은 고정
        const need = orderNeed();
        fl.forEach((f, i) => { const cx = ix + (i % cols) * cw, cy = iy + oy + Math.floor(i / cols) * ch + ch / 2, n = G.S.flowers[f.id] || 0, nd = need[f.id] || 0;
          imgFit(G.img[`flower_${f.id}_bloom`], cx + cw * .24, cy, Math.min(ch * .9, cw * .45));
          // 의뢰에 필요한 꽃은 '가진 수/필요한 수' (모자라면 분홍, 넉넉하면 연두), 필요 없는 꽃은 가진 수만 흐리게
          if (nd) text(`${n}/${nd}`, cx + cw * .7, cy + 2, fs * .9, n >= nd ? '#c8f5a0' : '#ffb3b3', 'center', true);
          else text(String(n), cx + cw * .7, cy + 2, fs, 'rgba(255,245,220,.6)', 'center', true); });
      }
      if (G.S.owned.p_n5 && G.img.prop_n5) { const r = birdRect(); ctx.drawImage(G.img.prop_n5, r[0], r[1] + Math.sin(Date.now() / 600) * 3, r[2], r[3]); }   // 게시판 위 노란 새
      drawTopInfo();
      drawFx();
      fairyStep(); drawFairy();
    },
    fairyHit: p => !!st.fairy && !st.fairy.caught && Math.hypot(p.x - st.fairy.x, p.y - st.fairy.y) < 130,
    fairyTap() {
      const f = st.fairy; if (!f || f.caught) return;
      f.caught = Date.now(); f.leaving = false; G.S.fairyAt = nextFairyTime();
      let n = 0;
      for (const bed of G.S.beds) for (const c of bed) if (c.wet && c.until) { c.until -= RULES.fairySkipMin * MIN; n++; }
      floatText('반짝!', f.x, f.y - 40, '#fff6b0');
      const gem = Math.random() < RULES.fairyGemChance; if (gem) G.S.gems++;
      toast((n ? `시간의 요정이 ${RULES.fairySkipMin}분을 당겨 줬어요` : '시간의 요정이 인사하고 갔어요') + (gem ? ' 다이아 +1' : ''));
      save(); tick(); G.dirty = true;
    },
    down(p) {
      if (st.anim) { st.anim = null; }
      const h = hitCell(p);
      if (h && !canSwipe(actionFor(G.S.beds[h.b][h.k]))) {                       // 처음엔 한 칸씩 누르기. 끌어도 화단은 안 움직임(오터치 방지)
        st.drag = { kind: 'cellTap', act: actionFor(G.S.beds[h.b][h.k]), first: h, sx: p.x, sScroll: st.scroll };
      } else if (h) {
        const act = actionFor(G.S.beds[h.b][h.k]);
        st.drag = { kind: 'cell', act, first: h, done: new Set(), sx: p.x, sScroll: st.scroll };
        if (act !== 'info' && !(act === 'plant' && seedN(G.S.cur) <= 0)) {
          if (apply(h.b, h.k, act)) st.drag.done.add(h.b * 16 + h.k);
        }
      } else if (p.y < G.L.bottom.y) st.drag = { kind: 'scroll', sx: p.x, sScroll: st.scroll, p0: p };   // 화단 밖(위·아래·테두리)을 끌면 화단이 움직임
      else st.drag = null;
    },
    move(p) {
      const d = st.drag; if (!d) return;
      if (d.kind === 'cellTap') return;
      if (d.kind === 'scroll') {
        let s = d.sScroll - (p.x - d.sx), m = maxScroll();
        if (s < 0) s *= .35; if (s > m) s = m + (s - m) * .35;
        st.scroll = s; G.dirty = true; return;
      }
      if (d.act === 'info' || d.act === 'plant' && seedN(G.S.cur) <= 0) return;
      const h = hitCell(p); if (!h) return;
      const key = h.b * 16 + h.k; if (d.done.has(key)) return;
      if (apply(h.b, h.k, d.act)) d.done.add(key);
      if (d.act === 'plant' && seedN(G.S.cur) <= 0) toast(`${FD(G.S.cur).name} 씨앗을 다 썼어요`);
    },
    up(p, tap) {
      const d = st.drag; st.drag = null; if (!d) return;
      if (d.kind === 'scroll' && tap) {            // 끌지 않고 톡 누른 게시판·우체통
        if (G.S.owned.p_n5 && inRect(p, birdRect())) return openOrders();
        if (inRect(p, G.L.board)) { animateTo(Math.max(0, Math.min(maxScroll(), st.scroll))); return openOrders(); }
        if (inRect(p, G.L.mailbox)) { animateTo(Math.max(0, Math.min(maxScroll(), st.scroll))); return openMail(); }
        for (let i = G.S.beds.length; i < total(); i++) {       // 잠긴 화단을 톡
          if (!inRect(p, [bedX(i), cfg().y, cfg().bedW, bedH()])) continue;
          const ml = G.S.mails.find(m => m.id === 'bed' + (i + 1));
          if (ml) return openMail();
          return toast(i === G.S.beds.length ? `${i + 1}번째 화단 · ${bedPrice(i)}골드 · 돈이 모이면 편지가 와요` : '앞의 화단을 먼저 열어야 해요');
        }
      }
      if (d.kind === 'scroll') {
        const m = maxScroll();
        if (G.mode === 'phone') {
          let page = Math.round(d.sScroll / G.L.W); const dx = p.x - d.sx;
          if (dx < -120) page++; else if (dx > 120) page--;
          page = Math.max(0, Math.min(total() - 1, page)); animateTo(page * G.L.W);
        } else animateTo(Math.max(0, Math.min(m, st.scroll)));
        return;
      }
      if (!tap) return;
      if (d.kind === 'cellTap') {
        const ok = d.act !== 'info' && !(d.act === 'plant' && seedN(G.S.cur) <= 0) && apply(d.first.b, d.first.k, d.act);
        if (ok) return;
        d.done = new Set();
      }
      const cell = G.S.beds[d.first.b][d.first.k];
      if (d.act === 'info') {
        const f = FD(cell.f);
        toast(`${f.name} ${cell.s === 'seed' ? '씨앗' : '싹'} · ${fmtLeft(cell.until - Date.now())} 남음`);
      } else if (d.act === 'plant' && d.done.size === 0) {
        toast(`${FD(G.S.cur).name} 씨앗이 없어요`); openSeedPicker();
      }
    },
    buttonOpt(id) {
      if (id === 'seed') {
        const f = FD(G.S.cur);
        return { label: `${f.name} ${seedN(f.id)}` };
      }
      if (id === 'orders') return { badge: G.S.orders.filter(canDeliver).length || 0 };
      if (id === 'shop') return {};
      return {};
    },
    onButton(id) {
      if (id === 'seed') openSeedPicker();
      if (id === 'inventory') openInventory();
    },
  };
})();

/* ---------- 씨앗 고르기 ---------- */
function openSeedPicker() {
  openPopup({
    title: '지금 심을 씨앗',
    draw(r) {
      const pad = G.mode === 'pad', cols = pad ? 3 : 2, gap = 24, ch = pad ? 288 : 504;
      const items = FLOWERS.slice(0, openKinds()).concat(SPECIALS.filter(s => (G.S.sseeds || {})[s.id] > 0).map(s => ({ id: s.id, name: s.name })))
        .concat(FLOWERS.slice(openKinds()).map(f => ({ id: f.id, name: f.name, locked: true })));   // 아직 안 열린 꽃은 흐리게 보여 주고, 누르면 여는 법을 알려 줌
      const rows = Math.ceil(items.length / cols);
      this.btns = [];
      scrollBegin(this, r, rows * ch + (rows - 1) * gap);
      const cw = (r[2] - gap * (cols - 1)) / cols;
      items.forEach((f, i) => {
        const rc = [r[0] + (i % cols) * (cw + gap), r[1] + Math.floor(i / cols) * (ch + gap), cw, ch];
        if (f.locked) {
          const need = OPEN_BY_BEDS.findIndex(k => FLOWERS.findIndex(x => x.id === f.id) < k) + 1;
          card(rc, false); ctx.globalAlpha = .35;
          imgFit(G.img[`flower_${f.id}_bloom`], rc[0] + rc[2] / 2, rc[1] + rc[3] * .38, Math.min(rc[2], rc[3]) * .5); ctx.globalAlpha = 1;
          text(f.name, rc[0] + rc[2] / 2, rc[1] + rc[3] * .75, 44, '#a8977f', 'center');
          text(`🔒 화단 ${need}개`, rc[0] + rc[2] / 2, rc[1] + rc[3] * .9, 34, '#a8977f', 'center', false, 500);
          const lh = scrollHit(this, r, rc);
          if (lh) this.btns.push({ rect: lh, fn: () => toast(`${f.name}은(는) 화단이 ${need}개가 되면 열려요. 상점 「정원」 칸에서 화단을 살 수 있어요.`, 3800) });
          return;
        }
        const n = seedN(f.id), sel = G.S.cur === f.id;
        card(rc, sel);
        const s = Math.min(rc[2], rc[3]) * .5;
        if (SPECIAL[f.id]) drawHalo(rc[0] + rc[2] / 2, rc[1] + rc[3] * .38, s * .8, SPECIAL[f.id].hue);
        imgFit(G.img[`flower_${baseId(f.id)}_bloom`], rc[0] + rc[2] / 2, rc[1] + rc[3] * .38, s);
        text(`${f.name}`, rc[0] + rc[2] / 2, rc[1] + rc[3] * .75, 44, '#6e4b28', 'center');
        text(`씨앗 ${n}개`, rc[0] + rc[2] / 2, rc[1] + rc[3] * .9, 34, n ? '#8a6a44' : '#b9a58b', 'center', false, 500);
        const hit = scrollHit(this, r, rc);
        if (hit) this.btns.push({ rect: hit, fn: () => { G.S.cur = f.id; save(); G.popup = null; if (!n) toast(`${f.name} 씨앗은 온실에서 만들 수 있어요`); } });
      });
      scrollEnd(this, r);
    },
  });
}

/* ---------- 인벤토리 ---------- */
// 한 줄에 6칸(폰은 3칸), 종류가 늘면 아래로 밀어서 봄
function openInventory() {
  let tab = 0;
  openPopup({
    title: '인벤토리',
    draw(full) {
      this.btns = [];
      const pad = G.mode === 'pad', tw = pad ? 260 : 300, th = 84;
      ['꽃 · 꽃씨', '아이템'].forEach((nm, i) => {
        const rt = [full[0] + i * (tw + 16), full[1], tw, th];
        button(rt, nm, { active: tab === i, size: 40 }); this.btns.push({ rect: rt, fn: () => { tab = i; this.scroll = 0; } });
      });
      const r = [full[0], full[1] + th + 24, full[2], full[3] - th - 24];
      if (tab === 0) invFlowers(this, r); else invItems(this, r);
    },
  });
}
function invFlowers(p, r) {
  const [x, y, w] = r, pad = G.mode === 'pad', cols = pad ? 6 : 3, gap = 18, ch = pad ? 210 : 300;
  const ids = FLOWERS.map(f => f.id).concat(SPECIALS.filter(s => G.S.found && G.S.found[s.id]).map(s => s.id));
  const rows = Math.ceil(ids.length / cols), gh = rows * ch + (rows - 1) * gap, yS = 70, yF = yS + gh + 100;
  const cw = (w - gap * (cols - 1)) / cols;
  scrollBegin(p, r, yF + gh);
  text('씨앗', x, y + 30, 40, '#6e4b28'); text('꽃', x, y + yF - 40, 40, '#6e4b28');
  for (const [kind, oy, key] of [['seed', yS, 'seeds'], ['bloom', yF, 'flowers']]) {
    ids.forEach((id, i) => {
      const f = FD(id), sp = SPECIAL[id], n = sp ? ((kind === 'seed' ? G.S.sseeds : G.S.sflowers) || {})[id] || 0 : G.S[key][id];
      const rc = [x + (i % cols) * (cw + gap), y + oy + Math.floor(i / cols) * (ch + gap), cw, ch]; card(rc, false);
      const s = Math.min(rc[2], rc[3]) * .62;
      if (sp) drawHalo(rc[0] + rc[2] / 2, rc[1] + rc[3] * .42, s * .8, sp.hue);
      imgFit(G.img[`flower_${baseId(id)}_${kind}`], rc[0] + rc[2] / 2, rc[1] + rc[3] * .42, s);
      text(`${f.name} ${n}`, rc[0] + rc[2] / 2, rc[1] + rc[3] * .86, 34, '#6e4b28', 'center');
    });
  }
  scrollEnd(p, r);
}
function invItems(p, r) {
  const [x, y, w] = r, pad = G.mode === 'pad', cols = pad ? 4 : 2, gap = 18, ch = pad ? 370 : 420;
  const cw = (w - gap * (cols - 1)) / cols, rows = Math.ceil(HG.length / cols);
  scrollBegin(p, r, rows * (ch + gap));
  HG.forEach((h, i) => {
    const n = itemCount(h.id), rc = [x + (i % cols) * (cw + gap), y + Math.floor(i / cols) * (ch + gap), cw, ch]; card(rc, n > 0);
    const im = G.img['hg_' + h.min]; if (im) { const k = Math.min(cw * .5 / im.width, ch * .38 / im.height); ctx.drawImage(im, rc[0] + cw / 2 - im.width * k / 2, rc[1] + 16, im.width * k, im.height * k); }
    text(h.name, rc[0] + cw / 2, rc[1] + ch * .52, 30, '#6e4b28', 'center');
    text(`${n}개`, rc[0] + cw / 2, rc[1] + ch * .64, 32, '#b07a12', 'center');
    const br = [rc[0] + 20, rc[1] + ch - 96, cw - 40, 76]; button(br, '사용하기', { disabled: n < 1, size: 34 });
    const hit = scrollHit(p, r, br); if (hit) p.btns.push({ rect: hit, disabled: n < 1, fn: () => useHourglass(h) });
  });
  scrollEnd(p, r);
}

/* 세로 화면 아래쪽 빈 잔디에 꽃을 수북하게 (고정 배치, 한 번만 계산) */
function lawnFlowers() {
  const W = G.L.W, H = G.L.H, ids = FLOWERS.map(f => f.id);
  let r = 7; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  const items = [];
  for (let i = 0; i < 60; i++) items.push({ x: rnd() * W, y: H * .94 + rnd() * H * .07, s: 90 + rnd() * 80, id: ids[Math.floor(rnd() * ids.length)], f: rnd() < .5 });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) {
    const im = G.img[`flower_${it.id}_bloom`]; if (!im) continue;
    const w = it.s, h = w * im.height / im.width;
    ctx.save(); if (it.f) { ctx.translate(it.x * 2, 0); ctx.scale(-1, 1); }
    ctx.drawImage(im, it.x - w / 2, it.y - h, w, h); ctx.restore();
  }
}

/* 정원 배경도 온실처럼 시간대별: 6시 낮 · 17시 노을 · 19시 30분 밤 */
function gardenStage() {
  const d = G.fakeHour != null ? null : new Date(G.now || Date.now()), t = G.fakeHour != null ? G.fakeHour : d.getHours() + d.getMinutes() / 60;
  return t < 6 ? 'night' : t < 17 ? '' : t < 19.5 ? 'dusk' : 'night';
}
