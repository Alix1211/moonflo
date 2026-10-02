// 문선농장 — 온실: 7×7 꽃 유리칩 맞추기 → 씨앗포인트, 특수블록 → 연구포인트
'use strict';
(() => {
  const N = 7;
  /* 퍼즐판 꽃 종류는 늘 matchKinds(6)종. 밭을 사서 열린 꽃(7번째 꽃부터)은 항상 판에 나오고,
     그 수만큼 처음 6종 중에서 무작위로 빠짐 → 난이도는 그대로. 게시판 의뢰가 요구하는 처음 꽃은 우선 남김 */
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const range = (a, b) => Array.from({ length: Math.max(0, b - a) }, (_, i) => a + i);
  const neededIdx = () => { const s = new Set(); for (const o of (G.S.orders || [])) for (const id in o.need) { const i = FLOWERS.findIndex(f => f.id === id); if (i >= 0 && i < openKinds()) s.add(i); } return [...s]; };
  function pickKinds() {                              // 의뢰에 필요한 꽃 먼저, 나머지는 열린 꽃 전체에서 무작위
    const base = RULES.matchKinds, open = openKinds(), nd = shuffle(neededIdx()).slice(0, base);
    const rest = shuffle(range(0, open).filter(i => !nd.includes(i)));
    return nd.concat(rest).slice(0, Math.min(base, open)).sort((x, y) => x - y);
  }
  const kinds = () => {
    const S = G.S, open = openKinds();
    if (!S.kinds || S.kinds.length !== Math.min(RULES.matchKinds, open) || S.kinds.some(i => i >= open) || S.kindsOpen !== open) newKinds();
    return S.kinds;
  };
  const rk = () => kinds()[Math.floor(Math.random() * kinds().length)];
  const newKinds = () => { G.S.kinds = pickKinds(); G.S.kindsOpen = openKinds(); };       // 새로 섞을 때: 열린 새 꽃은 꼭 들어가고, 처음 꽃은 무작위
  const st = { g: null, sel: null, press: null, anim: null, hint: null, bg: null, bgMode: '' }; G._gh = { st, trySwap, kinds, newKinds, tile: (t, sp) => tile(t, sp) };
  let uid = 1;
  // 테스트용: 새로 생기는 칩 중 이 비율만큼 특수탄으로 나옴 (테스트 끝나면 0으로)
  const TEST_SP = 0, SPS = ['row', 'col', 'wideRow', 'wideCol', 'bomb'];
  const rndSp = () => (TEST_SP && Math.random() < TEST_SP) || Math.random() < .03 * (1 + bonus('sp')) ? SPS[Math.floor(Math.random() * SPS.length)] : null;   // 특수칩 기본 출현 3% (소품 능력만큼 더: 최대 3.9%)
  const tile = (t, sp = null) => ({ t, sp, id: uid++, dy: 0, ox: 0, oy: 0, sc: 1 });

  const board = () => G.L.gh.board;
  const cellSize = () => G.mode === 'pad' ? 118 : 148;
  const margin = () => (board()[2] - N * cellSize()) / 2;
  const cellXY = (r, c) => [board()[0] + margin() + c * cellSize(), board()[1] + margin() + r * cellSize()];
  function hitCell(p) {
    const [bx, by] = board(), m = margin(), s = cellSize();
    const c = Math.floor((p.x - bx - m) / s), r = Math.floor((p.y - by - m) / s);
    return r >= 0 && r < N && c >= 0 && c < N ? [r, c] : null;
  }

  /* ---- 판 만들기 ---- */
  function fresh() {
    const g = [];
    for (let r = 0; r < N; r++) { g.push([]); for (let c = 0; c < N; c++) {
      let t; do { t = rk(); }
      while ((c >= 2 && g[r][c - 1].t === t && g[r][c - 2].t === t) || (r >= 2 && g[r - 1][c].t === t && g[r - 2][c].t === t));
      g[r].push(tile(t, rndSp()));
    } }
    return g;
  }
  function loadBoard() {
    const b = G.S.board;
    if (b && b.length === N * N) {
      st.g = []; for (let r = 0; r < N; r++) st.g.push(b.slice(r * N, r * N + N).map(v => tile(v[0], v[1] || null)));
      if (findRuns().length || (TEST_SP && st.g.flat().filter(x => x.sp).length < 5)) st.g = fresh();
    } else st.g = fresh();
    if (G.S.kindsDay !== todayKey()) { G.S.kindsDay = todayKey(); if (G.S.kindsDay0) { newKinds(); st.g = fresh(); } G.S.kindsDay0 = 1; }
    if (!hasMove()) st.g = fresh();
    storeBoard();
  }
  function storeBoard() { G.S.board = st.g.flat().map(x => x.sp ? [x.t, x.sp] : [x.t]); save(); }

  /* ---- 맞춤 찾기 ---- */
  function findRuns(g = st.g) {
    const runs = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N;) {
      let e = c + 1; while (e < N && g[r][e].t === g[r][c].t) e++;
      if (e - c >= 3) runs.push({ dir: 'h', cells: Array.from({ length: e - c }, (_, i) => [r, c + i]) }); c = e;
    }
    for (let c = 0; c < N; c++) for (let r = 0; r < N;) {
      let e = r + 1; while (e < N && g[e][c].t === g[r][c].t) e++;
      if (e - r >= 3) runs.push({ dir: 'v', cells: Array.from({ length: e - r }, (_, i) => [r + i, c]) }); r = e;
    }
    return runs;
  }
  function swapIn(g, a, b) { const x = g[a[0]][a[1]]; g[a[0]][a[1]] = g[b[0]][b[1]]; g[b[0]][b[1]] = x; }
  function findMove() {
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) for (const [dr, dc] of [[0, 1], [1, 0]]) {
      const a = [r, c], b = [r + dr, c + dc]; if (b[0] >= N || b[1] >= N) continue;
      if (st.g[r][c].sp || st.g[b[0]][b[1]].sp) return [a, b];
      swapIn(st.g, a, b); const ok = findRuns().length > 0; swapIn(st.g, a, b);
      if (ok) return [a, b];
    }
    return null;
  }
  const hasMove = () => !!findMove();

  /* ---- 애니메이션 ---- */
  function play(kind, dur, fn) { st.anim = { kind, t0: Date.now(), dur, fn }; G.dirty = true; }
  function stepAnim() {
    const a = st.anim; if (!a) return;
    const t = Math.min(1, (Date.now() - a.t0) / a.dur);
    a.p = t;
    if (t >= 1) { st.anim = null; a.fn && a.fn(); }
  }

  /* ---- 터지는 효과 (가벼운 알갱이·빛줄기·물결) ---- */
  st.fx = [];
  const cc = (r, c) => { const [x, y] = cellXY(r, c), h = cellSize() / 2; return [x + h, y + h]; };
  function burst(r, c, color, n, power = 1) {
    const [x, y] = cc(r, c), t0 = Date.now();
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, v = (150 + Math.random() * 380) * power;
      st.fx.push({ k: i % 3 === 0 ? 'star' : 'petal', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, t0, life: 520 + Math.random() * 380,
        s: (10 + Math.random() * 14) * (G.mode === 'pad' ? 1 : 1.2), rot: Math.random() * 6, vr: (Math.random() - .5) * 12, c: i % 4 === 0 ? '#fff8d0' : color });
    }
    st.fx.push({ k: 'ring', x, y, r0: cellSize() * .2, r1: cellSize() * .75 * power, t0, life: 330, c: color });
  }
  function beam(r, c, dir, thick, color) {
    const [bx, by, bw, bh] = board(), [x, y] = cc(r, c), t0 = Date.now();
    st.fx.push(dir === 'h' ? { k: 'beam', x: bx, y: y - thick / 2, w: bw, h: thick, t0, life: 420, c: color } : { k: 'beam', x: x - thick / 2, y: by, w: thick, h: bh, t0, life: 420, c: color });
  }
  function shock(r, c, rad, color) {
    const [x, y] = cc(r, c); st.fx.push({ k: 'ring', x, y, r0: cellSize() * .3, r1: rad, t0: Date.now(), life: 480, c: color, big: true });
  }
  function drawFx() {
    const now = Date.now(); st.fx = st.fx.filter(f => now - f.t0 < f.life);
    for (const f of st.fx) {
      const p = (now - f.t0) / f.life, t = (now - f.t0) / 1000;
      if (f.k === 'beam') {
        const a = (1 - p) * (1 - p), grow = .5 + .5 * Math.min(1, p * 4);
        const horiz = f.w > f.h, cx = f.x + f.w / 2, cy = f.y + f.h / 2, w = horiz ? f.w : f.w * grow, h = horiz ? f.h * grow : f.h;
        ctx.globalAlpha = a * .75; ctx.fillStyle = f.c; ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
        ctx.globalAlpha = a; ctx.fillStyle = '#fff'; const k = .35;
        ctx.fillRect(cx - w / 2 * (horiz ? 1 : k), cy - h / 2 * (horiz ? k : 1), w * (horiz ? 1 : k), h * (horiz ? k : 1));
      } else if (f.k === 'ring') {
        const e = 1 - (1 - p) * (1 - p), r = f.r0 + (f.r1 - f.r0) * e;
        ctx.globalAlpha = (1 - p) * .9; ctx.lineWidth = (f.big ? 26 : 12) * (1 - p) + 2; ctx.strokeStyle = f.big ? '#fff3b0' : f.c;
        ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, 6.283); ctx.stroke();
        if (f.big) { ctx.globalAlpha = (1 - p) * .35; ctx.fillStyle = f.c; ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, 6.283); ctx.fill(); }
      } else {
        const x = f.x + f.vx * t, y = f.y + f.vy * t + 900 * t * t, sc = 1 - p * .6;
        ctx.globalAlpha = Math.min(1, (1 - p) * 1.6); ctx.fillStyle = f.c;
        if (f.k === 'star') star(x, y, f.s * sc * 1.2, f.rot + f.vr * t);
        else { ctx.save(); ctx.translate(x, y); ctx.rotate(f.rot + f.vr * t); ctx.beginPath(); ctx.ellipse(0, 0, f.s * sc, f.s * sc * .5, 0, 0, 6.283); ctx.fill(); ctx.restore(); }
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ---- 특수칩 겹침 (문선팡 규칙) ----
     줄+줄: 같은 방향은 나란한 2줄, 다른 방향은 십자 (터지는 순서상 자연히 그렇게 됨)
     줄+폭탄: 줄 방향 3줄 두께(굵은 리본이면 5줄) + 폭탄 3×3
     폭탄+폭탄: 7×7 */
  function comboCells(sa, sb, at, out) {
    const [r, c] = at, isLine = s => s === 'row' || s === 'col' || s === 'wideRow' || s === 'wideCol';
    const put = (i, j) => { if (i >= 0 && i < N && j >= 0 && j < N) out.add(i + ',' + j); };
    if (sa === sb && (sa === 'row' || sa === 'col')) {      // 같은 방향 줄끼리: 나란한 2줄
      if (sa === 'row') { const s0 = Math.min(Math.max(r, 0), N - 2); for (const rr of [s0, s0 + 1]) for (let i = 0; i < N; i++) put(rr, i); }
      else { const s0 = Math.min(Math.max(c, 0), N - 2); for (const cc of [s0, s0 + 1]) for (let i = 0; i < N; i++) put(i, cc); }
      return;
    }
    if (sa === 'bomb' && sb === 'bomb') { for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) put(r + i, c + j); return; }
    const line = isLine(sa) ? sa : isLine(sb) ? sb : null, bomb = sa === 'bomb' || sb === 'bomb';
    if (line && bomb) {
      const half = line.startsWith('wide') ? 2 : 1;
      for (let k = -half; k <= half; k++) for (let i = 0; i < N; i++) { if (/row/i.test(line)) put(r + k, i); else put(i, c + k); }
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) put(r + i, c + j);
    }
  }

  /* ---- 바꾸기 ---- */
  function trySwap(a, b) {
    st.sel = null; st.hint = null; st.combo = 0; SFX.play('swap');
    const A = st.g[a[0]][a[1]], B = st.g[b[0]][b[1]];
    const dx = b[1] - a[1], dy = b[0] - a[0];
    A.ox = 0; A.oy = 0; B.ox = 0; B.oy = 0;
    st.anim = { kind: 'swap', t0: Date.now(), dur: 150, a, b, dx, dy, fn: () => {
      swapIn(st.g, a, b); A.ox = A.oy = B.ox = B.oy = 0;
      if (A.sp || B.sp) {                               // 특수블록은 바꾸기만 해도 터짐
        const start = new Set(); if (A.sp) start.add(b.join()); if (B.sp) start.add(a.join());
        start.add(a.join()); start.add(b.join());
        if (A.sp && B.sp) comboCells(A.sp, B.sp, b, start);   // 특수칩끼리 겹침 규칙
        if (A.sp && B.sp && typeof buddyReact === 'function') buddyReact('와! 특별한 칩끼리 터졌어요!', 'surprise');
        clearCells(start, []);
        return;
      }
      if (!resolve([a, b])) {                            // 안 맞으면 되돌림
        SFX.both('nope'); st.anim = { kind: 'swap', t0: Date.now(), dur: 150, a: b, b: a, dx: -dx, dy: -dy, back: true, fn: () => { swapIn(st.g, a, b); } };
      }
    } };
    G.dirty = true;
  }

  function resolve(swapped) {
    const runs = findRuns(); if (!runs.length) return false;
    const clear = new Set(), made = [];
    const count = {};
    for (const run of runs) for (const [r, c] of run.cells) { const k = r + ',' + c; count[k] = (count[k] || 0) + 1; clear.add(k); }
    for (const run of runs) {
      const len = run.cells.length, cross = run.cells.find(([r, c]) => count[r + ',' + c] > 1);
      let sp = null;
      if (cross) sp = 'bomb';                                        // ㄱ·ㅜ자 → 폭탄
      else if (len >= 5) sp = run.dir === 'h' ? 'wideRow' : 'wideCol'; // 5개 → 두꺼운 리본(3줄)
      else if (len === 4) sp = run.dir === 'h' ? 'row' : 'col';        // 4개 → 리본(1줄)
      if (!sp) continue;
      let at = cross || (swapped && run.cells.find(([r, c]) => swapped.some(s => s[0] === r && s[1] === c))) || run.cells[Math.floor(len / 2)];
      const k = at.join();
      if (made.some(m => m.k === k)) continue;
      made.push({ k, at, sp, t: st.g[at[0]][at[1]].t });
    }
    clearCells(clear, made);
    return true;
  }

  function clearCells(clear, made) {
    // 특수블록 연쇄
    const queue = [...clear], fired = new Set();
    let research = 0;
    while (queue.length) {
      const k = queue.shift(), [r, c] = k.split(',').map(Number), x = st.g[r][c];
      if (!x || !x.sp || fired.has(k)) continue;
      if (made.some(m => m.k === k) && !x.sp) continue;
      fired.add(k); research += RULES.specialResearch;
      const col = FLOWERS[x.t].color;
      if (x.sp === 'row') beam(r, c, 'h', cellSize() * .9, col);
      if (x.sp === 'col') beam(r, c, 'v', cellSize() * .9, col);
      if (x.sp === 'wideRow') beam(r, c, 'h', cellSize() * 2.8, col);
      if (x.sp === 'wideCol') beam(r, c, 'v', cellSize() * 2.8, col);
      if (x.sp === 'bomb') shock(r, c, cellSize() * 2.2, col);
      const add = [];
      if (x.sp === 'row') for (let i = 0; i < N; i++) add.push([r, i]);
      if (x.sp === 'col') for (let i = 0; i < N; i++) add.push([i, c]);
      if (x.sp === 'wideRow') for (let j = -1; j <= 1; j++) if (r + j >= 0 && r + j < N) for (let i = 0; i < N; i++) add.push([r + j, i]);
      if (x.sp === 'wideCol') for (let j = -1; j <= 1; j++) if (c + j >= 0 && c + j < N) for (let i = 0; i < N; i++) add.push([i, c + j]);
      if (x.sp === 'bomb') for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) if (r + i >= 0 && r + i < N && c + j >= 0 && c + j < N) add.push([r + i, c + j]);
      for (const a of add) { const kk = a.join(); if (!clear.has(kk)) { clear.add(kk); queue.push(kk); } else if (st.g[a[0]][a[1]].sp) queue.push(kk); }
    }
    for (const m of made) if (!fired.has(m.k)) clear.delete(m.k);   // 새 특수블록 자리는 남김
    // 포인트
    st.combo = (st.combo || 0) + 1;                                   // 연속으로 터질수록 점수 배수
    const mult = Math.min(st.combo, RULES.comboMax);
    for (const k of clear) { const [r, c] = k.split(',').map(Number); const f = FLOWERS[st.g[r][c].t].id; G.S.pts[f] += mult + (Math.random() < bonus('pts') ? 1 : 0); }
    if (fired.size) SFX.both('special'); else SFX.play('pop', st.combo);
    if (st.combo >= 2) { SFX.play('combo', st.combo, 30); SFX.vib('combo', st.combo); }
    if (st.combo >= 2 && typeof buddyCombo === 'function') buddyCombo(st.combo);
    if (st.combo >= 2) floatText(`${st.combo}콤보! ×${mult}`, board()[0] + board()[2] / 2, board()[1] + board()[3] / 2, '#fff2a8');
    G.S.research += research;
    const [bx, by, bw] = board();
    if (research) floatText(`연구 +${research}`, bx + bw / 2, by + 80, '#e6ffd0');
    const many = clear.size > 14 ? 4 : clear.size > 7 ? 6 : 9;
    for (const k of clear) { const [r, c] = k.split(',').map(Number), x = st.g[r][c]; burst(r, c, FLOWERS[x.t].color, x.sp ? many + 6 : many, x.sp ? 1.5 : 1); }
    st.anim = { kind: 'clear', t0: Date.now(), dur: 260, clear, fn: () => {
      for (const k of clear) { const [r, c] = k.split(',').map(Number); st.g[r][c] = null; }
      for (const m of made) { const x = st.g[m.at[0]][m.at[1]] || tile(m.t); x.sp = m.sp; x.t = m.t; st.g[m.at[0]][m.at[1]] = x; }
      gravity();
    } };
    G.dirty = true;
  }

  function gravity() {
    let maxDrop = 0;
    for (let c = 0; c < N; c++) {
      let w = N - 1;
      for (let r = N - 1; r >= 0; r--) if (st.g[r][c]) { const x = st.g[r][c]; st.g[r][c] = null; st.g[w][c] = x; x.dy = r - w; maxDrop = Math.max(maxDrop, w - r); w--; }
      const empty = w + 1;
      for (let r = w; r >= 0; r--) { const x = tile(rk(), rndSp()); x.dy = -empty; st.g[r][c] = x; maxDrop = Math.max(maxDrop, empty); }
    }
    for (const row of st.g) for (const x of row) x.dy0 = x.dy;
    st.anim = { kind: 'fall', t0: Date.now(), dur: 180 + maxDrop * 45, fn: () => {
      for (const row of st.g) for (const x of row) { x.dy = 0; x.dy0 = 0; }
      if (resolve(null)) return;
      if (!hasMove()) { newKinds(); st.g = fresh(); toast('칩을 새로 섞었어요'); }
      storeBoard();
    } };
    G.dirty = true;
  }

  /* ---- 배경 (온실 그림이 오기 전 임시) ---- */
  // 시간대별 온실 배경: 낮 → 노을(17시대~19시대) → 밤 → 낮. 바뀔 때는 30분 동안 서서히 섞임
  function bgStage() {
    const d = G.fakeHour != null ? null : new Date(G.now || Date.now()), t = G.fakeHour != null ? G.fakeHour : d.getHours() + d.getMinutes() / 60;
    let a;                                   // 섞지 않고 시간이 되면 바로 바뀜: 6시 낮 · 17시 노을 · 19시 30분 밤
    if (t < 6) a = 'night'; else if (t < 17) a = ''; else if (t < 19.5) a = 'dusk'; else a = 'night';
    const b = a, w = 0;
    return { a, b, w: Math.round(w * 20) / 20 };
  }
  function makeBg() {
    const c = document.createElement('canvas'); c.width = G.L.W; c.height = G.L.H; const x = c.getContext('2d');
    const sfx = s => G.img[`bg_gh_${G.mode}${s ? '_' + s : ''}`], stg = bgStage(), A = sfx(stg.a), B = sfx(stg.b);
    if (A) {
      x.drawImage(A, 0, 0, G.L.W, G.L.H);
      if (B && stg.w > 0 && B !== A) { x.globalAlpha = stg.w; x.drawImage(B, 0, 0, G.L.W, G.L.H); x.globalAlpha = 1; }
      st.bg = c; st.bgMode = G.mode; st.bgKey = JSON.stringify(stg); return;
    }
    const g = x.createLinearGradient(0, 0, 0, G.L.H); g.addColorStop(0, '#d9efe0'); g.addColorStop(.55, '#b8dcae'); g.addColorStop(1, '#8fbf72');
    x.fillStyle = g; x.fillRect(0, 0, G.L.W, G.L.H);
    x.strokeStyle = 'rgba(255,255,255,.45)'; x.lineWidth = 10;
    const step = G.mode === 'pad' ? 250 : 305;
    for (let i = step; i < G.L.W; i += step) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, G.L.H * .82); x.stroke(); }
    x.beginPath(); x.moveTo(0, G.L.H * .82); x.lineTo(G.L.W, G.L.H * .82); x.stroke();
    x.fillStyle = 'rgba(110,80,50,.25)'; x.fillRect(0, G.L.H * .82, G.L.W, G.L.H * .18);
    st.bg = c; st.bgMode = G.mode;
  }

  function star(x, y, r, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath();
    for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.moveTo(0, -r); ctx.quadraticCurveTo(r * .12, -r * .12, r, 0); ctx.quadraticCurveTo(r * .12, r * .12, 0, r); }
    ctx.restore(); ctx.fill();
  }
  // 특수칩 모양은 한 번만 그려 두고(그림처럼) 매 프레임엔 붙이기만 함 — 느린 기기 프레임 드랍 방지
  const spCache = {};
  function spSprite(key, s, draw) {
    const S = Math.round(s), k = key + S; let c = spCache[k]; if (c) return c;
    const P = Math.ceil(S * .35); c = document.createElement('canvas'); c.width = c.height = S + P * 2; c._p = P;
    const main = ctx; ctx = c.getContext('2d');
    try { draw(P + S / 2, P + S / 2, S); } finally { ctx = main; }
    return (spCache[k] = c);
  }
  const ribCol = gold => gold ? ['#fff0a0', '#e8b62c', '#a8760f'] : ['#ff8a98', '#e2364e', '#a5203a'];
  function ribbonBase(cx, cy, len, th, vertical, gold) {
    const c = ribCol(gold);
    ctx.save(); ctx.translate(cx, cy); if (vertical) ctx.rotate(Math.PI / 2);
    ctx.shadowColor = 'rgba(40,10,10,.4)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4;
    const g = ctx.createLinearGradient(0, -th / 2, 0, th / 2); g.addColorStop(0, c[0]); g.addColorStop(.5, c[1]); g.addColorStop(1, c[2]);
    rrect(-len / 2, -th / 2, len, th, th * .2); ctx.fillStyle = g; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.lineWidth = 3; ctx.strokeStyle = c[2]; ctx.stroke(); ctx.restore();
  }
  function ribbonTop(cx, cy, len, th, vertical, gold) {
    const c = ribCol(gold);
    ctx.save(); ctx.translate(cx, cy); if (vertical) ctx.rotate(Math.PI / 2);
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-len / 2 + th * .3, -th * .26); ctx.lineTo(len / 2 - th * .3, -th * .26); ctx.stroke();
    for (const sgn of [-1, 1]) {                                                    // 가운데 매듭 리본
      ctx.beginPath(); ctx.ellipse(sgn * th * .5, 0, th * .55, th * .4, sgn * -.45, 0, 7); ctx.fillStyle = c[1]; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = c[2]; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0, 0, th * .28, 0, 7); ctx.fillStyle = c[0]; ctx.fill(); ctx.strokeStyle = c[2]; ctx.stroke();
    ctx.restore();
  }
  function ribbon(cx, cy, len, th, vertical, gold, t, s) {
    const key = (vertical ? 'v' : 'h') + (gold ? 'g' : 'r');
    const base = spSprite('rb' + key, s, (x, y) => ribbonBase(x, y, len, th, vertical, gold));
    const top = spSprite('rt' + key, s, (x, y) => ribbonTop(x, y, len, th, vertical, gold));
    ctx.drawImage(base, cx - s / 2 - base._p, cy - s / 2 - base._p);
    ctx.save(); ctx.translate(cx, cy); if (vertical) ctx.rotate(Math.PI / 2);   // 지나가는 반짝임(가벼운 것만 매번)
    ctx.beginPath(); ctx.rect(-len / 2, -th / 2, len, th); ctx.clip();
    const gx = (((t / 1100) % 1.6) - .3) * len - len / 2; ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath(); ctx.ellipse(gx, -th * .12, th * .55, th * .16, 0, 0, 7); ctx.fill(); ctx.restore();
    ctx.drawImage(top, cx - s / 2 - top._p, cy - s / 2 - top._p);
  }
  function drawSpecial(x, y, s, sp, t) {
    const cx = x + s / 2, cy = y + s / 2;
    ctx.save();
    if (sp === 'bomb') {                                   // 폭탄: 덮지 않고 빛나며 반짝이는 별이 돌아요
      const pulse = .5 + .5 * Math.sin(t / 260), rr = s * (.6 + .07 * pulse);
      const glow = spSprite('glow', s, (gx, gy, S) => {
        const R = S * .67, g = ctx.createRadialGradient(gx, gy, S * .15, gx, gy, R);
        g.addColorStop(0, 'rgba(255,230,120,0)'); g.addColorStop(.65, 'rgba(255,190,60,.6)'); g.addColorStop(1, 'rgba(255,160,40,0)');
        ctx.fillStyle = g; ctx.fillRect(gx - R, gy - R, R * 2, R * 2);
      });
      const k = rr / (s * .67), gw = glow.width * k;
      ctx.globalAlpha *= (.35 + .25 * pulse) / .6; ctx.drawImage(glow, cx - gw / 2, cy - gw / 2, gw, gw); ctx.globalAlpha /= (.35 + .25 * pulse) / .6;
      ctx.fillStyle = '#fff6c0';
      for (let i = 0; i < 4; i++) { const a = t / 650 + i * Math.PI / 2, r = s * .43; star(cx + Math.cos(a) * r, cy + Math.sin(a) * r, s * (.1 + .04 * Math.sin(t / 180 + i)), a); }
    } else if (sp === 'row') ribbon(cx, cy, s * .98, s * .24, false, false, t, s);
    else if (sp === 'col') ribbon(cx, cy, s * .98, s * .24, true, false, t, s);
    else if (sp === 'wideRow') ribbon(cx, cy, s * .98, s * .42, false, true, t, s);
    else if (sp === 'wideCol') ribbon(cx, cy, s * .98, s * .42, true, true, t, s);
    ctx.restore();
  }

  // 꽃 종류가 늘어도 스크롤 없이 격자로 배치 (아이콘 + 숫자)
  function otext(str, x, y, size, color) {   // 판 없이도 읽히는 테두리 글자
    ctx.font = font(size, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.fillStyle = color; softShadow(size, () => ctx.fillText(str, x, y));
  }
  const gaugeRects = () => {
    const pad = G.mode === 'pad', [x, y, w, h] = G.L.gh.gauges, n = FLOWERS.length;
    const cols = pad ? 4 : 5, rows = Math.max(1, Math.ceil(n / cols)), gap = pad ? 14 : 12;
    const cw = (w - gap * (cols - 1)) / cols, ch = Math.min(cw * 1.08, (h - gap * (rows - 1)) / rows);
    return FLOWERS.map((_, i) => [x + (i % cols) * (cw + gap), y + Math.floor(i / cols) * (ch + gap), cw, ch]);
  };
  const canMake = i => Math.floor(G.S.pts[FLOWERS[i].id] / seedCost());
  function makeSeed(i) {
    const f = FLOWERS[i]; if (canMake(i) < 1) return false;
    G.S.pts[f.id] -= seedCost(); G.S.seeds[f.id]++; save(); G.dirty = true;
    if (typeof buddyCheer === 'function') buddyCheer();
    const rc = gaugeRects()[i]; floatText(`${f.name} 씨앗 +1`, rc[0] + rc[2] / 2, rc[1], '#fff6b0'); return true;
  }
  function makeAll() {
    let n = 0; for (let i = 0; i < FLOWERS.length; i++) while (makeSeed(i)) n++;
    if (n) toast(`씨앗 ${n}개를 만들었어요`); return n;
  }
  function drawGauges() {
    const [x, y, w, h] = G.L.gh.gauges, pad = G.mode === 'pad', now = Date.now();
    gaugeRects().forEach((rc, i) => {
      const f = FLOWERS[i], p = G.S.pts[f.id], can = canMake(i);
      if (can) { rrect(rc[0] - 6, rc[1] - 2, rc[2] + 12, rc[3] + 4, 22); ctx.fillStyle = 'rgba(255,240,160,.44)'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,236,140,.95)'; ctx.stroke(); }
      const k = Math.min(1, rc[3] / 150), s = Math.min(rc[2] * .7, rc[3] * .5); imgFit(G.img[`block_${f.id}`], rc[0] + rc[2] / 2, rc[1] + rc[3] * (.26 + (1 - k) * .04), s);
      otext(f.name, rc[0] + rc[2] / 2, rc[1] + rc[3] * .64, Math.round((pad ? 30 : 28) * Math.max(.8, k)), '#fff');
      otext(can ? `씨앗 ${can}개` : `${p % seedCost()}/${seedCost()}`, rc[0] + rc[2] / 2, rc[1] + rc[3] * .87, Math.round((pad ? 34 : 32) * Math.max(.8, k)), can ? '#fff2a8' : '#f4fbe9');
    });
    const total = FLOWERS.reduce((a, _, i) => a + canMake(i), 0);
    button(G.L.gh.makeAll, total ? `모두 만들기 (${total})` : '모두 만들기', { disabled: !total, size: pad ? 44 : 46, pressed: G.pressBtn === 'all' });
  }

  const scr = G.screens.greenhouse = {
    onEnter() { newKinds(); if (!st.g) loadBoard(); },      // 들어올 때마다 처음 꽃 자리를 새로 뽑음 (새로 열린 꽃은 항상, 깔린 칩은 그대로)
    onMode() { st.bg = null; },
    busy: () => !!st.anim || st.fx.length > 0 || !!st.hint || !!st.sel,
    slow: () => !!(st.g && st.g.some(r => r.some(x => x && x.sp))),      // 가만히 있을 때 특수탄 반짝임만: 초당 10번
    draw() {
      if (!st.g) loadBoard();
      stepAnim();
      if (!st.bg || st.bgMode !== G.mode || st.bgKey !== JSON.stringify(bgStage())) makeBg();
      const ev = typeof nextEvent === 'function' ? nextEvent() : null, S = G.S;
      const key = [JSON.stringify(bgStage()), Math.floor(G.now / 60000), G.savedAt, S.coins, S.gems, S.research, JSON.stringify(S.pts), G.pressBtn === 'all', ev ? ev.time + ev.title : '', decorKey()].join('|');
      cachedLayer('gh', key, () => {          // 배경·시계·게이지·판과 칸 바탕: 바뀔 때만 다시 그림
        ctx.drawImage(st.bg, 0, 0);
        drawDecor('gh');
        if (G.mode === 'pad') { drawClockOnly(); } else drawTopInfo();
        drawGauges();
        if (G.mode === 'pad') {
          otext(`돈 ${G.S.coins}  ·  다이아 ${G.S.gems}  ·  연구 ${G.S.research}`, 110 + 380, 968, 38, '#fff');
        }
        const [bx, by, bw, bh] = board();
        rrect(bx, by, bw, bh, 40); ctx.fillStyle = 'rgba(255,255,255,.38)'; ctx.fill();
        ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.stroke();
        const s = cellSize();
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const x0 = cellXY(r, c); rrect(x0[0] + 4, x0[1] + 4, s - 8, s - 8, 22); ctx.fillStyle = (r + c) % 2 ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.28)'; ctx.fill(); ctx.fill();   // 두 번 칠해야 예전 모양과 같음
        }
      });
      const [bx, by, bw, bh] = board();
      const s = cellSize(), now = Date.now(), a = st.anim;
      ctx.save(); if (a) { rrect(bx, by, bw, bh, 40); ctx.clip(); }   // 움직일 때만 판 밖을 잘라냄
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const x = st.g[r][c]; if (!x) continue;
        let [px, py] = cellXY(r, c), sc = 1, al = 1;
        if (a && a.kind === 'swap') {
          const e = a.p || 0;
          if (r === a.a[0] && c === a.a[1]) { px += a.dx * s * e; py += a.dy * s * e; }
          if (r === a.b[0] && c === a.b[1]) { px -= a.dx * s * e; py -= a.dy * s * e; }
        }
        if (a && a.kind === 'clear' && a.clear.has(r + ',' + c)) { const e = a.p || 0; sc = 1 + e * .25; al = 1 - e; }
        if (a && a.kind === 'fall' && x.dy0) { const e = a.p || 0, ee = e * e; py += x.dy0 * s * (1 - ee); }
        if (st.sel && st.sel[0] === r && st.sel[1] === c) { sc = 1.08 + .03 * Math.sin(now / 120); }
        if (st.hint && st.hint.some(h => h[0] === r && h[1] === c)) sc = 1 + .08 * Math.abs(Math.sin(now / 250));
        ctx.globalAlpha = al;
        const im = G.img[`block_${FLOWERS[x.t].id}`], d = s * sc * .98;
        if (im) ctx.drawImage(im, px + s / 2 - d / 2, py + s / 2 - d / 2, d, d);
        if (x.sp) drawSpecial(px, py, s, x.sp, now);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      drawFx();
      if (st.sel) { const [x, y] = cellXY(st.sel[0], st.sel[1]); rrect(x + 3, y + 3, s - 6, s - 6, 24); ctx.lineWidth = 7; ctx.strokeStyle = '#fff6b0'; ctx.stroke(); }
      if (st.hint && now - st.hint.t0 > 3000) st.hint = null;
    },
    down(p) {
      if (st.anim) return;
      const h = hitCell(p); st.press = h ? { h, x: p.x, y: p.y } : null;
    },
    move(p) {
      const pr = st.press; if (!pr || st.anim) return;
      const dx = p.x - pr.x, dy = p.y - pr.y, s = cellSize();
      if (Math.max(Math.abs(dx), Math.abs(dy)) < s * .35) return;
      const [r, c] = pr.h, b = Math.abs(dx) > Math.abs(dy) ? [r, c + Math.sign(dx)] : [r + Math.sign(dy), c];
      st.press = null;
      if (b[0] >= 0 && b[0] < N && b[1] >= 0 && b[1] < N) trySwap([r, c], b);
    },
    up(p, tap) {
      const pr = st.press; st.press = null;
      if (tap && !st.anim) {                                  // 게이지를 누르면 씨앗 만들기, 아래 버튼은 모두 만들기
        const gi = gaugeRects().findIndex(rc => inRect(p, rc));
        if (gi >= 0) { if (!makeSeed(gi)) toast(`${FLOWERS[gi].name} 포인트가 아직 모자라요`); return; }
        if (inRect(p, G.L.gh.makeAll)) { if (!makeAll()) toast('만들 수 있는 씨앗이 아직 없어요'); return; }
      }
      if (!tap || !pr || st.anim) return;
      const h = pr.h;
      if (st.sel) {
        const d = Math.abs(st.sel[0] - h[0]) + Math.abs(st.sel[1] - h[1]);
        if (d === 1) { trySwap(st.sel, h); return; }
        if (d === 0) { st.sel = null; G.dirty = true; return; }
      }
      st.sel = h; G.dirty = true;
    },
    buttonOpt(id) {
      if (id === 'craft') { const n = FLOWERS.reduce((a, f) => a + Math.floor(G.S.pts[f.id] / seedCost()), 0); return { badge: n }; }
      if (id === 'orders') return { badge: G.S.orders.filter(canDeliver).length || 0 };
      if (id === 'shop') return {};
      return {};
    },
    onButton(id) {
      if (id === 'hint') { if (st.anim) return; const m = findMove(); if (m) { st.hint = m; st.hint.t0 = Date.now(); G.dirty = true; } }
      if (id === 'craft') openCraft();
    },
  };
})();

function drawClockOnly() {  // 패드 온실: 판과 겹치지 않게 시계만
  const keep = G.L.gems, keep2 = G.L.save;
  G.L.gems = null; G.L.save = null;
  try { drawTopInfo(); } finally { G.L.gems = keep; G.L.save = keep2; }
}

/* ---------- 씨앗 제작 ---------- */
function openCraft() {
  let tab = 0;
  openPopup({
    title: '씨앗 만들기', big: 'laugh',
    draw(full) {
      this.btns = [];
      const padT = G.mode === 'pad', tw = padT ? 260 : 210, th = 80;
      ['씨앗 만들기', '씨앗 연구', '도감'].forEach((nm, i) => {
        const rt = [full[0] + i * (tw + 14), full[1], tw, th];
        button(rt, nm, { active: tab === i, size: 38 }); this.btns.push({ rect: rt, fn: () => { if (i === 1) { G.popup = null; go('lab'); return; } tab = i; this.scroll = 0; } });
      });
      const r = [full[0], full[1] + th + 20, full[2], full[3] - th - 20];
      if (tab === 1) return researchTab(this, r);
      if (tab === 2) return dexTab(this, r);
      const pad = G.mode === 'pad';
      const all = [r[0] + r[2] / 2 - 200, r[1] + r[3] - 110, 400, 110];
      const area = [r[0], r[1], r[2], r[3] - 140];
      const cols = pad ? 2 : 1, gap = pad ? 20 : 16, ch = 150, cw = (area[2] - gap * (cols - 1)) / cols, rowsN = Math.ceil(FLOWERS.length / cols);
      scrollBegin(this, area, rowsN * (ch + gap) - gap);
      FLOWERS.forEach((f, i) => {
        const rc = [area[0] + (i % cols) * (cw + gap), area[1] + Math.floor(i / cols) * (ch + gap), cw, ch], p = G.S.pts[f.id], can = Math.floor(p / seedCost());
        card(rc, can > 0);
        const s = rc[3] * .8; imgFit(G.img[`flower_${f.id}_seed`], rc[0] + 20 + s / 2, rc[1] + rc[3] / 2, s);
        text(f.name, rc[0] + s + 40, rc[1] + rc[3] * .34, 40, '#6e4b28');
        text(`포인트 ${p} · 씨앗 ${G.S.seeds[f.id]}개`, rc[0] + s + 40, rc[1] + rc[3] * .7, 30, '#8a6a44', 'left', false, 500);
        const br = [rc[0] + rc[2] - 190, rc[1] + rc[3] / 2 - 46, 170, 92];
        button(br, '만들기', { disabled: !can, size: 36 });
        const hit = scrollHit(this, area, br);
        if (hit) this.btns.push({ rect: hit, disabled: !can, fn: () => { G.S.pts[f.id] -= seedCost(); G.S.seeds[f.id]++; save(); toast(`${f.name} 씨앗 +1`); } });
      });
      scrollEnd(this, area);
      const any = FLOWERS.some(f => G.S.pts[f.id] >= seedCost());
      button(all, '모두 만들기', { disabled: !any, size: 42 });
      this.btns.push({ rect: all, disabled: !any, fn: () => {
        let n = 0; for (const f of FLOWERS) { const k = Math.floor(G.S.pts[f.id] / seedCost()); G.S.pts[f.id] -= k * seedCost(); G.S.seeds[f.id] += k; n += k; }
        save(); toast(`씨앗 ${n}개를 만들었어요`);
      } });
    },
  });
}

/* ---------- 씨앗 연구 (재료 세 개 섞기: 꽃씨·꽃·특수 꽃씨) ---------- */
const RS = { slots: [null, null, null], msg: '', last: null, pick: null };
function ensureSpecial() { const S = G.S; S.sseeds = S.sseeds || {}; S.found = S.found || {}; }
function drawHalo(x, y, r, hue, c = ctx) {
  const g = c.createRadialGradient(x, y, r * .2, x, y, r);
  g.addColorStop(0, `hsla(${hue},100%,75%,.95)`); g.addColorStop(.5, `hsla(${hue},100%,65%,.45)`); g.addColorStop(1, `hsla(${hue},100%,60%,0)`);
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
}
const tokInfo = t => { const [k, id] = t.split(':'); return k === 'sp' ? { k, id, name: SPECIAL[id].name + ' 꽃씨', hue: SPECIAL[id].hue, base: baseId(id) } : { k, id, name: (FLOWER[id] ? FLOWER[id].name : id) + (k === 'seed' ? ' 씨앗' : ' 꽃') }; };
const tokCount = t => { const [k, id] = t.split(':'), S = G.S; return (k === 'seed' ? S.seeds : k === 'bloom' ? S.flowers : S.sseeds)[id] || 0; };
const tokTake = t => { const [k, id] = t.split(':'), S = G.S; (k === 'seed' ? S.seeds : k === 'bloom' ? S.flowers : S.sseeds)[id]--; };
function drawTok(t, cx, cy, s) {
  const k = tokInfo(t);
  if (k.k === 'sp') { drawHalo(cx, cy, s * .75, k.hue); imgFit(G.img[`flower_${k.base}_seed`], cx, cy, s * .7); }
  else imgFit(G.img[`flower_${k.id}_${k.k === 'seed' ? 'seed' : 'bloom'}`], cx, cy, s);
}
function mixSeeds() {
  ensureSpecial(); const S = G.S, key = RS.slots.slice().sort().join();
  if (RS.slots.some(v => !v)) { RS.msg = '재료 세 개를 넣어 주세요.'; return; }
  const sp = SPECIALS.find(s => s.ing.slice().sort().join() === key);
  if (!sp) { RS.msg = '아무 일도 일어나지 않았어요. 재료는 그대로예요.'; RS.last = null; RS.slots = [null, null, null]; return; }
  const cost = SPECIAL_COST[sp.grade];
  if (S.research < cost) { RS.msg = `뭔가 반응이 있어요! 연구 포인트가 ${cost} 필요해요. (지금 ${S.research})`; RS.last = null; return; }
  S.research -= cost; for (const v of RS.slots) tokTake(v);
  S.sseeds[sp.id] = (S.sseeds[sp.id] || 0) + 1; const first = !S.found[sp.id]; S.found[sp.id] = 1;
  RS.popAt = Date.now(); RS.last = sp.id; RS.msg = first ? `대박! 새 꽃씨 「${sp.name}」을(를) 발견했어요!` : `「${sp.name}」 꽃씨를 또 만들었어요!`;
  RS.slots = [null, null, null]; save(); toast(first ? '새 특수꽃 발견!' : `${sp.name} 꽃씨 +1`);
}
function researchTab(p, r) {
  ensureSpecial(); const [x, y, w, h] = r, pad = G.mode === 'pad', S = G.S;
  if (RS.pick !== null) return pickTab(p, r);
  const big = pad ? 170 : 140, cy = y + big / 2 + 10, stepX = big * 1.25;
  RS.slots.forEach((t, i) => {
    const rc = [x + 10 + i * stepX, cy - big / 2, big, big];
    card(rc, !!t);
    if (t) { drawTok(t, rc[0] + big / 2, rc[1] + big * .42, big * .6); text(tokInfo(t).name, rc[0] + big / 2, rc[1] + big * .9, 22, '#6e4b28', 'center'); }
    else text('눌러서 고르기', rc[0] + big / 2, rc[1] + big / 2, 24, '#b89a70', 'center');
    p.btns.push({ rect: rc, fn: () => { if (t) RS.slots[i] = null; else RS.pick = i; } });
  });
  const rx = x + w - big * .7;
  text('→', x + 10 + 3 * stepX - big * .1, cy, 50, '#6e4b28', 'center');
  const sp = RS.last && SPECIAL[RS.last];
  if (sp) { drawHalo(rx, cy, big * .75, sp.hue); imgFit(G.img[`flower_${baseId(sp.id)}_seed`], rx, cy, big * .6); }
  else text('?', rx, cy, 100, '#b89a70', 'center');
  if (RS.popAt && Date.now() - RS.popAt < 2800) {       // 성공하면 캐릭터가 튀어나와 축하
    const t = (Date.now() - RS.popAt) / 1000, e = Math.min(1, t / .35), bounce = t < .35 ? 0 : Math.abs(Math.sin((t - .35) * 7)) * 14 * Math.max(0, 1 - t / 2.8);
    const im = G.img.sd_cheer;
    if (im) { const hh = big * 1.7 * (.4 + .6 * e), ww = hh * im.width / im.height; ctx.globalAlpha = Math.min(1, e * 1.5); ctx.drawImage(im, rx - ww / 2 - big * .1, cy + big * .9 - hh - bounce, ww, hh); ctx.globalAlpha = 1; }
    for (let k = 0; k < 10; k++) { const a = k * .628 + t * 2, d = big * (.5 + t * .5) + (k % 3) * 14; ctx.globalAlpha = Math.max(0, 1 - t / 2.8); text('✦', rx + Math.cos(a) * d, cy + Math.sin(a) * d, 28, `hsl(${(sp ? sp.hue : 50) + k * 12},100%,75%)`, 'center'); ctx.globalAlpha = 1; }
    G.dirty = true;
  }
  const my = y + big + 60;
  text(RS.msg || '칸을 눌러 재료 세 개를 골라 섞어 보세요. 운이 좋으면…', x + w / 2, my, pad ? 34 : 28, '#8a6a44', 'center');
  text(`연구 포인트 ${S.research}`, x + w / 2, my + 56, 36, '#b07a12', 'center');
  const bh = 110, br = [x + w / 2 - 210, y + h - bh, 420, bh], ok = RS.slots.every(v => v);
  button(br, '섞기', { disabled: !ok, size: 46 });
  p.btns.push({ rect: br, disabled: !ok, fn: mixSeeds });
}
function pickTab(p, r) {
  ensureSpecial();
  const [x, y, w, h] = r, pad = G.mode === 'pad', cols = pad ? 6 : 3, gap = 14, ch = pad ? 190 : 170, cw = (w - gap * (cols - 1)) / cols;
  const used = t => RS.slots.filter(v => v === t).length;
  const OF = FLOWERS.slice(0, openKinds()), secs = [['꽃씨', OF.map(f => 'seed:' + f.id)], ['수확한 꽃', OF.map(f => 'bloom:' + f.id)], ['특수 꽃씨', SPECIALS.filter(s => G.S.found[s.id]).map(s => 'sp:' + s.id)]];
  const back = [x + w - 260, y, 260, 76];
  button(back, '돌아가기', { size: 36 }); p.btns.push({ rect: back, fn: () => { RS.pick = null; p.scroll = 0; G.popup = null; } });
  text(`${RS.pick + 1}번 칸 재료를 고르세요`, x, y + 40, pad ? 36 : 30, '#6e4b28');
  const r2 = [x, y + 96, w, h - 96];
  let oy = 0, total = 0; for (const [, l] of secs) total += 60 + Math.ceil(Math.max(l.length, 1) / cols) * (ch + gap);
  scrollBegin(p, r2, total);
  for (const [nm, list] of secs) {
    text(nm, x, r2[1] + oy + 28, 32, '#6e4b28'); oy += 60;
    if (!list.length) text('아직 없어요', x + 10, r2[1] + oy + 40, 26, '#b89a70');
    list.forEach((t, i) => {
      const have = tokCount(t) - used(t), rc = [x + (i % cols) * (cw + gap), r2[1] + oy + Math.floor(i / cols) * (ch + gap), cw, ch];
      card(rc, have > 0); ctx.globalAlpha = have > 0 ? 1 : .4;
      drawTok(t, rc[0] + cw / 2, rc[1] + ch * .38, Math.min(cw, ch) * .5);
      text(`${tokInfo(t).name.replace(/ (꽃씨|씨앗)$/, '')} ${have}`, rc[0] + cw / 2, rc[1] + ch * .84, 24, '#6e4b28', 'center'); ctx.globalAlpha = 1;
      const hit = scrollHit(p, r2, rc); if (hit) p.btns.push({ rect: hit, disabled: have <= 0, fn: () => { RS.slots[RS.pick] = t; RS.pick = null; RS.msg = ''; p.scroll = 0; G.popup = null; G.dirty = true; } });
    });
    oy += Math.ceil(Math.max(list.length, 1) / cols) * (ch + gap);
  }
  scrollEnd(p, r2);
}
function dexTab(p, r) {
  ensureSpecial(); const [x, y, w] = r, pad = G.mode === 'pad', cols = pad ? 4 : 2, gap = 16, ch = 150;
  const cw = (w - gap * (cols - 1)) / cols, rows = Math.ceil(SPECIALS.length / cols);
  const n = SPECIALS.filter(s => G.S.found[s.id]).length;
  text(`발견 ${n} / ${SPECIALS.length}`, x, y + 24, 36, '#6e4b28');
  const r2 = [x, y + 60, w, r[3] - 60];
  scrollBegin(p, r2, rows * (ch + gap));
  SPECIALS.forEach((s, i) => {
    const rc = [x + (i % cols) * (cw + gap), r2[1] + Math.floor(i / cols) * (ch + gap), cw, ch], got = G.S.found[s.id];
    card(rc, !!got);
    if (got) { drawHalo(rc[0] + 70, rc[1] + ch / 2, 62, s.hue); imgFit(G.img[`flower_${baseId(s.id)}_seed`], rc[0] + 70, rc[1] + ch / 2, 70); }
    else imgFit(null, 0, 0, 0), text('?', rc[0] + 70, rc[1] + ch / 2, 60, '#b89a70', 'center');
    const hn = got ? 0 : (G.S.hints || {})[s.id] || 0;
    text(got ? s.name : '???', rc[0] + 150, rc[1] + ch * (hn ? .2 : .4), pad ? 30 : 28, '#6e4b28', 'left');
    if (hn) for (let k = 0; k < 3; k++) text(k < hn ? tokName(s.ing[k]) : '?', rc[0] + 150, rc[1] + ch * (.42 + k * .21), 20, k < hn ? '#6e4b28' : '#b89a70', 'left', false, 500);
    if (got) text(`꽃씨 ${G.S.sseeds[s.id] || 0}`, rc[0] + 150, rc[1] + ch * .72, 22, '#8a6a44', 'left', false, 500);
  });
  scrollEnd(p, r2);
}
