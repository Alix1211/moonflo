// 문선농장 — 의뢰 게시판, 우체통
'use strict';

/* ---------- 의뢰 ---------- */
// 지금 만들 수 있는 꽃인가: 지금 퍼즐판에 나오는 꽃이거나, 이미 씨앗·꽃을 갖고 있거나 밭에 심어 둔 꽃
function flowerMakeable(id) {
  const S = G.S, panel = (G._gh && G._gh.kinds) ? G._gh.kinds().map(i => FLOWERS[i].id) : FLOWERS.slice(0, openKinds()).map(f => f.id);
  return panel.includes(id) || (S.seeds[id] || 0) > 0 || (S.flowers[id] || 0) > 0 || S.beds.some(b => b.some(c => c && c.f === id && (c.s === 'seed' || c.s === 'bud' || c.s === 'bloom')));
}
function makeOrder() {
  // 빨리 자라는 꽃이 더 자주 나옴. 의뢰는 지금 만들 수 있는 꽃만 요구함
  const open = openKinds(), first = (G.S.stats.orders || 0) < 3;       // 처음 3건은 처음 받은 씨앗(튤립·데이지·해바라기)으로 쉽게
  let pool = first ? Object.keys(RULES.startSeeds).map(id => FLOWER[id]) : FLOWERS.slice(0, open).flatMap((f, i) => Array(open - i).fill(f)).filter(f => flowerMakeable(f.id));
  if (!pool.length) pool = FLOWERS.slice(0, open);
  // 의뢰 종류: 보통 / 큰 주문(한 가지 꽃을 많이) / 모둠 주문(두 가지를 넉넉히). 큰 주문·모둠 주문은 값이 조금 더 후함
  const roll = first ? 1 : Math.random(), type = roll < RULES.bigOrderChance ? 'big' : roll < RULES.bigOrderChance + RULES.mixOrderChance ? 'mix' : 'normal';
  const kinds = type === 'big' ? 1 : type === 'mix' ? 2 : (first || Math.random() < .55 ? 1 : 2), need = {};
  while (Object.keys(need).length < kinds) {
    const f = pool[Math.floor(Math.random() * pool.length)];
    if (!need[f.id]) need[f.id] = first ? 2 : type === 'big' ? 6 + Math.floor(Math.random() * 3) : type === 'mix' ? 4 + Math.floor(Math.random() * 2) : 2 + Math.floor(Math.random() * 3);
  }
  let v = 0; for (const id in need) v += need[id] * flowerPrice(id);
  const mult = type === 'big' ? RULES.bigOrderMult : type === 'mix' ? RULES.mixOrderMult : 1;
  const o = { need, coins: Math.max(10, Math.round(v * mult / 5) * 5), id: Date.now() + Math.random(), say: orderLine() };
  if (type !== 'normal') o.tag = type === 'big' ? '큰 주문' : '모둠 주문';
  return o;
}
// 꽃 한 송이 값: 자라는 시간이 길수록 비쌈
function flowerPrice(id) { const f = FLOWER[id]; return 5 + Math.round((f.grow[0] + f.grow[1]) * 2); }
// 일반 의뢰 사연 (어디서 왜 주문했는지 한 줄)
const ORDER_LINES = [
  '동네 꽃집 「봄날」에서 주문이 들어왔어요.', '다음 주에 작은 결혼식이 있대요. 부케에 쓸 꽃이래요.', '시장 떡집 사장님이 개업 3주년 화분을 부탁하셨어요.',
  '초등학교 선생님이 교실 창가에 둘 꽃을 찾으세요.', '옆 마을 카페에서 테이블 꽃을 주문했어요.', '할머니 생신 잔치에 쓸 꽃이래요.',
  '병원 로비에 둘 꽃을 부탁받았어요.', '주말 플리마켓에 내놓을 꽃이 필요하대요.', '동네 도서관에서 열람실을 꾸민대요.',
  '첫 데이트에 들고 갈 꽃을 찾는 청년이 있어요.', '빵집 진열대 옆에 둘 꽃을 주문했어요.', '이사 온 이웃이 집들이 꽃을 부탁했어요.',
  '유치원 졸업식 꽃다발 주문이에요.', '사진관에서 가족사진 배경에 쓸 꽃이래요.', '동네 미용실이 새 단장을 했대요.',
  '교회 주일 강단 꽃 주문이 들어왔어요.', '작은 음악회 무대를 꾸민대요.', '은퇴하시는 우체국장님께 드릴 꽃이래요.',
  '꽃꽂이 교실에서 수업용 꽃을 찾아요.', '식당 창가 자리에 둘 꽃을 부탁했어요.', '돌잔치 테이블 장식 주문이에요.',
  '요양원 어르신들 방에 둘 꽃이래요.', '동창회 모임 자리에 놓을 꽃이에요.', '마을 축제 포토존을 꾸민대요.',
  '꽃집 「달빛 꽃방」에서 급하게 연락이 왔어요.', '오랜만에 고향에 오는 딸을 위한 꽃이래요.', '결혼기념일 깜짝 선물이래요. 비밀이에요!',
  '새로 연 서점 입구를 꾸민대요.', '병문안 갈 때 들고 갈 꽃이래요.', '동네 공방에서 드라이플라워를 만든대요.',
];
const orderLine = () => ORDER_LINES[Math.floor(Math.random() * ORDER_LINES.length)];
const ordersMax = () => RULES.ordersPerDay;
const orderGapMin = () => RULES.orderGapMin[Math.min(G.S.beds.length, RULES.orderGapMin.length) - 1];   // 화단이 늘수록 새 의뢰가 더 자주 옴
function refreshOrders() {
  const S = G.S, d = todayKey();
  if (S.day !== d) { S.day = d; S.doneToday = 0; S.orders = []; S.nextOrderAt = 0; }
  let add = false; const now = Date.now();
  if (S.orderReset !== 1) {                         // 한 번만: 쌓여 있던 의뢰를 비우고 새로 채움 (납품한 건수·돈은 그대로)
    S.orderReset = 1; S.orders = [];
    while (S.orders.length < RULES.orderSlots && S.doneToday + S.orders.length < ordersMax()) S.orders.push(makeOrder());
    S.nextOrderAt = now + orderGapMin() * MIN; add = true;
  }
  // 아직 안 열린 꽃이 필요한 예전 의뢰는 열린 꽃 의뢰로 바꿔 줌 (이미 그 꽃을 갖고 있어 납품할 수 있으면 그대로 둠)
  const open = openKinds();
  // 안 열렸거나 지금은 만들 수 없는 꽃을 요구하는 의뢰도 바꿔 줌 (이미 납품할 수 있거나, 씨앗·꽃·심어 둔 것이 있으면 그대로 둠)
  S.orders = S.orders.map(o => {
    const bad = Object.keys(o.need).some(id => FLOWERS.findIndex(f => f.id === id) >= open || !flowerMakeable(id));
    if (!bad || canDeliver(o)) return o;
    add = true; return makeOrder();
  });
  // 의뢰는 쌓임: 자리를 비운 동안 지나간 시간만큼 (간격마다 1건씩) 게시판 칸이 찰 때까지 한꺼번에 들어옴
  let t = S.nextOrderAt || now;
  while (S.orders.length < RULES.orderSlots && S.doneToday + S.orders.length < ordersMax() && now >= t) { S.orders.push(makeOrder()); t += orderGapMin() * MIN; add = true; }
  if (add || !S.nextOrderAt) S.nextOrderAt = t;
  if (add) { save(); G.dirty = true; }
  refreshSpecial(); maybeHintMail();
}
function canDeliver(o) { for (const id in o.need) if ((G.S.flowers[id] || 0) < o.need[id]) return false; return true; }
function deliver(o) {
  if (!G.S.orders.includes(o) || !canDeliver(o)) return;   // 빠르게 여러 번 눌러도 한 번만 납품
  for (const id in o.need) G.S.flowers[id] -= o.need[id];
  const cb = Math.round(o.coins * bonus('coin')); if (cb) toast(`소품 덕분에 돈 +${cb}`);
  G.S.coins += o.coins + cb; G.S.doneToday++; G.S.stats.orders = (G.S.stats.orders || 0) + 1;
  const mis = (G.S.mission = G.S.mission && G.S.mission.day === G.S.day ? G.S.mission : { day: G.S.day, done: false });
  if (!mis.done && G.S.doneToday >= RULES.missionOrders) { mis.done = true; G.S.gems += RULES.missionGems; setTimeout(() => toast(`오늘의 미션 완료! 다이아 +${RULES.missionGems}`, 3000), 2400); }
  G.S.orders = G.S.orders.filter(x => x !== o);
  refreshOrders(); save(); toast(`납품 완료! 돈 +${o.coins}`);
  if (typeof buddyReact === 'function') buddyReact('꽃 배달 다녀왔어요!', 'po_basket'); else if (typeof buddyCheer === 'function') buddyCheer();
}
function openOrders() {
  refreshOrders();
  openPopup({
    title: `의뢰 게시판  (오늘 ${G.S.doneToday}/${ordersMax()})`, big: 'laugh',
    draw(r) {
      this.btns = [];
      const list = G.S.orders;
      if (!list.length) { text(G.S.doneToday >= ordersMax() ? '오늘 의뢰는 모두 끝났어요. 내일 새 의뢰가 와요.' : `새 의뢰를 기다리는 중이에요. (${Math.max(1, Math.ceil(((G.S.nextOrderAt || 0) - Date.now()) / MIN))}분 뒤)`, r[0] + r[2] / 2, r[1] + r[3] / 2, 40, '#8a6a44', 'center'); return; }
      // 한 화면에 3칸 크기로 보이고, 의뢰가 더 많으면 밀어서 봄
      if (G.S.owned.p_n5) {                            // 노란 새(소품): 게시판 맨 위에 지금 가진 꽃 수를 늘 보여 줌
        const pd = G.mode === 'pad', SH = pd ? 74 : 96, fl = FLOWERS.slice(0, openKinds()), bw = SH * 1.1, iw = (r[2] - bw) / fl.length;
        rrect(r[0], r[1], r[2], SH, SH / 2); ctx.fillStyle = 'rgba(255,240,200,.85)'; ctx.fill();
        if (G.img.prop_n5) imgFit(G.img.prop_n5, r[0] + bw / 2, r[1] + SH / 2, SH * 1.05);
        const need = orderNeed();
        fl.forEach((f, i) => { const cx = r[0] + bw + iw * i + iw / 2, n = G.S.flowers[f.id] || 0, nd = need[f.id] || 0;
          imgFit(G.img[`flower_${f.id}_bloom`], cx - iw * .2, r[1] + SH / 2, Math.min(SH * .8, iw * .5));
          text(nd ? `${n}/${nd}` : String(n), cx + iw * .2, r[1] + SH / 2 + 2, pd ? 26 : 30, nd ? (n >= nd ? '#4f7d2c' : '#c0522c') : '#b8a07a', 'center'); });
        r = [r[0], r[1] + SH + 14, r[2], r[3] - SH - 14];
      }
      const GAP = 26, RH = (r[3] - GAP * 2) / 3, total = list.length * RH + (list.length - 1) * GAP;
      scrollBegin(this, r, total);
      list.forEach((o, i) => {
        const rc = [r[0], r[1] + i * (RH + GAP), r[2], RH], ok = canDeliver(o); card(rc, ok);
        const [x, y, w, h] = rc; let cx = x + 40;
        if (!o.say) o.say = orderLine();
        const ls = G.mode === 'pad' ? 26 : 28; text(o.say, x + 30, y + ls * .95, ls, '#8a6a44', 'left', false, 500);
        const pdm = G.mode === 'pad', s = pdm ? Math.min(h * .6, 100) : Math.min(h * .52, 110);
        for (const id in o.need) {
          const have = G.S.flowers[id], lab = `${FLOWER[id].name} ${G.S.owned.p_n5 ? have : Math.min(have, o.need[id])}/${o.need[id]}`, col = have >= o.need[id] ? '#4f7d2c' : '#8a6a44';
          if (pdm) {                                   // 패드: 그림 오른쪽에 이름 (세로 공간이 좁아서)
            imgFit(G.img[`flower_${id}_bloom`], cx + s / 2, y + h * .6, s);
            text(lab, cx + s + 8, y + h * .62, 30, col, 'left'); ctx.font = font(30); cx += s + 30 + ctx.measureText(lab).width;
          } else {
            imgFit(G.img[`flower_${id}_bloom`], cx + s / 2, y + h * .56 - 10, s);
            text(lab, cx + s / 2, y + h - 30, 30, col, 'center'); cx += s + 60;
          }
        }
        drawCoin(x + w - 350, y + h / 2, 22); text(`+${o.coins}`, x + w - 318, y + h / 2 + 2, 42, '#b07a12');
        if (o.tag) text(o.tag, x + w - 225, y + ls * .95, ls, '#c0522c', 'right', false, 700);        // 큰 주문 / 모둠 주문 표시
        const br = [x + w - 200, y + h / 2 - 60, 170, 120];
        button(br, '납품', { disabled: !ok, size: 42 });
        const hit = scrollHit(this, r, br); if (hit) this.btns.push({ rect: hit, disabled: !ok, fn: () => deliver(o) });
      });
      scrollEnd(this, r);
    },
  });
}

/* ---------- 우체통 ---------- */
// 편지는 나중에 구글 시트에서 받아 옴. 지금은 저장된 편지만 보여 줌.
function openMail() {
  let open = null, writing = false, sent = '', gifting = null;
  if (window.pullMails) pullMails();
  openPopup({
    title: '우체통', big: 'smile', vals: {},
    fields(r) { return writing ? [{ key: 'reply', multi: true, rect: [r[0], r[1] + 20, r[2], G.mode === 'pad' ? 250 : 600], size: G.mode === 'pad' ? 38 : 44, ph: '여기를 눌러 편지를 적어 주세요. 키보드의 마이크로 말해도 돼요' }] : null; },
    draw(r) {
      this.btns = [];
      const list = G.S.mails;
      if (writing) {
        const pd = G.mode === 'pad', by = pd ? r[1] + 300 : r[1] + 660, bw = (r[2] - 20) / 2;
        const b1 = [r[0], by, bw, 120], b2 = [r[0] + bw + 20, by, bw, 120];
        button(b1, '보내기', { size: 46 }); this.btns.push({ rect: b1, fn: async () => {
          const t = ((this.vals && this.vals.reply) || '').trim(); if (!t) { toast('먼저 편지를 적어 주세요'); return; }
          const ok = await sendReply(t); writing = false; this.vals = {}; sent = ok ? '편지를 보냈어요' : '보냈어요 (인터넷이 되면 전해져요)'; toast(sent, 3000); G.dirty = true; } });
        button(b2, '그만두기', { size: 46 }); this.btns.push({ rect: b2, fn: () => { writing = false; } });
        return;
      }
      if (gifting) {                                   // 선물 보내기: 골드·꽃 고르기 (하루 3번, 30분 뒤 도착)
        const [x, y, w, h] = r, pd = G.mode === 'pad', fs = pd ? 34 : 40, gl = giftLimits();
        const tot = Object.values(gifting.fl).reduce((a, b) => a + b, 0);
        text(`오늘 보낼 수 있는 선물 ${giftLeft()}번 · 30분 뒤 도착해요`, x, y + 20, fs - 4, '#9b7148');
        text('골드', x, y + 20 + fs * 1.8, fs, '#6e4b28');
        [0, 100, 300, 500].forEach((c, i) => { const bw = (w - 140 - 3 * 14) / 4, rc = [x + 140 + i * (bw + 14), y + 20 + fs * 1.1, bw, fs * 1.6], dis = c > G.S.coins;
          button(rc, c ? String(c) : '없음', { size: fs - 4, active: gifting.coins === c, disabled: dis }); this.btns.push({ rect: rc, disabled: dis, fn: () => { gifting.coins = c; } }); });
        text(`꽃 (눌러서 한 송이씩 · ${tot}/${gl.flowers})`, x, y + 20 + fs * 3.6, fs, '#6e4b28');
        const fl = FLOWERS.filter(f => (G.S.flowers[f.id] || 0) > 0), cols = pd ? 6 : 4, gap = 12, cw = (w - gap * (cols - 1)) / cols, ch = pd ? 120 : 150, fy = y + 20 + fs * 4.4;
        if (!fl.length) text('보낼 꽃이 없어요', x, fy + 40, fs - 4, '#b89a72');
        fl.slice(0, cols * 2).forEach((f, i) => { const rc = [x + (i % cols) * (cw + gap), fy + Math.floor(i / cols) * (ch + gap), cw, ch], n = gifting.fl[f.id] || 0;
          card(rc, n > 0); imgFit(G.img[`flower_${f.id}_bloom`], rc[0] + cw / 2, rc[1] + ch * .4, ch * .55);
          text(n ? `${n} / ${G.S.flowers[f.id]}` : String(G.S.flowers[f.id]), rc[0] + cw / 2, rc[1] + ch * .85, fs - 8, n ? '#c0522c' : '#8a6a44', 'center');
          this.btns.push({ rect: rc, fn: () => { if (tot < gl.flowers && n < G.S.flowers[f.id]) gifting.fl[f.id] = n + 1; else toast(tot >= gl.flowers ? `꽃은 한 번에 ${gl.flowers}송이까지예요` : '가진 꽃을 다 담았어요'); } }); });
        const by = pd ? y + h - 110 : fy + 2 * (ch + gap) + 30, bw = (w - 40) / 3, bh = pd ? 100 : 120;   // 폰은 큰 달해에 가리지 않게 위로
        const b1 = [x, by, bw, bh], b2 = [x + bw + 20, by, bw, bh], b3 = [x + (bw + 20) * 2, by, bw, bh], can = (gifting.coins || tot) && giftLeft() > 0;
        button(b1, '보내기', { size: fs, disabled: !can }); this.btns.push({ rect: b1, disabled: !can, fn: async () => {
          const ok = await sendGift(gifting.coins, gifting.fl, `${RULES.mailFrom || ''}의 선물이에요`); gifting = null;
          toast(ok ? '선물을 보냈어요! 30분 뒤에 도착해요' : '선물을 보내지 못했어요', 3200); G.dirty = true; } });
        button(b2, '꽃 비우기', { size: fs }); this.btns.push({ rect: b2, fn: () => { gifting.fl = {}; } });
        button(b3, '그만두기', { size: fs }); this.btns.push({ rect: b3, fn: () => { gifting = null; } });
        return;
      }
      if (open) {
        const [x, y, w] = r;
        text(open.from || '', x, y + 30, 38, '#9b7148');
        wrap(open.body || '', x, y + 100, w, 44, '#5c3d1e');
        const back = [x, r[1] + r[3] - 110, 260, 100];
        button(back, '목록', { size: 40 }); this.btns.push({ rect: back, fn: () => { open = null; } });
        const o = open.offer;
        if (o) {
          const ii = { can2: 'it_can', can4: 'it_can2', glove2: 'it_glove', glove4: 'it_glove2' }[open.id], iim = ii && G.img[ii];
          if (iim) { const ih = 190, iw = ih * iim.width / iim.height; ctx.drawImage(iim, x + w * .52 - iw / 2, r[1] + r[3] - 205 - ih / 2, iw, ih); }
          text(o.name, x, r[1] + r[3] - 300, 48, '#6e4b28');
          drawCoin(x + 26, r[1] + r[3] - 230, 24); text(String(o.cost), x + 66, r[1] + r[3] - 228, 44, '#b07a12');
          const owned = !!G.S.owned[open.id], can = !owned && G.S.coins >= o.cost;
          const br = [r[0] + r[2] - 330, r[1] + r[3] - 290, 330, 170];
          button(br, owned ? '구매 완료' : '구매', { disabled: !can, size: 46 });
          this.btns.push({ rect: br, disabled: !can, fn: () => buy(open) });
        }
        const so = open.sorder;
        if (so) {
          const sp = SPECIAL[so.sp], done = !!so.done, have = (G.S.sflowers && G.S.sflowers[so.sp]) || 0, ok = !done && have >= 1, cy = r[1] + r[3] - 215;
          drawHalo(x + 90, cy, 100, sp.hue); imgFit(G.img[`flower_${baseId(sp.id)}_bloom`], x + 90, cy, 120);
          text(`「${sp.name}」 ${Math.min(have, 1)}/1`, x + 210, cy - 34, 40, ok ? '#4f7d2c' : '#6e4b28');
          drawCoin(x + 226, cy + 34, 22); text(`+${so.coins}`, x + 262, cy + 36, 40, '#b07a12');
          if (so.gems) { drawGem(x + 420, cy + 34, 22); text(`+${so.gems}`, x + 456, cy + 36, 40, '#2a8aa8'); }
          const br = [r[0] + r[2] - 330, r[1] + r[3] - 290, 330, 170];
          button(br, done ? '납품 완료' : '납품', { disabled: !ok, size: 46 });
          this.btns.push({ rect: br, disabled: !ok, fn: () => deliverSpecial(open) });
        }
        const gf = open.gift;
        if (gf) {
          const got = !!(G.S.claimed && G.S.claimed[open.id]);
          text('선물', x, r[1] + r[3] - 300, 48, '#6e4b28');
          text(giftText(gf), x, r[1] + r[3] - 226, 40, '#b07a12');
          const br = [r[0] + r[2] - 330, r[1] + r[3] - 290, 330, 170];
          button(br, got ? '받았어요' : '받기', { disabled: got, size: 46 });
          this.btns.push({ rect: br, disabled: got, fn: () => claimGift(open) });
        }
        return;
      }
      if (window.mailReady && mailReady()) {
        const gr = window.giftReady && giftReady(), bw = gr ? (r[2] - 20) / 2 : r[2], wb = [r[0], r[1] + r[3] - 100, bw, 100];
        button(wb, '편지 쓰기', { size: 42 }); this.btns.push({ rect: wb, fn: () => { writing = true; this.vals = {}; } });
        if (gr) { const gb = [r[0] + bw + 20, r[1] + r[3] - 100, bw, 100], left = giftLeft();
          button(gb, left ? `선물 보내기 (${left})` : '선물은 내일 또', { size: 42, disabled: !left }); this.btns.push({ rect: gb, disabled: !left, fn: () => { gifting = { coins: 0, fl: {} }; } }); }
      }
      if (!list.length) { text('아직 온 편지가 없어요', r[0] + r[2] / 2, r[1] + r[3] / 2, 44, '#8a6a44', 'center'); return; }
      gridRects([r[0], r[1], r[2], Math.min(r[3] - 120, 6 * 150)], 1, 6, 16).forEach((rc, i) => {
        const m = list[list.length - 1 - i]; if (!m) return;
        card(rc, !m.read);
        text(`${m.read ? '' : '● '}${m.from || ''}${m.offer ? '  · ' + m.offer.name : ''}${m.sorder ? (m.sorder.done ? '  · 납품 완료' : '  · 특수 의뢰') : ''}${m.gift ? (G.S.claimed && G.S.claimed[m.id] ? '  · 선물 받음' : '  · 선물') : ''}`, rc[0] + 30, rc[1] + rc[3] / 2, 38, m.read ? '#8a6a44' : '#c0522c');
        this.btns.push({ rect: rc, fn: () => { open = m; if (!m.read) { m.read = true; save(); } } });
      });
    },
  });
}
function buy(mail) {
  const o = mail.offer; if (!o || G.S.owned[mail.id] || G.S.coins < o.cost) return;
  G.S.coins -= o.cost; G.S.owned[mail.id] = true;
  if (o.kind === 'can') G.S.can = Math.max(G.S.can, o.v);
  if (o.kind === 'glove') G.S.glove = Math.max(G.S.glove, o.v);
  if ((o.kind === 'can' || o.kind === 'glove') && o.v === 2) setTimeout(() => {
    const both = G.S.can >= 2 && G.S.glove >= 2;
    toast(o.kind === 'can' ? '이제 손가락을 쓸어서 여러 칸에 물을 줄 수 있어요!' : '이제 손가락을 쓸어서 여러 송이를 거둘 수 있어요!', 4200);
    if (both) setTimeout(() => toast('도구가 다 모였어요! 땅 갈기와 심기도 쓸어서 할 수 있어요', 4200), 4400);
  }, 900);
  if (o.kind === 'bed' && G.S.beds.length < RULES.maxBeds) { G.S.beds.push(Array.from({ length: 16 }, () => ({ s: 'empty' }))); if (G.screens.garden && G.screens.garden.invalidate) G.screens.garden.invalidate(); refreshOrders(); }
  save(); toast(`${o.name} 구매 완료!`);
}
function wrap(str, x, y, w, size, color) {
  str = str == null ? '' : String(str);   // 시트에서 숫자 등이 와도 멈추지 않게
  ctx.font = font(size, 500); let line = '', yy = y;
  for (const ch of str) {
    if (ch === '\n' || ctx.measureText(line + ch).width > w) { text(line, x, yy, size, color, 'left', false, 500); yy += size * 1.5; line = ch === '\n' ? '' : ch; }
    else line += ch;
  }
  if (line) text(line, x, yy, size, color, 'left', false, 500);
}

/* ---------- 편지 선물: 돈·다이아·씨앗을 붙여 보낼 수 있음 (gift: { coins, gems, seeds: { tulip: 3 } }) ---------- */
function giftText(g) {
  const p = [];
  if (g.hint) p.push(`연구 힌트 ${g.hint}`); if (g.coins) p.push(`돈 ${g.coins}`); if (g.gems) p.push(`다이아 ${g.gems}`);
  for (const id in (g.seeds || {})) p.push(`${FLOWER[id] ? FLOWER[id].name : id} 씨앗 ${g.seeds[id]}`);
  for (const id in (g.flowers || {})) p.push(`${FLOWER[id] ? FLOWER[id].name : id} ${g.flowers[id]}송이`);
  for (const id in (g.items || {})) { const h = HG.find(x => x.id === id); p.push(`${h ? h.name : id} ${g.items[id]}`); }
  return p.join(' · ') || '선물';
}
function claimGift(mail) {
  const g = mail.gift, S = G.S; if (!g) return;
  S.claimed = S.claimed || {}; if (S.claimed[mail.id]) return;
  S.claimed[mail.id] = true;
  S.coins += g.coins || 0; S.gems += g.gems || 0;
  let hm = ''; for (let i = 0; i < (g.hint || 0); i++) hm += giveHint();
  for (const id in (g.seeds || {})) S.seeds[id] = (S.seeds[id] || 0) + g.seeds[id];
  for (const id in (g.flowers || {})) S.flowers[id] = (S.flowers[id] || 0) + g.flowers[id];
  for (const id in (g.items || {})) addItem(id, g.items[id]);
  save(); G.dirty = true; toast(`선물을 받았어요! ${giftText(g)}${hm}`, hm ? 4200 : 2200);
}

/* ---------- 모래시계: 인벤토리에 모아 두었다가 원할 때 사용 ---------- */
const HG = [{ id: 'hg_10', min: 10, name: '모래시계 10분', cost: 3 }, { id: 'hg_30', min: 30, name: '모래시계 30분', cost: 6 },
            { id: 'hg_60', min: 60, name: '모래시계 1시간', cost: 10 }, { id: 'hg_360', min: 360, name: '모래시계 6시간', cost: 50 }];
const itemCount = id => (G.S.items && G.S.items[id]) || 0;
function addItem(id, n) { G.S.items = G.S.items || {}; G.S.items[id] = itemCount(id) + n; }
function useHourglass(h) {
  if (itemCount(h.id) < 1) return false;
  const cells = []; for (const bed of G.S.beds) for (const c of bed) if (c.wet && c.until) cells.push(c);
  if (!cells.length) { toast('자라는 꽃이 없어요'); return false; }
  G.S.items[h.id]--; cells.forEach(c => { c.until -= h.min * MIN; });
  if (G.screens.garden && G.screens.garden.invalidate) G.screens.garden.invalidate();
  save(); G.dirty = true; toast(`자라는 꽃 ${cells.length}칸이 ${h.name.replace('모래시계 ', '')} 줄었어요`); return true;
}

/* ---------- 특수 의뢰: 메일로 옴. 특수 꽃 한 송이를 납품 ---------- */
function flowerGrow(id) { const f = FLOWER[id]; const g = f ? f.grow : FUTURE_GROW[id]; return g[0] + g[1]; }
function spBase(sp) { let v = 0; for (const t of sp.ing) { const [k, id] = t.split(':'); v += k === 'sp' ? spBase(SPECIAL[id]) : flowerGrow(id); } return v; }
function spReward(sp) { return { coins: Math.max(3, Math.round(spBase(sp) / 6)) * 10 * RULES.specialMult[sp.grade], gems: RULES.specialGems[sp.grade] }; }
function spOpen(sp) { const n = openKinds(); return sp.ing.every(t => { const [k, id] = t.split(':'); return k === 'sp' ? spOpen(SPECIAL[id]) : FLOWERS.findIndex(f => f.id === id) < n && FLOWERS.findIndex(f => f.id === id) >= 0; }); }
function spMakeable(sp) { return sp.ing.every(t => { const [k, id] = t.split(':'); return k === 'sp' ? spMakeable(SPECIAL[id]) : !!FLOWER[id]; }); }
function refreshSpecial() {
  const S = G.S, d = todayKey(), now = Date.now();
  // 안 열린 꽃이 재료인 예전 특수 의뢰는 정리 (이미 그 꽃씨·꽃을 갖고 있거나 발견한 것이면 그대로 둠)
  S.sseeds = S.sseeds || {}; S.sflowers = S.sflowers || {}; S.found = S.found || {};
  const before = S.mails.length;
  S.mails = S.mails.filter(m => !m.sorder || m.sorder.done || !SPECIAL[m.sorder.sp] || spOpen(SPECIAL[m.sorder.sp]) || S.found[m.sorder.sp] || (S.sseeds[m.sorder.sp] || 0) > 0 || (S.sflowers[m.sorder.sp] || 0) > 0);
  if (S.mails.length !== before) { save(); G.dirty = true; }
  if (S.spDay !== d) { S.spDay = d; S.spCount = 0; S.nextSpAt = 0; }
  if (S.beds.length < RULES.specialFromBeds || S.spCount >= RULES.specialPerDay || now < (S.nextSpAt || 0)) return;
  const open = S.mails.filter(x => x.sorder && !x.sorder.done);
  if (open.length >= RULES.specialOpen) return;
  const pool = SPECIALS.filter(s => s.id !== 'sp40' && spMakeable(s) && spOpen(s) && s.grade <= S.beds.length && !open.some(x => x.sorder.sp === s.id));   // 열린 꽃으로 만들 수 있고, 밭 수만큼의 등급까지만
  if (!pool.length) return;
  const sp = pool[Math.floor(Math.random() * pool.length)], [who, req] = SPECIAL_STORY[sp.id], rw = spReward(sp);
  S.mails.push({ id: 'so_' + now, from: who, body: `안녕하세요, ${who}입니다.\n${req}\n「${sp.name}」 한 송이를 부탁드립니다.`, read: false, sorder: { sp: sp.id, coins: rw.coins, gems: rw.gems } });
  S.spCount++; S.nextSpAt = now + RULES.specialGapMin * MIN; save(); G.dirty = true; toast('특수 의뢰 편지가 왔어요');
}
function deliverSpecial(mail) {
  const so = mail.sorder, S = G.S; if (!so || so.done) return;
  S.sflowers = S.sflowers || {}; if ((S.sflowers[so.sp] || 0) < 1) return;
  S.sflowers[so.sp]--; so.done = true; S.coins += so.coins; S.gems += so.gems || 0;
  const hm = giveHint(); save(); G.dirty = true; toast(`납품 완료! 돈 +${so.coins}${so.gems ? ' · 다이아 +' + so.gems : ''}${hm}`, 4200);
}

/* ---------- 특수꽃을 일반 꽃처럼 다루는 도우미 ---------- */
function spBaseFlower(sp) { for (const t of sp.ing) { const [k, id] = t.split(':'); if (k === 'sp') { const b = spBaseFlower(SPECIAL[id]); if (FLOWER[b]) return b; } else if (FLOWER[id]) return id; } return sp.ing[0].split(':')[1]; }
function spGrow(sp) { let a = 0, b = 0; for (const t of sp.ing) { const [k, id] = t.split(':'), g = k === 'sp' ? spGrow(SPECIAL[id]) : (FLOWER[id] ? FLOWER[id].grow : FUTURE_GROW[id]); a = Math.max(a, g[0]); b = Math.max(b, g[1]); } return [a, b]; }
function FD(id) {             // 꽃 또는 특수꽃의 정보 (이름·자라는 시간·색)
  if (FLOWER[id]) return FLOWER[id];
  const sp = SPECIAL[id]; if (!sp) return FLOWERS[0];
  return sp._fd || (sp._fd = { id, name: sp.name, grow: spGrow(sp), color: `hsl(${sp.hue},90%,70%)` });
}
const baseId = id => SPECIAL[id] ? spBaseFlower(SPECIAL[id]) : id;
const seedN = id => SPECIAL[id] ? ((G.S.sseeds || {})[id] || 0) : (G.S.seeds[id] || 0);
const takeSeed = id => { if (SPECIAL[id]) G.S.sseeds[id]--; else G.S.seeds[id]--; };
function addBloom(id, n) { if (SPECIAL[id]) { G.S.sflowers = G.S.sflowers || {}; G.S.sflowers[id] = (G.S.sflowers[id] || 0) + n; } else G.S.flowers[id] += n; }

/* ---------- 연구 힌트: 아직 못 만든 특수 꽃씨의 재료를 하나씩 알려 줌 (소품 구매·특수 의뢰 납품·요정 편지) ---------- */
function tokName(t) { const [k, id] = t.split(':'); return k === 'sp' ? SPECIAL[id].name + ' 꽃씨' : (FLOWER[id] ? FLOWER[id].name : id) + (k === 'seed' ? ' 씨앗' : ' 꽃'); }
function hintPool() { const S = G.S; S.hints = S.hints || {}; S.found = S.found || {}; return SPECIALS.filter(s => !S.found[s.id] && (S.hints[s.id] || 0) < 3 && spOpen(s)); }
function giveHint() {
  const S = G.S, pool = hintPool(); if (!pool.length) return '';
  const low = Math.min(...pool.map(s => s.grade)), c = pool.filter(s => s.grade <= low + 1), sp = c[Math.floor(Math.random() * c.length)];
  const n = (S.hints[sp.id] || 0) + 1; S.hints[sp.id] = n;
  return `\n힌트: 어떤 꽃씨의 재료 「${tokName(sp.ing[n - 1])}」`;
}
function maybeHintMail() {
  const S = G.S, k = todayKey(); if (S.hintMailDay === k) return; S.hintMailDay = k;
  if (Math.random() > .5 || !hintPool().length) return;
  S.mails.push({ id: 'hm_' + k, from: '시간의 요정', body: '요정이 쪽지를 두고 갔어요.\n연구에 쓸 수 있는 힌트가 들어 있어요.', read: false, gift: { hint: 1 } });
  toast('우체통에 새 편지가 왔어요');
}
