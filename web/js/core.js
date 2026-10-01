// 문선농장 — 엔진: 화면 크기, 그림 불러오기, 터치, 저장, 공용 그리기
'use strict';
const G = {
  mode: 'pad', L: LAYOUT.pad, screen: 'garden', S: null, img: {}, bbox: {},
  popup: null, toast: null, floats: [], dirty: true, savedAt: 0, pressBtn: -1,
  now: Date.now(), screens: {},
};
const cv = document.getElementById('game');
let ctx = cv.getContext('2d');
// 움직이지 않는 그림은 한 번만 그려 두고 복사해서 씀 (key가 바뀔 때만 다시 그림)
const _layers = {};
function cachedLayer(id, key, fn) {
  const w = cv.width, h = cv.height, k = key + '|' + w + 'x' + h + '|' + G.mode;
  let Ly = _layers[id];
  if (!Ly || Ly.c.width !== w || Ly.c.height !== h) { Ly = _layers[id] = { c: document.createElement('canvas'), k: null }; Ly.c.width = w; Ly.c.height = h; }
  if (Ly.k !== k) {
    const main = ctx; ctx = Ly.c.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, w, h);
    ctx.setTransform(w / G.L.W, 0, 0, h / G.L.H, 0, 0); ctx.imageSmoothingQuality = 'high';
    try { fn(); } finally { ctx = main; }
    Ly.k = k;
  }
  const t = ctx.getTransform(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(Ly.c, 0, 0); ctx.setTransform(t);
}
const FONT = '"Noto Sans KR","Noto Sans CJK KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif';

/* ---------- 그림 ---------- */
function imageList() {
  const l = ['bed_base', 'cell_tilled_overlay', 'cell_wet_overlay'];
  for (const f of FLOWERS) {
    for (const s of ['seed', 'seed_wet', 'bud', 'bud_wet', 'bloom']) l.push(`flower_${f.id}_${s}`);
    l.push(`block_${f.id}`);
  }
  const icons = ['orders','mail','shop','inventory','seed','room','garden','greenhouse','craft','hint','voice','today','calendar'];
  return l.map(n => [n, `img/${n}.png`]).concat(icons.map(n => ['icon_' + n, `img/icon/${n}.png`])).concat([
    ['bg_garden_pad', 'img/bg_garden_pad.jpg'], ['bg_garden_phone', 'img/bg_garden_phone.jpg'], ['bg_gh_pad', 'img/bg_gh_pad.jpg'], ['bg_gh_phone', 'img/bg_gh_phone.jpg'],
    ['bg_room_pad_dusk', 'img/bg_room_pad_dusk.jpg'], ['bg_room_pad_night', 'img/bg_room_pad_night.jpg'], ['bg_room_phone_dusk', 'img/bg_room_phone_dusk.jpg'], ['bg_room_phone_night', 'img/bg_room_phone_night.jpg'],
    ['bg_room_pad', 'img/bg_room_pad.jpg'], ['bg_room_phone', 'img/bg_room_phone.jpg'],
    ['talk_smile', 'img/char/talk_smile.png'], ['talk_laugh', 'img/char/talk_laugh.png'], ['talk_surprise', 'img/char/talk_surprise.png'], ['talk_worry', 'img/char/talk_worry.png'], ['talk_think', 'img/char/talk_think.png'], ['talk_yawn', 'img/char/talk_yawn.png'],
    ['sd_stand', 'img/char/sd_stand.png'], ['sd_wave', 'img/char/sd_wave.png'], ['sd_jump', 'img/char/sd_jump.png'], ['sd_water', 'img/char/sd_water.png'], ['sd_flower', 'img/char/sd_flower.png'], ['sd_write', 'img/char/sd_write.png'], ['sd_yawn', 'img/char/sd_yawn.png'], ['sd_cheer', 'img/char/sd_cheer.png'], ['so_1', 'img/char/so_1.png'], ['so_2', 'img/char/so_2.png'], ['so_3', 'img/char/so_3.png'], ['so_4', 'img/char/so_4.png'], ['so_5', 'img/char/so_5.png'], ['so_6', 'img/char/so_6.png'], ['so_7', 'img/char/so_7.png'], ['so_8', 'img/char/so_8.png'], ['to_smile_a', 'img/char/to_smile_a.png'], ['to_laugh_a', 'img/char/to_laugh_a.png'], ['to_surprise_a', 'img/char/to_surprise_a.png'], ['to_worry_a', 'img/char/to_worry_a.png'], ['to_think_a', 'img/char/to_think_a.png'], ['to_laugh_b', 'img/char/to_laugh_b.png'], ['to_smile_b', 'img/char/to_smile_b.png'], ['to_laugh_c', 'img/char/to_laugh_c.png'], ['to_smile_c', 'img/char/to_smile_c.png'], ['to_laugh_d', 'img/char/to_laugh_d.png'], ['to_think_b', 'img/char/to_think_b.png'], ['to_laugh_e', 'img/char/to_laugh_e.png'],
    ...[1, 2, 3, 4, 5, 6].map(n => ['fa_' + n, `img/item/fa_${n}.png`]),
    ...['hg_10','hg_30','hg_60','hg_360'].map(n => [n, `img/item/${n}.png`]),
    ...['fairy','fairy2','hourglass','hourglass2','teapot','can','can2','glove','glove2'].map(n => ['it_' + n, `img/item/it_${n}.png`]),
    ...['basket','harvest','hoe','sleep','wheel','med','bp','toilet'].map(n => ['po_' + n, `img/char/po_${n}.png`]),
    ['bg_shop', 'img/bg_shop.jpg'], ['bg_lab_pad', 'img/bg_lab_pad.jpg'], ['bg_lab_phone', 'img/bg_lab_phone.jpg'],
    ...['slot','slot_on','btn','btn_b','back','pot0','pot1','pot2','bub0','bub1','bub2','spk0','spk1','spk2','dh0','dh1','dh2'].map(n => ['lab_' + n, `img/lab/${n}.webp`]),
    ...PROPS.map(p => ['prop_' + p.id, `img/prop/${p.id}.png`]),
    ...[0, 1, 2, 3].flatMap(r => [0, 1, 2].map(c => [`sk_${r}${c}`, `img/shop/sk_${r}${c}.png`])),
    ['bg_garden_pad_dusk', 'img/bg_garden_pad_dusk.jpg'], ['bg_garden_pad_night', 'img/bg_garden_pad_night.jpg'], ['bg_garden_phone_dusk', 'img/bg_garden_phone_dusk.jpg'], ['bg_garden_phone_night', 'img/bg_garden_phone_night.jpg'],
    ['bg_gh_pad_dusk', 'img/bg_gh_pad_dusk.jpg'], ['bg_gh_pad_night', 'img/bg_gh_pad_night.jpg'],
    ['bg_gh_phone_dusk', 'img/bg_gh_phone_dusk.jpg'], ['bg_gh_phone_night', 'img/bg_gh_phone_night.jpg']]);
}
/* 시작할 때는 지금 기기(가로/세로)·지금 시간대 배경만 받고, 나머지는 시작한 뒤에 조용히 받음 (로딩 줄이기) */
const isBg = n => /^bg_(garden|gh|room|lab)_(pad|phone)/.test(n);
function needNow(n) {
  if (n.startsWith('lab_')) return false;          // 연구실 그림은 시작한 뒤에 받음
  if (!isBg(n)) return true;
  const mode = window.innerHeight > window.innerWidth ? 'phone' : 'pad';
  if (!n.includes('_' + mode)) return false;
  const v = n.match(/_(dusk|night)$/); if (!v) return true;
  const st = typeof gardenStage === 'function' ? gardenStage() : '';
  return v[1] === st;
}
function loadOne([n, src], onDone) {
  return new Promise(res => {
    if (G.img[n]) { res(); return; }
    const im = new Image();
    im.onload = () => { G.img[n] = im; onDone && onDone(); G.dirty = true; res(); };
    im.onerror = () => { console.warn('그림 없음', src); onDone && onDone(); res(); };
    im.src = /^img\/(char|item|prop|shop|icon)\/|^img\/bed_base\.png$/.test(src) ? src.replace(/\.png$/, '.webp') : src;   // 큰 그림은 용량이 작은 webp로
  });
}
function loadImages(onProgress) {
  const list = imageList().filter(([n]) => needNow(n)); let done = 0;
  return Promise.all(list.map(it => loadOne(it, () => onProgress(++done / list.length))));
}
function loadRest(onlyMode) {                 // 아직 안 받은 그림을 뒤에서 조용히 받음
  const mode = window.innerHeight > window.innerWidth ? 'phone' : 'pad';
  return Promise.all(imageList().filter(([n]) => !G.img[n] && (!onlyMode || !isBg(n) || n.includes('_' + mode))).map(it => loadOne(it)));
}
// 그림의 실제 그려진 부분(투명 제외) 범위 — 씨앗을 칸 가운데 놓을 때 사용
function alphaBox(name) {
  if (G.bbox[name]) return G.bbox[name];
  const im = G.img[name]; if (!im) return null;
  const n = 64, c = document.createElement('canvas'); c.width = c.height = n;
  const x = c.getContext('2d'); x.drawImage(im, 0, 0, n, n);
  let d; try { d = x.getImageData(0, 0, n, n).data; } catch (e) { return (G.bbox[name] = { cx: .5, cy: .5 }); }   // 앱에서 그림이 '외부 자료'로 취급되면 가운데로
  let l = n, t = n, r = 0, b = 0;
  for (let y = 0; y < n; y++) for (let xx = 0; xx < n; xx++) if (d[(y * n + xx) * 4 + 3] > 40) {
    if (xx < l) l = xx; if (xx > r) r = xx; if (y < t) t = y; if (y > b) b = y;
  }
  return (G.bbox[name] = r < l ? { cx: .5, cy: .5 } : { cx: (l + r + 1) / 2 / n, cy: (t + b + 1) / 2 / n });
}

/* ---------- 화면 크기 ---------- */
function resize() {
  if (document.activeElement && /^ov_/.test(document.activeElement.id)) return;   // 글자 입력 중 키보드가 올라와도 화면 배치는 그대로
  const w = window.innerWidth, h = window.innerHeight;
  const mode = h > w ? 'phone' : 'pad';
  if (mode !== G.mode) { const first = !G.mode; G.mode = mode; G.L = LAYOUT[mode]; if (!first) loadRest(false); for (const k in G.screens) G.screens[k].onMode && G.screens[k].onMode(); }
  const { W, H } = G.L;
  const s = Math.min(w / W, h / H);
  G.scale = s;
  const cw = Math.round(W * s), ch = Math.round(H * s);
  cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
  cv.style.left = Math.round((w - cw) / 2) + 'px'; cv.style.top = Math.round((h - ch) / 2) + 'px';
  const dpr = Math.min(window.devicePixelRatio || 1, W / cw);   // 기기 해상도 이상은 안 씀
  cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
  G.dirty = true;
}

/* ---------- 저장 ---------- */
const SAVE_KEY = 'moonsun_farm_v1';
const DEV = (() => { try { let d = localStorage.getItem('moonsun_dev'); if (!d) { d = Math.random().toString(36).slice(2, 10); localStorage.setItem('moonsun_dev', d); } return d; } catch (e) { return 'x' + Math.random().toString(36).slice(2, 8); } })();
function newState() {
  const S = {
    v: 1, rv: 2, created: Date.now(), cur: 'tulip',
    beds: Array.from({ length: RULES.startBeds }, () => Array.from({ length: 16 }, () => ({ s: 'empty' }))),
    seeds: {}, flowers: {}, pts: {}, research: 0, coins: 0, gems: 0, owned: {}, can: 1, glove: 1, swipe: false, stats: { harvest: 0 }, daily: { day: '', med: 0, bp: 0, exercise: 0 }, talked: {}, diary: {}, rec: {}, events: [],
    orders: [], day: '', doneToday: 0, mails: [{ id: 'claude_hello', from: '공동 개발자 클로드', body: '사용자님의 빠른 쾌유와 건강한 삶을 응원합니다.\n\n- 공동 개발자 클로드 -', read: false, gift: { coins: 100, gems: 1 } }], opt: { snd: 1, vib: 1, bgm: 1 },
    decor: { garden: Array(DECOR_COUNT.garden).fill(null), room: Array(DECOR_COUNT.room).fill(null), gh: Array(DECOR_COUNT.gh).fill(null) },
    fairyAt: Date.now() + RULES.fairyEveryMin * MIN,
  };
  for (const f of FLOWERS) { S.seeds[f.id] = RULES.startSeeds[f.id] || 0; S.flowers[f.id] = 0; S.pts[f.id] = 0; }
  return S;
}
function loadState() {
  let raw = null;
  try { if (window.FarmBridge && FarmBridge.load) raw = FarmBridge.load(); } catch (e) {}
  try { if (!raw) raw = localStorage.getItem(SAVE_KEY); } catch (e) {}
  try { if (raw) { const S = JSON.parse(raw); if (S && S.v === 1 && S.rv === 2) return fixState(S);  /* rv: 시험 때 저장은 한 번 비우고 처음부터 */ } } catch (e) { console.warn('저장 읽기 실패', e); }
  return newState();
}
function fixState(S) {  // 나중에 꽃·화단이 늘어도 옛 저장이 깨지지 않게
  const d = newState();
  for (const k in d) if (S[k] === undefined) S[k] = d[k];
  for (const f of FLOWERS) for (const k of ['seeds', 'flowers', 'pts']) if (S[k][f.id] === undefined) S[k][f.id] = 0;
  return S;
}
let saveTimer = 0;
function save(now) {
  if (G.restoring) return;               // 불러오는 중에는 지금 진행으로 덮어쓰지 않음
  clearTimeout(saveTimer);
  const run = () => {
    G.S.ts = Date.now(); G.S.dev = DEV; if (!G.syncHold) G.S.syncTs = G.S.ts;   // 막혀 있지 않으면 이 저장이 보관 파일로도 감
    const txt = JSON.stringify(G.S);
    try { localStorage.setItem(SAVE_KEY, txt); } catch (e) {}
    try { if (window.FarmBridge && FarmBridge.save) FarmBridge.save(txt); } catch (e) {}
    G.savedAt = Date.now(); G.dirty = true;
  };
  if (now) run(); else saveTimer = setTimeout(run, 800);
}
document.addEventListener('visibilitychange', () => { if (document.hidden) save(true); });
window.addEventListener('pagehide', () => save(true));

/* ---------- 공용 그리기 ---------- */
function font(size, weight = 700) { return `${weight} ${size}px ${FONT}`; }
function softShadow(size, draw) {
  ctx.save(); const k = G.scale || 1;
  ctx.shadowColor = 'rgba(25,35,15,.9)'; ctx.shadowBlur = size * .2 * k; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = size * .05 * k;
  draw(); draw(); ctx.restore();          // 두 번 겹쳐 그림자를 또렷하게
}
function text(str, x, y, size, color = '#fff', align = 'left', shadow = false, weight = 700) {
  ctx.font = font(size, weight); ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  if (shadow) softShadow(size, () => ctx.fillText(str, x, y));   // 살짝 번지는 그림자
  else ctx.fillText(str, x, y);
}
function rrect(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function plate(x, y, w, h, r = 30, a = .38) { rrect(x, y, w, h, r); ctx.fillStyle = `rgba(30,40,20,${a})`; ctx.fill(); }
function button(rect, label, opt = {}) {
  const [x, y, w, h] = rect; const dn = opt.pressed, off = opt.disabled;
  ctx.save();
  if (opt.icon) {                       // 아이콘 버튼: 상자 없이 그림 + 이름표
    const cx = x + w / 2, k = dn ? .9 : 1, s = h * .82 * k, top = y - h * .04 + (dn ? h * .05 : 0);
    if (opt.active) {                   // 지금 있는 화면은 은은한 빛
      const g = ctx.createRadialGradient(cx, top + s / 2, s * .2, cx, top + s / 2, s * .85);
      g.addColorStop(0, 'rgba(255,236,150,.95)'); g.addColorStop(1, 'rgba(255,236,150,0)');
      ctx.fillStyle = g; ctx.fillRect(cx - s, top - s * .3, s * 2, s * 1.6);
    }
    ctx.shadowColor = 'rgba(30,20,5,.45)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 8;
    ctx.drawImage(opt.icon, cx - s / 2, top, s, s);
    ctx.shadowColor = 'transparent';
    const fs = opt.size || Math.round(h * (G.mode === 'phone' ? .2 : .17));
    ctx.font = font(fs); const tw = Math.min(w - 8, ctx.measureText(label).width + fs * 1.1), ph = fs * 1.5, py = y + h - ph - 2;
    rrect(cx - tw / 2, py, tw, ph, ph / 2); ctx.fillStyle = opt.active ? '#ffe9b0' : 'rgba(255,248,232,.94)'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = opt.active ? '#c9892f' : '#96704a'; ctx.stroke();
    text(label, cx, py + ph / 2 + 1, fs, '#6e4b28', 'center');
    if (opt.badge) {
      ctx.beginPath(); ctx.arc(cx + s * .42, top + s * .1, 26, 0, 7); ctx.fillStyle = '#e24b3b'; ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.stroke();
      text(String(opt.badge), cx + s * .42, top + s * .1 + 1, 30, '#fff', 'center');
    }
    ctx.restore(); return;
  }
  if (!dn) { rrect(x + 4, y + 8, w, h, 28); ctx.fillStyle = 'rgba(60,40,20,.25)'; ctx.fill(); }
  rrect(x, y + (dn ? 6 : 0), w, h, 28);
  ctx.fillStyle = off ? 'rgba(235,228,214,.85)' : opt.active ? '#ffe9b0' : 'rgba(255,248,232,.96)'; ctx.fill();
  ctx.lineWidth = opt.active ? 7 : 5; ctx.strokeStyle = opt.active ? '#c9892f' : '#96704a'; ctx.stroke();
  const fs = opt.size || Math.min(46, Math.round(h * .27), Math.round(w * .92 / Math.max(3, label.replace(/ /g, '').length + .4)));
  text(label, x + w / 2, y + (dn ? 6 : 0) + h / 2, fs, off ? '#a99a88' : '#6e4b28', 'center');
  if (opt.badge) {
    ctx.beginPath(); ctx.arc(x + w - 18, y + 18, 26, 0, 7); ctx.fillStyle = '#e24b3b'; ctx.fill();
    text(String(opt.badge), x + w - 18, y + 19, 30, '#fff', 'center');
  }
  ctx.restore();
}
function inRect(p, r) { return r && p.x >= r[0] && p.x <= r[0] + r[2] && p.y >= r[1] && p.y <= r[1] + r[3]; }
function toast(msg, ms = 2200) { G.toast = { msg, until: Date.now() + ms }; G.dirty = true; }
function floatText(msg, x, y, color = '#fff') { G.floats.push({ msg, x, y, color, t0: Date.now() }); }
function fmtLeft(ms) {
  if (ms < MIN) return `${Math.max(1, Math.ceil(ms / 1000))}초`;
  const m = Math.ceil(ms / MIN); if (m < 60) return `${m}분`;
  return `${Math.floor(m / 60)}시간 ${m % 60 ? (m % 60) + '분' : ''}`.trim();
}
function checkShopMails() {   // (상점으로 합쳐져서 더는 쇼핑 편지를 보내지 않음. 편지 기능은 나중에 시트로 받아 옴)
  return;
  const S = G.S; let got = false;
  for (const sm of SHOP_MAILS) {
    if (S.mails.some(m => m.id === sm.id)) continue;
    if (S.coins < sm.trigger || (sm.requires && !S.owned[sm.requires])) continue;
    S.mails.push({ id: sm.id, from: sm.from, body: sm.body, read: false, offer: { name: sm.item.name, cost: sm.cost, kind: sm.item.kind, v: sm.item.v || 0 } });
    got = true;
  }
  if (got) { toast('우체통에 새 편지가 왔어요'); save(); G.dirty = true; }
}
function todayKey(t = Date.now()) { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }

/* ---------- 위쪽 정보(보기 전용) ---------- */
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
function nextEvent() {  // 안드로이드 앱이 캘린더에서 넣어 줌. 없으면 표시 안 함
  try { if (window.FarmBridge && FarmBridge.nextEvent) { const e = JSON.parse(FarmBridge.nextEvent() || 'null'); if (e) return e; } } catch (e) {}
  if (typeof localNextEvent === 'function') return localNextEvent();
  return null;
}
function drawTopInfo() {
  const L = G.L, c = L.clock, d = new Date(G.now);
    text(`${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`, c.x, c.y + c.big * .55, c.big, '#fff', 'left', true);
  const date = `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEK[d.getDay()]}`;
  text(date, c.x + 6, c.lineY, c.small, '#fff', 'left', true);
  const ev = nextEvent();
  ctx.font = font(c.small);
  const dx = c.x + 6 + ctx.measureText(date).width + 22;
  if (ev) text(`· ${ev.time} ${ev.title}`, dx, c.lineY, c.small, '#ffe896', 'left', true);
  else text('· 일정 없음', dx, c.lineY, c.small, 'rgba(255,255,255,.7)', 'left', true);
  // 보석 / 연구
  if (!L.gems) return;
  const [gx, gy, gw, gh] = L.gems;
  drawCoin(gx + 40, gy + gh / 2, 24);
  const cs = String(G.S.coins), gs = String(G.S.gems), half = gw / 2 - 100;
  let fs = 44; ctx.font = font(fs); while (fs > 26 && ctx.measureText(cs).width > half) { fs -= 2; ctx.font = font(fs); }
  text(cs, gx + 80, gy + gh / 2 + 2, fs, '#fff', 'left', true);
  drawGem(gx + gw / 2 + 44, gy + gh / 2, 26);
  text(gs, gx + gw / 2 + 84, gy + gh / 2 + 2, 44, '#fff', 'left', true);
  // 저장 상태
  const [sx, sy, sw, sh] = L.save;
  if (G.savedAt) {
    const t = new Date(G.savedAt);
    text(`저장됨 ${t.getHours()}:${String(t.getMinutes()).padStart(2, '0')}`, sx + sw, sy + sh / 2, 30, 'rgba(255,255,255,.9)', 'right', true);
  }
}
function drawCoin(x, y, r) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7);
  const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r); g.addColorStop(0, '#ffe58a'); g.addColorStop(1, '#e0a12a');
  ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, r * .55, 0, 7); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(160,100,10,.6)'; ctx.stroke();
}
// 건강 기록 보상: 방 화면의 기록 기능이 부르는 함수. 하루 횟수를 넘으면 보상 없이 기록만.
function giveDiamond(kind) {
  const r = RULES.diaRewards[kind]; if (!r) return 0;                // 배변 등 보상 없는 기록
  const S = G.S, d = todayKey(); if (S.daily.day !== d) S.daily = { day: d, med: 0, bp: 0, exercise: 0 };
  if (S.daily[kind] >= r.perDay) return 0;
  S.daily[kind]++; S.gems += r.dia; save(); G.dirty = true;
  toast(`${r.label} 기록했어요 · 덤으로 다이아 +${r.dia}`); return r.dia;
}
function drawGem(x, y, r) {
  ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * .9, y - r * .2); ctx.lineTo(x, y + r); ctx.lineTo(x - r * .9, y - r * .2); ctx.closePath();
  const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r); g.addColorStop(0, '#bff3ff'); g.addColorStop(1, '#3aa6d8');
  ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
}

/* ---------- 아래 버튼 ---------- */
function bottomButtons() {
  const ids = BUTTONS[G.screen];
  return ids.map((id, i) => ({ id, rect: G.L.buttons(i) }));
}
function drawBottom() {
  const scr = G.screens[G.screen], bs = bottomButtons();
  const opts = bs.map((b, i) => Object.assign({ pressed: G.pressBtn === i, active: b.id === G.screen }, scr.buttonOpt ? scr.buttonOpt(b.id) : {}));
  cachedLayer('bottom', G.screen + JSON.stringify(opts) + (G.img.icon_mail ? 1 : 0), () => {
    bs.forEach((b, i) => button(b.rect, opts[i].label || BTN_LABEL[b.id], Object.assign({ icon: G.img['icon_' + b.id] }, opts[i])));
  });
}
function onButton(id) {
  if (id === 'garden' || id === 'greenhouse' || id === 'room') { go(id); return; }
  if (id === 'orders') return openOrders();
  if (id === 'mail') return openMail();
  if (id === 'shop') return go('shop');
  const scr = G.screens[G.screen]; scr.onButton && scr.onButton(id);
}
function go(name) {
  if (G.screen === name) return;
  const prev = G.screen; G.screen = name; G.popup = null; G.dirty = true;
  G.screens[name].onEnter && G.screens[name].onEnter(prev);
}

/* ---------- 팝업 (가운데 창) ---------- */
function panelRect() { return G.mode === 'pad' ? [360, 90, 1280, 900] : [50, 520, 1120, 1860]; }
function openPopup(p) { G.popup = p; G.dirty = true; }
function drawPopup() {
  const p = G.popup; if (!p) return;
  ctx.fillStyle = 'rgba(20,30,10,.45)'; ctx.fillRect(0, 0, G.L.W, G.L.H);
  const [x, y, w, h] = panelRect();
  rrect(x + 6, y + 12, w, h, 44); ctx.fillStyle = 'rgba(40,25,10,.3)'; ctx.fill();
  rrect(x, y, w, h, 44); ctx.fillStyle = '#fff8ea'; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = '#9b7148'; ctx.stroke();
  text(p.title, x + w / 2, y + 70, 56, '#6e4b28', 'center');
  if (p.buddy && typeof buddySmall === 'function') buddySmall(p.buddy, x + 90, y + 138, G.mode === 'pad' ? 175 : 200);   // 창 귀퉁이에 앉은 작은 달해
  const closeR = (p.big && G.mode === 'phone') ? [x + w - 420, y + h - 150, 380, 120] : [x + w / 2 - 190, y + h - 150, 380, 120];
  p._close = closeR; p._inner = [x + 50, y + 130, w - 100, h - 300];
  p.draw(p._inner);
  button(closeR, '닫기', { pressed: G.pressBtn === 'close' });
}
function popupTap(pt) {
  const p = G.popup;
  if (inRect(pt, p._close)) { G.popup = null; G.dirty = true; return; }
  for (const b of p.btns || []) if (inRect(pt, b.rect) && !b.disabled) { b.fn(); G.dirty = true; return; }
  if (typeof buddyBigHit === 'function' && buddyBigHit(pt)) return;      // 큰 달해를 눌러도 창은 안 닫힘
  if (!inRect(pt, panelRect())) { G.popup = null; G.dirty = true; return; }
}
function gridRects(r, cols, rows, gap = 24) {
  const [x, y, w, h] = r, cw = (w - gap * (cols - 1)) / cols, ch = (h - gap * (rows - 1)) / rows, out = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) out.push([x + i * (cw + gap), y + j * (ch + gap), cw, ch]);
  return out;
}
// 팝업 안 스크롤: begin/end 사이에 그리면 손가락으로 위아래로 밀 수 있음
function scrollBegin(p, r, contentH) {
  p.contentH = contentH; const max = Math.max(0, contentH - r[3]);
  p.scroll = Math.min(Math.max(p.scroll || 0, 0), max);
  ctx.save(); ctx.beginPath(); ctx.rect(r[0] - 12, r[1], r[2] + 24, r[3]); ctx.clip(); ctx.translate(0, -p.scroll);
}
function scrollEnd(p, r) {
  ctx.restore();
  const max = Math.max(0, p.contentH - r[3]); if (!max) return;
  const bh = Math.max(60, r[3] * r[3] / p.contentH), by = r[1] + (r[3] - bh) * (p.scroll / max);
  rrect(r[0] + r[2] + 14, by, 10, bh, 5); ctx.fillStyle = 'rgba(110,75,40,.45)'; ctx.fill();
}
// 스크롤된 칸의 눌리는 영역 (보이는 부분만)
function scrollHit(p, r, rc) {
  const y0 = Math.max(rc[1] - p.scroll, r[1]), y1 = Math.min(rc[1] + rc[3] - p.scroll, r[1] + r[3]);
  return y1 > y0 ? [rc[0], y0, rc[2], y1 - y0] : null;
}
function card(r, hi) {
  rrect(r[0], r[1], r[2], r[3], 26); ctx.fillStyle = hi ? '#ffeec2' : '#f3e6cf'; ctx.fill();
  ctx.lineWidth = hi ? 6 : 3; ctx.strokeStyle = hi ? '#c9892f' : '#cdb08a'; ctx.stroke();
}
function imgFit(im, x, y, s) { if (im) ctx.drawImage(im, x - s / 2, y - s / 2, s, s); }

/* ---------- 터치 ---------- */
const ptr = { down: false, id: null, sx: 0, sy: 0, x: 0, y: 0, moved: false, target: null };
function toLogical(e) {
  const r = cv.getBoundingClientRect();
  return { x: (e.clientX - r.left) / G.scale, y: (e.clientY - r.top) / G.scale };
}
cv.addEventListener('pointerdown', e => { try { pointerdown0(e); } catch (er) { if (window.__dbg) __dbg('pointerdown ' + (er && er.stack || er)); } });
function pointerdown0(e) {
  if (ptr.down) return;
  cv.setPointerCapture(e.pointerId);
  const p = toLogical(e);
  G.lastTouch = Date.now();
  if (typeof buddyGrab === 'function' && buddyGrab(p)) { Object.assign(ptr, { down: true, id: e.pointerId, sx: p.x, sy: p.y, x: p.x, y: p.y, ly: p.y, moved: false, target: 'buddy' }); return; }
  Object.assign(ptr, { down: true, id: e.pointerId, sx: p.x, sy: p.y, x: p.x, y: p.y, ly: p.y, moved: false, target: null });
  if (G.popup) {
    if (inRect(p, G.popup._close)) G.pressBtn = 'close';
    ptr.target = 'popup'; G.dirty = true; return;
  }
  const bs = bottomButtons();
  for (let i = 0; i < bs.length; i++) if (inRect(p, bs[i].rect)) { G.pressBtn = i; ptr.target = 'btn'; G.dirty = true; return; }
  const scr = G.screens[G.screen];
  if (scr.fairyHit && scr.fairyHit(p)) { ptr.target = 'fairy'; return; }
  ptr.target = 'screen'; scr.down && scr.down(p);
}
cv.addEventListener('pointermove', e => { try { pointermove0(e); } catch (er) { if (window.__dbg) __dbg('pointermove ' + (er && er.stack || er)); } });
function pointermove0(e) {
  if (!ptr.down || e.pointerId !== ptr.id) return;
  const p = toLogical(e); ptr.x = p.x; ptr.y = p.y;
  if (Math.hypot(p.x - ptr.sx, p.y - ptr.sy) > 12 / G.scale) ptr.moved = true;
  if (ptr.target === 'popup') {
    const pp = G.popup;
    if (pp && ptr.moved && pp._inner && pp.contentH > pp._inner[3]) {
      pp.scroll = Math.min(Math.max((pp.scroll || 0) - (p.y - ptr.ly), 0), pp.contentH - pp._inner[3]); G.dirty = true;
    }
    ptr.ly = p.y;
  }
  if (ptr.target === 'screen') { const s = G.screens[G.screen]; s.move && s.move(p); }
}
function endPtr(e, cancel) {
  if (!ptr.down || e.pointerId !== ptr.id) return;
  ptr.down = false; const p = toLogical(e);
  const was = G.pressBtn; G.pressBtn = -1; G.dirty = true;
  if (cancel) { if (ptr.target === 'screen') { const s = G.screens[G.screen]; s.up && s.up(p, false); } return; }
  if (ptr.target === 'popup') { if (!ptr.moved || was === 'close') popupTap(p); return; }
  if (ptr.target === 'btn') { const b = bottomButtons()[was]; if (b && inRect(p, b.rect)) onButton(b.id); return; }
  if (ptr.target === 'fairy') { G.screens[G.screen].fairyTap(); return; }
  if (ptr.target === 'screen') { const s = G.screens[G.screen]; s.up && s.up(p, !ptr.moved); }
}
cv.addEventListener('pointerup', e => endPtr(e, false));
cv.addEventListener('pointercancel', e => endPtr(e, true));
cv.addEventListener('contextmenu', e => e.preventDefault());

/* ---------- 시간 흐름 ---------- */
function tick() {
  G.now = Date.now();
  let changed = false;
  for (const bed of G.S.beds) for (const c of bed) {
    if ((c.s === 'seed' || c.s === 'bud') && c.wet && G.now >= c.until) {
      c.s = c.s === 'seed' ? 'bud' : 'bloom'; c.wet = false; delete c.until; changed = true;
    }
  }
  if (changed) { G.screens.garden.invalidate(); save(); }
  refreshOrders(); checkShopMails(); checkAttendance();
  if (typeof buddyTick === 'function') buddyTick();
  const m = new Date(G.now).getMinutes();
  if (m !== G._lastMin) { G._lastMin = m; G.dirty = true; }
}

/* ---------- 그리기 루프 ---------- */
function frame() {
  requestAnimationFrame(frame);
  try { frame0(); } catch (e) { G.dirty = true; if (window.__dbg) __dbg('FRAME ' + (e && e.stack || e)); }
}
function frame0() {
  const scr = G.screens[G.screen];
  const busy = (scr.busy && scr.busy()) || G.floats.length || (G.toast && G.toast.until > Date.now()) || (typeof buddyBusy === 'function' && buddyBusy());
  if (!G.dirty && !busy) return;
  const nw = Date.now();
  if (!G.dirty && nw - (G._lastDraw || 0) < 28) return;   // 움직임만 있는 장면은 초당 약 30번
  G._lastDraw = nw;
  G.dirty = false; G.now = nw;
  ctx.setTransform(cv.width / G.L.W, 0, 0, cv.height / G.L.H, 0, 0);
  ctx.imageSmoothingQuality = 'high';
  scr.draw();
  drawBottom();
  if (typeof buddyDraw === 'function') buddyDraw();
  // 떠오르는 글자
  G.floats = G.floats.filter(f => {
    const t = (G.now - f.t0) / 1000; if (t > 1.1) return false;
    ctx.globalAlpha = 1 - t / 1.1; text(f.msg, f.x, f.y - t * 90, 44, f.color, 'center', true); ctx.globalAlpha = 1;
    return true;
  });
  if (G.toast) {
    if (G.toast.until < G.now) G.toast = null;
    else {
      ctx.font = font(40); const w = ctx.measureText(G.toast.msg).width + 80, y = G.L.toastY;
      rrect(G.L.W / 2 - w / 2, y - 45, w, 90, 45); ctx.fillStyle = 'rgba(40,30,15,.82)'; ctx.fill();
      text(G.toast.msg, G.L.W / 2, y, 40, '#fff', 'center');
    }
  }
  drawPopup();
  if (typeof buddyDrawTop === 'function') buddyDrawTop();
  fillSides();
}
// 화면 비율이 달라 생기는 양옆(또는 위아래) 빈자리를 게임 화면을 흐리게 늘려서 채움
let _bgc = null;
function fillSides() {
  const ww = window.innerWidth, wh = window.innerHeight, cw = parseFloat(cv.style.width) || ww, ch = parseFloat(cv.style.height) || wh;
  if (Math.abs(cw - ww) < 2 && Math.abs(ch - wh) < 2) return;
  if (!_bgc) _bgc = document.getElementById('bgfill'); if (!_bgc) return;
  const x = _bgc.getContext('2d'), sc = Math.max(ww / cw, wh / ch);
  x.drawImage(cv, (ww - cw * sc) / 2 * 96 / ww, (wh - ch * sc) / 2 * 96 / wh, cw * sc * 96 / ww, ch * sc * 96 / wh);
}

function start() {
  G.S = loadState();
  resize();
  window.addEventListener('resize', resize);
  refreshOrders();
  setTimeout(() => loadRest(true), 2500);      // 다른 시간대 배경은 시작한 뒤에 받음
  const tickSafe = () => { try { tick(); } catch (e) { if (window.__dbg) __dbg('TICK ' + (e && e.stack || e)); } }; tickSafe(); setInterval(tickSafe, 1000);
  document.getElementById('loading').remove();
  requestAnimationFrame(frame);
}

/* 출석 보상: 하루 첫 접속에 다이아, 연속 7일마다 보너스 */
function checkAttendance() {
  const S = G.S, d = todayKey(); S.attend = S.attend || { last: '', streak: 0 };
  if (S.attend.last === d) return;
  const y = todayKey(Date.now() - 864e5);
  S.attend.streak = S.attend.last === y ? S.attend.streak + 1 : 1; S.attend.last = d;
  const bonus = S.attend.streak % RULES.attendStreakEvery === 0 ? RULES.attendStreakBonus : 0, n = RULES.attendGems + bonus;
  S.gems += n; save(); G.dirty = true;
  toast(`출석 보상 다이아 +${n} (연속 ${S.attend.streak}일)`, 3500);
}
