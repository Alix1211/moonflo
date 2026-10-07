// 문선농장 — 상점: 마을 가게 안. 농장 물건·꾸미기 소품을 돈으로 사고, 산 소품은 정원·방·온실 정해진 자리에 놓임
'use strict';

/* ---------- 놓인 소품 (정원·방·온실 화면이 부름) ---------- */
function decorKey() { return JSON.stringify(G.S.decor); }
function drawDecor(place) {
  const slots = DECOR_SLOTS[G.mode][place], list = (G.S.decor && G.S.decor[place]) || [];
  for (const id in PROP_SPECIAL) { const j = list.indexOf(id); if (j >= 0) list.splice(j, 1); }   // 특별 소품(노란 새)은 자리에 놓지 않음 — 게시판 위에 따로 나옴
  slots.forEach((sl, i) => {
    if (!list[i] || !PROP[list[i]]) return; const im = G.img['prop_' + list[i]]; if (!im) return;
    const sc = PROP[list[i]].sc || 1, k = Math.min(sl.w * sc / im.width, sl.h * sc / im.height), w = im.width * k, h = im.height * k;
    ctx.drawImage(im, sl.x - w / 2, sl.a === 'b' ? sl.y - h : sl.y - h / 2, w, h);
  });
}
function decorRect(place, id) {   // 놓인 소품의 화면 자리(없으면 null)
  const list = (G.S.decor && G.S.decor[place]) || [], i = list.indexOf(id); if (i < 0) return null; const sl = DECOR_SLOTS[G.mode][place][i]; if (!sl) return null;
  return [sl.x - sl.w / 2, sl.a === 'b' ? sl.y - sl.h : sl.y - sl.h / 2, sl.w, sl.h];
}
function decorSlots(p) {           // 이 소품이 들어갈 수 있는 자리 번호들 (방은 벽걸이 2자리가 따로)
  const n = DECOR_COUNT[p.place], all = Array.from({ length: n }, (_, i) => i);
  if (p.place === 'room') return p.wall ? all.slice(4) : all.slice(0, 4);
  return all;
}
const isPlaced = id => (G.S.decor[PROP[id].place] || []).includes(id);
function placeProp(id) {
  const p = PROP[id], list = G.S.decor[p.place];
  if (list.includes(id)) return true;
  const i = decorSlots(p).find(k => !list[k]); if (i === undefined) return false;
  list[i] = id; save(); G.dirty = true; return true;
}
function removeProp(id) {
  const list = G.S.decor[PROP[id].place], i = list.indexOf(id);
  if (i >= 0) { list[i] = null; save(); G.dirty = true; }
}

/* ---------- 상점 화면 ---------- */
(() => {
  const TABS = ['정원', '방', '온실', '꾸미기', '다이아'];
  const IMG = { bed2: 'icon_garden', bed3: 'icon_garden', bed4: 'icon_garden', bed5: 'icon_garden', can2: 'it_can', can4: 'it_can2', glove2: 'it_glove', glove4: 'it_glove2' };
  const st = { tab: 0, scroll: 0, from: 'garden', line: '', talkUntil: 0, faceUntil: 0, face: 0, btns: [], drag: null, ownerRect: null, list: null, contentH: 0 };

  const say = (line, face = 1) => { st.line = line; st.face = face; st.talkUntil = Date.now() + 1300; st.faceUntil = Date.now() + 4500; G.dirty = true; };
  const isOwned = it => it.kind === 'prop' ? !!G.S.owned['p_' + it.id] : !!G.S.owned[it.id];

  // 가게별 물건 분류 (소품 id → 가게)
  const PROP_SHOP = {
    seed: ['n2', 'n3', 'n22', 'g3', 'g5', 'h11', 'h12', 'n13', 'h1', 'r7'],
    flower: ['n1', 'n10', 'n11', 'n23', 'n18', 'g4', 'r6', 'r12', 'n6', 'h6', 'h5', 'g8'],
    furniture: ['g1', 'g2', 'g7', 'g12', 'n4', 'n15', 'n16', 'n14', 'r2', 'r3', 'r10', 'r1', 'n8', 'h2', 'h3', 'h4', 'h8', 'h9', 'g10', 'g11', 'n24'],
  };
  const shopOf = id => Object.keys(PROP_SHOP).find(k => PROP_SHOP[k].includes(id)) || 'general';
  const SHOP_TABS = {
    seed: ['도구·화단', '정원', '방', '온실', '씨앗 교환'], flower: ['정원', '방', '온실'], furniture: ['정원', '방', '온실'], general: ['정원', '방', '온실', '꾸미기', '다이아'],
  };
  const tabs = () => SHOP_TABS[st.shop] || SHOP_TABS.general;
  function items() {
    const nm = tabs()[st.tab], out = [];
    const prop = place => PROPS.filter(p => p.place === place && shopOf(p.id) === st.shop).map(p => ({ kind: 'prop', id: p.id, name: p.name, cost: p.cost, img: 'prop_' + p.id }));
    const mails = kinds => SHOP_MAILS.filter(m => kinds.includes(m.item.kind)).map(m => ({ kind: 'mail', id: m.id, name: m.item.name, cost: m.cost, req: m.requires, img: IMG[m.id], k: m.item.kind, v: m.item.v || 0 }));
    if (nm === '도구·화단') return mails(['bed', 'can', 'glove']);
    if (nm === '씨앗 교환') return swapOpen().map(f => ({ kind: 'swap', id: f.id, name: f.name + ' 씨앗', img: `flower_${f.id}_seed`, sub: `가진 ${G.S.seeds[f.id] || 0}개` }));
    if (nm === '정원') return prop('garden');
    if (nm === '방') return prop('room');
    if (nm === '온실') return prop('gh');
    if (nm === '꾸미기') return mails(['outfit']).map(i => Object.assign(i, { tag: '옷' })).concat([{ kind: 'soon', id: 'deco_soon', name: '시계 틀 · 게시판 · 우체통', soon: true, tag: '곧 들어와요' }]);
    return HG.map(h => ({ kind: 'hg', id: h.id, name: h.name, cost: h.cost, gem: true, img: 'hg_' + h.min }));
  }

  function geo() {
    const W = G.L.W, H = G.L.H;
    if (G.mode === 'pad') {
      const s = Math.max(W / 1672, H / 941), ox = (W - 1672 * s) / 2, oy = (H - 941 * s) / 2;
      return { pad: true, bg: [ox, oy, 1672 * s, 941 * s], clip: null, panel: [173, 204, 1154, 765], tabs: { x: 188, y: 217, w: 215, h: 83, gap: 12 },
        list: [188, 319, 1122, 620], cols: 3, cw: 362, ch: 340, gap: 20, exit: [1070, 1001, 258, 115], mail: [783, 1001, 257, 115], money: [180, 1058],
        owner: { x: 1686, y: 1205, w: 660 }, bubble: [1440, 370, 448, 110], fs: 30 };
    }
    return { pad: false, bg: [-300, -10, 1505, 847], clip: [0, 0, W, 828], panel: [20, 828, 1180, 1377], tabs: { x: 33, y: 848, w: 222, h: 100, gap: 10 },
      list: [33, 970, 1150, 1194], cols: 2, cw: 565, ch: 440, gap: 20, exit: [638, 2340, 545, 155], mail: [33, 2340, 545, 155], money: [60, 2290],
      owner: { x: 900, y: 828, w: 780 }, bubble: [53, 600, 556, 140], fs: 32 };
  }

  function lockIcon(cx, cy, s) {
    ctx.save(); ctx.lineWidth = s * .14; ctx.strokeStyle = '#f3e6cf'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy - s * .16, s * .28, Math.PI, 0); ctx.lineTo(cx + s * .28, cy); ctx.moveTo(cx - s * .28, cy - s * .16); ctx.lineTo(cx - s * .28, cy); ctx.stroke();
    rrect(cx - s * .42, cy - s * .02, s * .84, s * .62, s * .12); ctx.fillStyle = '#f3e6cf'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy + s * .26, s * .09, 0, 7); ctx.fillStyle = '#7a5a36'; ctx.fill();
    ctx.restore();
  }

  function drawCard(g, it, x, y, w, h) {
    const own = isOwned(it), lock = !!(it.req && !G.S.owned[it.req]);
    card([x, y, w, h], own);
    const im = it.img && G.img[it.img], ib = [x + 24, y + 14, w - 48, h * (g.pad ? .33 : .38)];
    if (im) { const k = Math.min(ib[2] / im.width, ib[3] / im.height); ctx.drawImage(im, ib[0] + (ib[2] - im.width * k) / 2, ib[1] + (ib[3] - im.height * k) / 2, im.width * k, im.height * k); }
    else if (it.tag) text(it.tag, x + w / 2, ib[1] + ib[3] / 2, 46, '#b89a72', 'center');
    if (it.kind === 'prop' && (PROP_EFFECT[it.id] || PROP_SPECIAL[it.id])) {                         // 소품 능력 표시
      const t = propEffectText(it.id), fs = g.pad ? 22 : 26; ctx.font = font(fs, 700); const tw = ctx.measureText(t).width + 24, ty = ib[1] + ib[3] - fs - 6;
      rrect(x + w / 2 - tw / 2, ty, tw, fs + 12, (fs + 12) / 2); ctx.fillStyle = own ? 'rgba(90,150,80,.92)' : 'rgba(110,80,45,.85)'; ctx.fill();
      text(t, x + w / 2, ty + (fs + 12) / 2 + 1, fs, '#fff', 'center');
    }
    const nm = it.name.length > 9 ? 28 : 32;
    text(it.name, x + w / 2, y + h * (g.pad ? .47 : .55), nm, '#6e4b28', 'center');
    if (it.cost != null) { const cx = x + w / 2; const py = y + h * (g.pad ? .58 : .67); (it.gem ? drawGem : drawCoin)(cx - 40, py, it.gem ? 20 : 18); text(String(it.cost), cx - 14, py + 2, 34, '#b07a12'); }
    else if (it.sub) text(it.sub, x + w / 2, y + h * .67, 28, '#8a6a44', 'center');
    const br = [x + 24, y + h - 100, w - 48, 80];
    let label, dis = false, fn;
    if (it.soon) { label = '준비 중'; dis = true; }
    else if (it.kind === 'prop' && own && PROP_SPECIAL[it.id]) { label = it.id === 'console' ? '방에 있어요' : '게시판에 있어요'; dis = true; }
    else if (it.kind === 'prop' && own) { const pl = isPlaced(it.id); label = pl ? '치우기' : '놓기'; fn = () => { if (pl) { removeProp(it.id); say('치웠어요.', 0); } else if (placeProp(it.id)) say('잘 어울려요.', 2); else say('자리가 다 찼어요. 놓인 것을 먼저 치워 주세요.', 3); }; }
    else if (it.kind === 'swap') { label = '이걸로 바꾸기'; dis = !swapSources(it.id).length; fn = () => openSwap(it); }
    else if (it.kind === 'hg') { label = '구매'; dis = G.S.gems < it.cost; fn = () => buyHourglass(it); }
    else if (own) { label = '구매 완료'; dis = true; }
    else if (lock) { label = '잠겨 있어요'; dis = true; }
    else { label = '구매'; dis = G.S.coins < it.cost; fn = () => shopBuy(it); }
    button(br, label, { disabled: dis, size: 32 });
    st.btns.push({ rect: br, fn: fn || (dis && !it.soon && !own && !lock ? () => { say('돈이 조금 모자라요.', 3); toast('돈이 모자라요'); } : null), list: true });
    if (lock) {
      ctx.save(); rrect(x, y, w, h, 26); ctx.clip(); ctx.fillStyle = 'rgba(35,28,20,.5)'; ctx.fillRect(x, y, w, h); ctx.restore();
      lockIcon(x + w / 2, y + h * .2, Math.min(110, h * .28));
    }
  }

  /* ---------- 씨앗 교환: 같은 씨앗 2개를 내면 다른 씨앗 1개 (열린 꽃의 일반 씨앗만) ---------- */
  const swapOpen = () => FLOWERS.slice(0, openKinds());
  const swapSources = target => swapOpen().filter(f => f.id !== target && (G.S.seeds[f.id] || 0) >= 2);
  function openSwap(it) {
    const target = it.id, name = FLOWER[target].name;
    if (!swapSources(target).length) { say('바꿀 씨앗이 모자라요. 같은 씨앗 2개가 있어야 해요.', 3); toast('같은 씨앗 2개가 있어야 바꿀 수 있어요'); return; }
    openPopup({ title: `${name} 씨앗으로 바꾸기`, sel: null, draw(r) {
      this.btns = []; const [x, y, w, h] = r, pd = G.mode === 'pad', fs = pd ? 34 : 40, bh = pd ? 100 : 130, hh = pd ? 120 : 170;
      const src = swapSources(target); if (this.sel && !src.some(f => f.id === this.sel)) this.sel = null;
      wrap(`내 씨앗 2개를 내면 ${name} 씨앗 1개를 드려요. 낼 씨앗을 골라 주세요.`, x, y + 20, w, fs, '#6e4b28');
      const gr = [x, y + hh, w, h - hh - bh - 70], cols = pd ? 3 : 2, gap = 20, ch = pd ? 170 : 200, cw = (w - gap * (cols - 1)) / cols, rows = Math.ceil(src.length / cols);
      scrollBegin(this, gr, rows * (ch + gap) - gap);
      src.forEach((f, i) => {
        const rc = [x + (i % cols) * (cw + gap), gr[1] + Math.floor(i / cols) * (ch + gap), cw, ch], on = this.sel === f.id; card(rc, on);
        imgFit(G.img[`flower_${f.id}_seed`], rc[0] + ch * .45, rc[1] + ch / 2, ch * .7);
        text(`${f.name} 씨앗`, rc[0] + ch * .85, rc[1] + ch * .38, pd ? 30 : 32, '#6e4b28', 'left');
        text(`가진 ${G.S.seeds[f.id]}개`, rc[0] + ch * .85, rc[1] + ch * .68, pd ? 28 : 30, on ? '#c0522c' : '#8a6a44', 'left');
        const hit = scrollHit(this, gr, rc); if (hit) this.btns.push({ rect: hit, fn: () => { this.sel = f.id; } });
      });
      scrollEnd(this, gr);
      const have = this.sel ? G.S.seeds[this.sel] || 0 : 0, mx = Math.floor(have / 2), by = y + h - bh;            // 한 번에 여러 번 바꾸기: 1번·5번·10번·모두
      const bw = (w - 20 * 3) / 4;
      if (this.sel) text(`${FLOWER[this.sel].name} 씨앗 ${have}개 → 최대 ${mx}번 바꿀 수 있어요`, x + w / 2, by - 30, pd ? 30 : 32, '#c0522c', 'center');
      else text('위에서 낼 씨앗을 골라 주세요', x + w / 2, by - 30, pd ? 30 : 32, '#8a6a44', 'center');
      [1, 5, 10, 0].forEach((n, i) => {
        const cnt = n || mx, ok = !!this.sel && cnt >= 1 && (n === 0 || n <= mx), rb = [x + i * (bw + 20), by, bw, bh];
        button(rb, n ? `${n}번` : `모두 (${mx}번)`, { size: pd ? 34 : 34, disabled: !ok });
        this.btns.push({ rect: rb, fn: () => ok && doSwap(this.sel, target, cnt) });
      });
    } });
  }
  function doSwap(give, target, n) {
    const S = G.S; n = Math.min(n | 0, Math.floor((S.seeds[give] || 0) / 2)); if (!give || give === target || n < 1) return;
    S.seeds[give] -= 2 * n; S.seeds[target] = (S.seeds[target] || 0) + n; save();
    G.popup = null; G.dirty = true;
    say('바꿔 드렸어요.', 2); toast(`${FLOWER[give].name} 씨앗 ${2 * n}개 → ${FLOWER[target].name} 씨앗 ${n}개`);
  }
  G.shopSwap = id => openSwap({ id });

  function buyHourglass(it) {
    if (G.S.gems < it.cost) { say('다이아가 조금 모자라요.', 3); toast('다이아가 모자라요'); return; }
    G.S.gems -= it.cost; addItem(it.id, 1); save(); G.dirty = true;
    say('고맙습니다.', 1); toast(`${it.name}을(를) 가방에 넣었어요 (${itemCount(it.id)}개)`);
  }

  function shopBuy(it) {
    if (isOwned(it) || it.soon) return;
    if (it.req && !G.S.owned[it.req]) return;
    if (G.S.coins < it.cost) { say('돈이 조금 모자라요.', 3); toast('돈이 모자라요'); return; }
    if (it.kind === 'prop' && !it._ok) {                                                // 능력이 이미 최대면 한 번 물어봄
      const e = PROP_EFFECT[it.id];
      if (e) { const cap = EFFECT_KIND[e[0]].cap, now = Math.round(bonus(e[0]) * 100);
        if (now >= cap) {
          openPopup({ title: '능력이 이미 최대예요', draw(r) {
            this.btns = []; const [x, y, w] = r, pd = G.mode === 'pad', fs = pd ? 34 : 40, bh = pd ? 100 : 130;
            wrap(`「${EFFECT_KIND[e[0]].label(cap)}」이(가) 이미 최대라서, ${it.name}을(를) 사도 능력은 더 오르지 않아요. ${PROP_PLAY[it.id] ? `「${PROP_PLAY[it.id]}」 놀이는 열려요. ` : ''}그래도 사실래요?`, x, y + 30, w, fs, '#6e4b28');
            const r1 = [x, y + 30 + fs * 5, w * .48, bh], r2 = [x + w * .52, y + 30 + fs * 5, w * .48, bh];
            button(r1, '그래도 살게요', { size: fs }); this.btns.push({ rect: r1, fn: () => { G.popup = null; shopBuy(Object.assign({}, it, { _ok: true })); } });
            button(r2, '그만둘게요', { size: fs }); this.btns.push({ rect: r2, fn: () => { G.popup = null; G.dirty = true; } });
          } });
          return;
        }
      }
    }
    if (it.kind === 'prop') {
      const cp = st.shop === 'seed' && Story.coupon() ? Math.round(it.cost * .9) : it.cost;   // 씨앗 가게 할인권 1회
      if (cp < it.cost) { Story.useCoupon(); toast(`할인권 사용 · ${it.cost - cp}골드 아꼈어요`); }
      G.S.coins -= cp; G.S.owned['p_' + it.id] = true;
      const ok = placeProp(it.id), hm = giveHint(); save();
      if (it.id === 'console') setTimeout(() => { say('방 바닥에 게임기를 놓아 두었어요. 눌러서 「꽃밭 서바이벌」을 해 보세요!', 2); toast('새 놀이 「꽃밭 서바이벌」이 열렸어요!', 3500); }, 400);
      if (PROP_PLAY[it.id]) setTimeout(() => { say(`${it.name}을(를) 방에 놓고 눌러 보세요! 「${PROP_PLAY[it.id]}」 놀이를 할 수 있어요.`, 2); toast(`새 놀이 「${PROP_PLAY[it.id]}」가 열렸어요!`, 3500); }, 400);
      toast(`${it.name} 구매 완료!${ok ? '' : ' (자리가 없어 보관해 둬요)'}${hm}`, hm ? 4200 : 2200);
    } else buy({ id: it.id, offer: { name: it.name, cost: it.cost, kind: it.k, v: it.v } });
    say('고맙습니다.', 1); G.dirty = true;
  }

  /* 주인: 옆이 비치게 가장자리를 흐리게 만든 그림을 한 번만 만들어 둠 */
  const faded = {};
  function ownerImg(row, col) {
    const k = `sk_${row}${col}`; if (faded[k]) return faded[k];
    const im = G.img[k]; if (!im) return null;
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    x.globalCompositeOperation = 'destination-in';
    const g = x.createLinearGradient(0, 0, im.width, 0), e = 44 / im.width;
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(e, 'rgba(0,0,0,1)'); g.addColorStop(1 - e, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, im.width, im.height);
    return (faded[k] = c);
  }
  function drawOwner(g) {
    const now = Date.now(); let col = 0;
    if (now < st.talkUntil) col = Math.floor(now / 150) % 2 ? 1 : 0;
    if (now % 4200 < 150) col = 2;
    const row = now < st.faceUntil ? st.face : 0, vk = G.img[`vil_kp_${st.shop}_${col === 1 ? 't' : row ? 's' : 'n'}`], im = vk || ownerImg(row, col) || ownerImg(0, 0); if (!im) return;
    const base = vk ? G.img[`vil_kp_${st.shop}_n`] || im : im;                 // 표정이 바뀌어도 크기는 기본 얼굴에 맞춰 고정
    const h = g.owner.w * base.height / base.width, w = h * im.width / im.height, x = g.owner.x - w / 2, y = g.owner.y - h;
    ctx.drawImage(im, x, y, w, h); st.ownerRect = [x, y, w, h];
  }
  function drawBubble(g) {
    if (!st.line) return;
    const [x, y, w, h] = g.bubble;
    rrect(x + 4, y + 8, w, h, 34); ctx.fillStyle = 'rgba(60,40,15,.25)'; ctx.fill();
    rrect(x, y, w, h, 34); ctx.fillStyle = '#fff8ea'; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = '#9b7148'; ctx.stroke();
    wrap(st.line, x + 34, y + 46, w - 68, g.fs, '#5c3d1e');
  }

  G.screens.shop = {
    onEnter(prev) { st.from = prev && prev !== 'shop' ? prev : 'garden'; st.scroll = 0; st.tab = 0; st.shop = G._shopId || 'general'; G._shopId = 0; say('어서 오세요.', 1); },
    onMode() { st.scroll = 0; },
    busy: () => true,
    draw() {
      const g = geo(), S = G.S;
      const maxScroll = Math.max(0, st.contentH - g.list[3]); st.scroll = Math.min(Math.max(st.scroll, 0), maxScroll);
      const key = [st.shop, st.tab, Math.round(st.scroll), S.coins, S.gems, Object.keys(S.owned).length, S.beds.length, S.can, S.glove, decorKey(), Object.values(S.seeds).join(','), S.mails.filter(m => !m.read).length].join('|');
      cachedLayer('shop', key, () => {
        st.btns = []; st.list = g.list;
        ctx.fillStyle = '#e7cfa3'; ctx.fillRect(0, 0, G.L.W, G.L.H);
        ctx.save(); if (g.clip) { ctx.beginPath(); ctx.rect(...g.clip); ctx.clip(); }
        const vb = G.img['vil_st_' + st.shop];                           // 마을 가게 배경(없으면 예전 상점 배경)
        if (vb) { const k = Math.max(G.L.W / vb.width, G.L.H / vb.height); ctx.drawImage(vb, (G.L.W - vb.width * k) / 2, (G.L.H - vb.height * k) / 2, vb.width * k, vb.height * k); }
        else { const bg = G.img.bg_shop; if (bg) ctx.drawImage(bg, ...g.bg); }
        ctx.restore();
        const [px, py, pw, ph] = g.panel;
        rrect(px, py, pw, ph, 40); ctx.fillStyle = 'rgba(255,248,232,.94)'; ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = '#9b7148'; ctx.stroke();
        tabs().forEach((nm, i) => {
          const r = [g.tabs.x + i * (g.tabs.w + g.tabs.gap), g.tabs.y, g.tabs.w, g.tabs.h];
          button(r, nm, { active: i === st.tab, size: g.pad ? 34 : 32 });
          st.btns.push({ rect: r, fn: () => { st.tab = i; st.scroll = 0; say(`${nm} 물건이에요.`, 2); } });
        });
        const list = items(), rows = Math.ceil(list.length / g.cols);
        st.contentH = rows * (g.ch + g.gap) - g.gap;
        ctx.save(); ctx.beginPath(); ctx.rect(g.list[0] - 8, g.list[1], g.list[2] + 16, g.list[3]); ctx.clip();
        ctx.translate(0, -Math.round(st.scroll));
        const before = st.btns.length;
        list.forEach((it, i) => drawCard(g, it, g.list[0] + (i % g.cols) * (g.cw + g.gap), g.list[1] + Math.floor(i / g.cols) * (g.ch + g.gap), g.cw, g.ch));
        ctx.restore();
        for (let i = before; i < st.btns.length; i++) { st.btns[i].rect = st.btns[i].rect.slice(); st.btns[i].rect[1] -= 0; }
        if (maxScroll) {                       // 스크롤 막대
          const bh = Math.max(70, g.list[3] * g.list[3] / st.contentH), by = g.list[1] + (g.list[3] - bh) * (st.scroll / maxScroll);
          rrect(g.list[0] + g.list[2] + 6, by, 10, bh, 5); ctx.fillStyle = 'rgba(110,75,40,.45)'; ctx.fill();
        }
        // 가진 돈
        const [mx, my] = g.money;
        drawCoin(mx, my, 26); text(String(S.coins), mx + 44, my + 2, 38, '#fff', 'left', true);
        drawGem(mx + 330, my, 28); text(String(S.gems), mx + 372, my + 2, 38, '#fff', 'left', true);
        const unread = S.mails.filter(m => !m.read).length;
        button(g.mail, '편지함', { size: 36, badge: unread || 0 }); st.btns.push({ rect: g.mail, fn: () => openMail() });
        button(g.exit, '나가기', { size: 36 }); st.btns.push({ rect: g.exit, fn: () => go(st.from) });
      });
      drawOwner(g); drawBubble(g);
    },
    down(p) {
      const l = st.list;
      st.drag = l && inRect(p, l) ? { sy: p.y, s0: st.scroll } : null;
    },
    move(p) {
      const d = st.drag; if (!d) return;
      st.scroll = Math.min(Math.max(d.s0 - (p.y - d.sy), 0), Math.max(0, st.contentH - st.list[3])); G.dirty = true;
    },
    up(p, tap) {
      st.drag = null; if (!tap) return;
      const inList = st.list && inRect(p, st.list), sp = { x: p.x, y: p.y + Math.round(st.scroll) };
      for (let i = st.btns.length - 1; i >= 0; i--) {
        const b = st.btns[i];
        if (b.list ? (inList && inRect(sp, b.rect)) : inRect(p, b.rect)) { if (b.fn) { b.fn(); G.dirty = true; } return; }
      }
      if (st.ownerRect && inRect(p, st.ownerRect)) say('천천히 둘러보세요.', 2);
    },
  };
})();
