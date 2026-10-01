// 문선농장 — 작은 달해(가분수 캐릭터): 정원을 걸어 다니고, 기쁠 때 폴짝하고, 오래 두면 하품하러 나옴
'use strict';
(() => {
  const B = { walker: null, cheer: null, yawn: null, nextWalk: 0, lastCheer: 0, lastYawn: 0 };
  G.lastTouch = Date.now();
  const rnd = (a, b) => a + Math.random() * (b - a);
  const img = pose => G.img[/^so_/.test(pose) ? pose : 'sd_' + pose];
  // 오늘의 옷: 하루 동안은 같은 옷 (날짜로 정함). 0번은 기본 옷
  const _d = new Date(), daySeed = _d.getFullYear() * 372 + _d.getMonth() * 31 + _d.getDate();
  const pick = (arr, salt = 0) => arr[(daySeed + salt) % arr.length];
  const ALT = { flower: ['flower', 'so_7', 'so_4'], write: ['write', 'so_6'], cheer: ['cheer', 'so_1', 'so_5'], jump: ['jump', 'so_2'] };
  const OUTFIT_TALK = { smile: ['a', 'b', 'c'], laugh: ['a', 'b', 'c', 'd', 'e'], surprise: ['a'], worry: ['a'], think: ['a', 'b'] };
  function talkImg(e, main) {
    if (G.img[e]) return G.img[e];                               // po_… 처럼 그림 이름을 그대로 준 경우                                   // main=true 이면 항상 기본 옷 (처음 소개 등 중요한 순간)
    const base = G.img['talk_' + e]; if (main || !OUTFIT_TALK[e]) return base;
    const list = [base].concat(OUTFIT_TALK[e].map(k => G.img['to_' + e + '_' + k]).filter(Boolean));
    return pick(list, e.length) || base;
  }
  function sprite(pose, cx, feetY, h, o = {}) {
    const im = img(pose); if (!im) return;
    const w = h * im.width / im.height;
    ctx.save(); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.translate(cx, feetY); if (o.rot) ctx.rotate(o.rot); if (o.flip) ctx.scale(-1, 1);
    ctx.drawImage(im, -w / 2, -h, w, h); ctx.restore();
  }
  const shadow = (cx, y, w, h, a) => { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#5b3d20'; ctx.beginPath(); ctx.ellipse(cx, y, w, h, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); };

  /* ---- 물조리개 달해: 퉁 튀어나와 까닥거리다 사라지고, 다른 곳에 또 나타남. 누르면 바로 사라짐 ---- */
  function spawnWalker() {
    const pad = G.mode === 'pad', h = G.L.H * (pad ? .17 : .078), W = G.L.W, H = G.L.H, gd = G.L.garden, bedH = gd.bedW * BED.h / BED.w;
    const last = B.lastPop ? B.lastPop.x : -1; let x;
    do { x = W * rnd(pad ? .12 : .1, pad ? .9 : .9); } while (Math.abs(x - last) < W * .25);          // 지난번과 다른 곳
    B.lastPop = { x };
    B.walker = { t0: Date.now(), dur: rnd(3200, 5200), x, y: rnd(gd.y + bedH * .22, gd.y + bedH * .94), h, flip: Math.random() < .5, ph: rnd(0, 6) };
  }
  function popRect() {
    const k = B.walker, im = img('water'); if (!k || !im) return null;
    const w = k.h * im.width / im.height; return [k.x - w * .75, k.y - k.h * 1.15, w * 1.5, k.h * 1.3];
  }
  function drawWalker() {
    const k = B.walker; if (!k) return;
    const t = (Date.now() - k.t0) / k.dur; if (t >= 1 || G.screen !== 'garden') { endPop(); return; }
    const ts = (Date.now() - k.t0) / 1000;
    let s = 1; if (t < .07) { const u = t / .07; s = u < .7 ? u / .7 * 1.2 : 1.2 - (u - .7) / .3 * .2; } else if (t > .93) s = (1 - t) / .07;   // 퉁 튀어나옴 / 쏙 들어감
    const nod = Math.sin(ts * 7 + k.ph) * .09;                                                                  // 까닥까닥
    shadow(k.x, k.y, k.h * .22 * s, k.h * .035 * s, .2);
    sprite('water', k.x, k.y, k.h * Math.max(.01, s), { flip: k.flip, rot: nod });
  }
  function endPop() { B.walker = null; B.nextWalk = Date.now() + rnd(6, 14) * 1000; G.dirty = true; }

  /* ---- 기쁨: 수확·납품·씨앗 제작 때 폴짝 ---- */
  window.buddyCheer = function () {
    const now = Date.now(); if (now - B.lastCheer < 3500 || B.yawn || B.talk) return; B.lastCheer = now;
    const pad = G.mode === 'pad';
    B.cheer = { t0: now, dur: 2600, pose: pick(['*', 'so_1', 'so_2', 'so_5'], 1) === '*' ? (Math.random() < .6 ? 'jump' : 'cheer') : pick(['*', 'so_1', 'so_2', 'so_5'], 1), x: G.L.W * (pad ? .085 : .12), y: G.L.H * (pad ? .965 : .905), h: G.L.H * (pad ? .27 : .12) };
    G.dirty = true;
  };
  function drawCheer() {
    const c = B.cheer; if (!c) return;
    const t = (Date.now() - c.t0) / c.dur; if (t >= 1) { B.cheer = null; return; }
    const pop = Math.min(1, t / .1), fade = t > .85 ? (1 - t) / .15 : 1, hop = Math.abs(Math.sin(t * Math.PI * 5)) * c.h * .12;
    shadow(c.x, c.y, c.h * .22 * (1 - hop / c.h), c.h * .035, .2 * fade);
    sprite(c.pose, c.x, c.y - hop, c.h * (.6 + .4 * pop), { alpha: fade });
  }

  /* ---- 오래 켜 두면 하품하는 큰 달해: 손대면 사라짐 ---- */
  function drawYawn() {
    const y = B.yawn; if (!y) return;
    const t = Math.min(1, (Date.now() - y.t0) / 900), im = img('yawn'); if (!im) return;
    ctx.fillStyle = `rgba(20,15,8,${.28 * t})`; ctx.fillRect(0, 0, G.L.W, G.L.H);
    const h = Math.min(G.L.H * .96, G.L.W * (G.mode === 'pad' ? .98 : 1.25) * im.height / im.width), breath = 1 + Math.sin(Date.now() / 700) * .012;
    sprite('yawn', G.L.W / 2, G.L.H * .99 + (1 - t) * 80, h * breath, { alpha: t });
  }

  /* ---- 큰 상반신 달해: 설명이 필요할 때 게임 화면 맨 앞에서 말풍선과 함께 이야기함 (탭하면 다음 / 닫힘) ---- */
  // 텍스트는 임시 문구. 표정: smile laugh surprise worry think yawn
  const TALKS = {
    garden_intro: [
      { e: 'smile', t: '어서 오세요! 여기는 꽃 정원이에요. 밭 칸을 눌러 땅을 갈고, 씨앗을 심고, 물을 주면 꽃이 자라요.' },
      { e: 'laugh', t: '꽃이 피면 눌러서 거두고, 의뢰 게시판에 납품하면 돈을 벌 수 있어요.' },
    ],
    greenhouse_intro: [
      { e: 'smile', t: '여기는 온실이에요. 같은 꽃 칩을 세 개 이상 맞춰 터뜨리면 그 꽃의 씨앗 포인트가 모여요.' },
      { e: 'think', t: '왼쪽 꽃 칸의 숫자가 가득 차면 그 칸을 눌러 씨앗을 만들 수 있어요. 여러 개면 "모두 만들기"를 누르세요.' },
      { e: 'surprise', t: '네 개, 다섯 개, ㄱ자로 맞추면 특별한 칩이 생겨요. 특별한 칩끼리 바꾸면 더 크게 터져요!' },
    ],
    room_intro: [
      { e: 'smile', t: '여기는 제 방이에요. 편하게 쉬다 가세요.' },
      { e: 'laugh', t: '일기장은 말로 쓰기, 달력은 일정, 약통과 혈압계와 운동 매트는 오늘 기록이에요. 눌러 보세요!' },
    ],
  };
  const TALK_POS = {   // 화면·기기별 자리: cx=캐릭터 가운데(가로 비율), h=캐릭터 높이(세로 비율), 말풍선 [x,y,w] 비율
    pad: { greenhouse: { cx: .17, h: .66, bub: [.31, .36, .38], tail: 'left' }, garden: { cx: .16, h: .62, bub: [.30, .30, .40], tail: 'left' }, room: { cx: .5, h: .58, bub: [.18, .13, .64], tail: 'down' }, def: { cx: .17, h: .62, bub: [.31, .32, .40], tail: 'left' } },
    phone: { def: { cx: .30, h: .30, bub: [.06, .40, .88], tail: 'down' } },
  };
  window.buddyTalk = function (id, pages, o = {}) {
    if (B.talk || B.yawn) return false;
    if (o.once && G.S.talked && G.S.talked[id]) return false;
    B.talk = { id, pages: pages || TALKS[id], i: 0, t0: Date.now(), t1: Date.now(), once: o.once !== false }; G.dirty = true; return true;
  };
  function wrapLines(str, w, size) {
    ctx.font = font(size, 600); const lines = []; let line = '';
    for (const ch of str) { if (ch === '\n' || ctx.measureText(line + ch).width > w) { lines.push(line); line = ch === '\n' ? '' : ch; } else line += ch; }
    if (line) lines.push(line); return lines;
  }
  function drawTalk() {
    const k = B.talk; if (!k) return;
    const pg = k.pages[k.i], pad = G.mode === 'pad', W = G.L.W, H = G.L.H;
    const P = (TALK_POS[G.mode][G.screen] || TALK_POS[G.mode].def);
    const t = Math.min(1, (Date.now() - k.t0) / 350), e = 1 - Math.pow(1 - t, 3);
    ctx.fillStyle = `rgba(20,15,8,${.22 * e})`; ctx.fillRect(0, 0, W, H);
    const im = talkImg(pg.e || 'smile', k.once); let ph = P.h * H, px = P.cx * W, pw = 0;
    if (im) { pw = ph * im.width / im.height; ctx.drawImage(im, px - pw / 2, H - ph + (1 - e) * ph * .25, pw, ph); }
    // 말풍선
    const size = pad ? 44 : 50, bx = P.bub[0] * W, bw = P.bub[2] * W, pd = 36;
    const full = pg.t, n = Math.floor((Date.now() - k.t1) / 32), shown = Math.min(full.length, n);
    const lines = wrapLines(full, bw - pd * 2, size), lh = size * 1.5, bh = lines.length * lh + pd * 2 + 40;
    let by = P.bub[1] * H; if (P.tail === 'down' && !pad) by = H - ph - 60 - bh;   // 폰: 캐릭터 머리 위에
    ctx.save(); ctx.shadowColor = 'rgba(60,40,20,.35)'; ctx.shadowBlur = 24 * (G.scale || 1); ctx.shadowOffsetY = 8 * (G.scale || 1);
    rrect(bx, by, bw, bh, 44); ctx.fillStyle = '#fffaf0'; ctx.fill(); ctx.restore();
    rrect(bx, by, bw, bh, 44); ctx.lineWidth = 6; ctx.strokeStyle = '#c9a57a'; ctx.stroke();
    ctx.beginPath();                                                   // 꼬리
    if (P.tail === 'left') { const ty = by + bh * .55; ctx.moveTo(bx + 2, ty - 26); ctx.lineTo(bx - 52, ty + 10); ctx.lineTo(bx + 2, ty + 30); }
    else { const tx = Math.min(bx + bw - 90, Math.max(bx + 90, px)); ctx.moveTo(tx - 30, by + bh - 2); ctx.lineTo(tx + 6, by + bh + 50); ctx.lineTo(tx + 34, by + bh - 2); }
    ctx.closePath(); ctx.fillStyle = '#fffaf0'; ctx.fill();
    // 이름표
    rrect(bx + 30, by - 30, 150, 62, 31); ctx.fillStyle = '#e9b7a6'; ctx.fill(); text('달해', bx + 105, by + 1, 36, '#fff', 'center');
    let left = shown;
    lines.forEach((ln, i) => { const s = ln.slice(0, Math.max(0, Math.min(ln.length, left))); left -= ln.length; text(s, bx + pd, by + pd + 40 + i * lh, size, '#5c3d1e', 'left', false, 600); });
    if (shown >= full.length) { const a = .5 + .5 * Math.sin(Date.now() / 300); ctx.globalAlpha = a; text(k.i < k.pages.length - 1 ? '▼ 눌러서 다음' : '▼ 눌러서 닫기', bx + bw - pd, by + bh - 34, size * .6, '#a98457', 'right'); ctx.globalAlpha = 1; }
  }
  function advanceTalk() {
    const k = B.talk; if (!k) return false;
    const full = k.pages[k.i].t.length, shown = Math.floor((Date.now() - k.t1) / 32);
    if (shown < full) { k.t1 = 0; G.dirty = true; return true; }              // 타이핑 중이면 한 번에 다 보여 줌
    if (k.i < k.pages.length - 1) { k.i++; k.t1 = Date.now(); G.dirty = true; return true; }
    if (k.once && G.S.talked) { G.S.talked[k.id] = true; save(); }
    B.talk = null; B.lastTalkEnd = Date.now(); G.lastTouch = Date.now(); G.dirty = true; return true;
  }

  /* ---- 잠깐 튀어나와 한마디: 게임을 멈추거나 화면 터치를 막지 않음 (콤보·특수칩 칭찬 등) ---- */
  const COMBO_LINES = {
    2: ['좋아요!', '오, 잘하는데요?', '아싸!'],
    3: ['우아~ 3콤보예요!!', '와, 잘하는데요!!', '대박, 3콤보!'],
    4: ['대단해요!! {n}콤보!!', '와아! 손이 안 보여요!', '{n}콤보라니, 최고예요!!'],
  };
  window.buddyCombo = function (n) {
    const arr = COMBO_LINES[Math.min(n, 4)]; if (!arr) return;
    buddyReact(arr[Math.floor(Math.random() * arr.length)].replace('{n}', n), n >= 4 ? 'surprise' : 'laugh');
  };
  window.buddyReact = function (msg, expr) {
    const now = Date.now(); if (B.talk || B.yawn) return;
    if (B.react && now - B.react.t0 < 500) return;                 // 너무 연달아 바뀌지 않게
    B.react = { t0: now, dur: 1700, text: msg, e: expr || 'laugh' }; G.dirty = true;
  };
  function drawReact() {
    const r = B.react; if (!r) return;
    const p = (Date.now() - r.t0) / r.dur; if (p >= 1) { B.react = null; return; }
    const slide = p < .12 ? p / .12 : p > .85 ? (1 - p) / .15 : 1, e = 1 - Math.pow(1 - slide, 3);
    const pad = G.mode === 'pad', W = G.L.W, H = G.L.H, im = talkImg(r.e, false); if (!im) return;
    const ph = H * (pad ? .27 : .105), pw = ph * im.width / im.height, px = W * (pad ? .06 : .075);      // 밭·메뉴를 가리지 않게 작게, 왼쪽 끝으로
    ctx.drawImage(im, px - pw / 2, H - ph * e, pw, ph);          // 아래에서 쑥 올라옴
    const size = pad ? 42 : 44; ctx.font = font(size, 700);
    const tw = ctx.measureText(r.text).width, bw = tw + 70, bh = size * 1.9, bx = px + pw * .38, by = H * (pad ? .9 : .955) - bh * .5;       // 말풍선은 바닥 쪽 빈 자리에
    ctx.save(); ctx.globalAlpha = Math.min(1, e * 1.4); ctx.translate(0, (1 - e) * 30);
    ctx.shadowColor = 'rgba(60,40,20,.35)'; ctx.shadowBlur = 20 * (G.scale || 1); ctx.shadowOffsetY = 6 * (G.scale || 1);
    rrect(bx, by, bw, bh, bh / 2); ctx.fillStyle = '#fffaf0'; ctx.fill(); ctx.restore();
    ctx.save(); ctx.globalAlpha = Math.min(1, e * 1.4); ctx.translate(0, (1 - e) * 30);
    rrect(bx, by, bw, bh, bh / 2); ctx.lineWidth = 5; ctx.strokeStyle = '#c9a57a'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx + 4, by + bh * .38); ctx.lineTo(bx - 40, by + bh * .62); ctx.lineTo(bx + 8, by + bh * .72); ctx.closePath(); ctx.fillStyle = '#fffaf0'; ctx.fill();
    text(r.text, bx + bw / 2, by + bh / 2 + 2, size, '#5c3d1e', 'center'); ctx.restore();
  }

  /* ---- 팝업 옆에 큼직하게 서 있는 상반신 달해 (창 모서리를 살짝 덮음) ---- */
  function bigRect() {
    const p = G.popup; if (!p || !p.big) return null; const im = talkImg(p.big, false); if (!im) return null;
    const pad = G.mode === 'pad', H = G.L.H, h = H * (pad ? .40 : .20), w = h * im.width / im.height;
    return { im, x: pad ? G.L.W * .105 - w / 2 : -w * .03, y: H - h, w, h };
  }
  function drawPopupBig() {
    const r = bigRect(); if (!r) return; const p = G.popup;
    p._bigT = p._bigT || Date.now(); const t = Math.min(1, (Date.now() - p._bigT) / 350), e = 1 - Math.pow(1 - t, 3);
    ctx.drawImage(r.im, r.x, r.y + (1 - e) * r.h * .3, r.w, r.h); if (t < 1) G.dirty = true;
  }
  window.buddyBigHit = pt => { const r = bigRect(); return !!(r && pt.x > r.x && pt.x < r.x + r.w && pt.y > r.y && pt.y < r.y + r.h); };

  window.buddyGrab = function (p) {
    if (B.talk) return advanceTalk();
    if (B.walker && p) { const r = popRect(); if (r && p.x > r[0] && p.x < r[0] + r[2] && p.y > r[1] && p.y < r[1] + r[3]) { endPop(); return true; } }   // 작은 달해를 누르면 사라짐            // 큰 달해가 떠 있을 때 화면을 만지면 사라지고, 그 손길은 다른 곳에 전달되지 않음
    if (!B.yawn) return false;
    B.yawn = null; B.lastYawn = Date.now(); G.lastTouch = Date.now(); G.dirty = true; return true;
  };

  window.buddyTick = function () {            // 1초마다
    const now = Date.now();
    if (B.scr !== G.screen) { B.scr = G.screen; B.scrAt = now; B.introDone = false; }
    if (!B.introDone && now - B.scrAt > 900 && !G.popup && !B.talk && !B.yawn && TALKS[G.screen + '_intro']) {   // 처음 들어온 화면이면 한마디
      B.introDone = true; buddyTalk(G.screen + '_intro', null, { once: true });
    }
    if (!B.nextWalk) B.nextWalk = now + rnd(6, 12) * 1000;
    if (G.screen === 'garden' && !G.popup && !B.talk && !B.yawn && !B.walker && now >= B.nextWalk) { spawnWalker(); G.dirty = true; }
    const idle = (RULES.idleYawnMin || 4) * 60000;
    if (!B.yawn && !B.talk && !G.popup && ['garden', 'greenhouse', 'room'].includes(G.screen) && now - G.lastTouch > idle && now - B.lastYawn > idle) {
      B.yawn = { t0: now }; B.cheer = null; G.dirty = true;
    }
  };
  window.buddyBusy = () => !!(B.walker || B.cheer || B.yawn || B.talk || B.react);
  window.buddyDraw = () => { drawWalker(); drawCheer(); };
  window.buddyDrawTop = () => { drawPopupBig(); drawYawn(); drawReact(); drawTalk(); };
  window.buddySmall = (pose, x, y, h) => sprite(ALT[pose] ? pick(ALT[pose]) : pose, x, y, h);      // 창(팝업) 꾸미기용
  G._buddy = B;
})();
