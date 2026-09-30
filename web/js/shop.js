// 문선농장 — 상점: 주인 케인이 지키는 가게. 농장 물건·꾸미기 소품을 돈으로 사고, 산 소품은 정원·방·온실 정해진 자리에 놓임
'use strict';

/* ---------- 놓인 소품 (정원·방·온실 화면이 부름) ---------- */
function decorKey() { return JSON.stringify(G.S.decor); }
function drawDecor(place) {
  const slots = DECOR_SLOTS[G.mode][place], list = (G.S.decor && G.S.decor[place]) || [];
  slots.forEach((sl, i) => {
    if (!list[i] || !PROP[list[i]]) return; const im = G.img['prop_' + list[i]]; if (!im) return;
    const sc = PROP[list[i]].sc || 1, k = Math.min(sl.w * sc / im.width, sl.h * sc / im.height), w = im.width * k, h = im.height * k;
    ctx.drawImage(im, sl.x - w / 2, sl.a === 'b' ? sl.y - h : sl.y - h / 2, w, h);
  });
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

  function items() {
    const t = st.tab, out = [];
    const prop = place => PROPS.filter(p => p.place === place).map(p => ({ kind: 'prop', id: p.id, name: p.name, cost: p.cost, img: 'prop_' + p.id }));
    const mails = kinds => SHOP_MAILS.filter(m => kinds.includes(m.item.kind)).map(m => ({ kind: 'mail', id: m.id, name: m.item.name, cost: m.cost, req: m.requires, img: IMG[m.id], k: m.item.kind, v: m.item.v || 0 }));
    if (t === 0) return mails(['bed', 'can', 'glove']).concat(prop('garden'));
    if (t === 1) return prop('room');
    if (t === 2) return prop('gh');
    if (t === 3) return mails(['outfit']).map(i => Object.assign(i, { tag: '옷' })).concat([{ kind: 'soon', id: 'deco_soon', name: '시계 틀 · 게시판 · 우체통', soon: true, tag: '곧 들어와요' }]);
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
    const nm = it.name.length > 9 ? 28 : 32;
    text(it.name, x + w / 2, y + h * (g.pad ? .47 : .55), nm, '#6e4b28', 'center');
    if (it.cost != null) { const cx = x + w / 2; const py = y + h * (g.pad ? .58 : .67); (it.gem ? drawGem : drawCoin)(cx - 40, py, it.gem ? 20 : 18); text(String(it.cost), cx - 14, py + 2, 34, '#b07a12'); }
    else if (it.sub) text(it.sub, x + w / 2, y + h * .67, 28, '#8a6a44', 'center');
    const br = [x + 24, y + h - 100, w - 48, 80];
    let label, dis = false, fn;
    if (it.soon) { label = '준비 중'; dis = true; }
    else if (it.kind === 'prop' && own) { const pl = isPlaced(it.id); label = pl ? '치우기' : '놓기'; fn = () => { if (pl) { removeProp(it.id); say('치웠어요.', 0); } else if (placeProp(it.id)) say('잘 어울려요.', 2); else say('자리가 다 찼어요. 놓인 것을 먼저 치워 주세요.', 3); }; }
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

  function buyHourglass(it) {
    if (G.S.gems < it.cost) { say('다이아가 조금 모자라요.', 3); toast('다이아가 모자라요'); return; }
    G.S.gems -= it.cost; addItem(it.id, 1); save(); G.dirty = true;
    say('고맙습니다.', 1); toast(`${it.name}을(를) 가방에 넣었어요 (${itemCount(it.id)}개)`);
  }

  function shopBuy(it) {
    if (isOwned(it) || it.soon) return;
    if (it.req && !G.S.owned[it.req]) return;
    if (G.S.coins < it.cost) { say('돈이 조금 모자라요.', 3); toast('돈이 모자라요'); return; }
    if (it.kind === 'prop') {
      G.S.coins -= it.cost; G.S.owned['p_' + it.id] = true;
      const ok = placeProp(it.id), hm = giveHint(); save();
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
    const row = now < st.faceUntil ? st.face : 0, im = ownerImg(row, col) || ownerImg(0, 0); if (!im) return;
    const w = g.owner.w, h = w * im.height / im.width, x = g.owner.x - w / 2, y = g.owner.y - h;
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
    onEnter(prev) { st.from = prev && prev !== 'shop' ? prev : 'garden'; st.scroll = 0; st.tab = 0; say('어서 오세요.', 1); },
    onMode() { st.scroll = 0; },
    busy: () => true,
    draw() {
      const g = geo(), S = G.S;
      const maxScroll = Math.max(0, st.contentH - g.list[3]); st.scroll = Math.min(Math.max(st.scroll, 0), maxScroll);
      const key = [st.tab, Math.round(st.scroll), S.coins, S.gems, Object.keys(S.owned).length, S.beds.length, S.can, S.glove, decorKey(), S.mails.filter(m => !m.read).length].join('|');
      cachedLayer('shop', key, () => {
        st.btns = []; st.list = g.list;
        ctx.fillStyle = '#e7cfa3'; ctx.fillRect(0, 0, G.L.W, G.L.H);
        ctx.save(); if (g.clip) { ctx.beginPath(); ctx.rect(...g.clip); ctx.clip(); }
        const bg = G.img.bg_shop; if (bg) ctx.drawImage(bg, ...g.bg);
        ctx.restore();
        const [px, py, pw, ph] = g.panel;
        rrect(px, py, pw, ph, 40); ctx.fillStyle = 'rgba(255,248,232,.94)'; ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = '#9b7148'; ctx.stroke();
        TABS.forEach((nm, i) => {
          const r = [g.tabs.x + i * (g.tabs.w + g.tabs.gap), g.tabs.y, g.tabs.w, g.tabs.h];
          button(r, nm, { active: i === st.tab, size: g.pad ? 34 : 32 });
          st.btns.push({ rect: r, fn: () => { st.tab = i; st.scroll = 0; const l = ['어서 오세요.', '소품이 많이 들어왔어요.', '온실에 어울리는 것들이에요.', '꾸미기 물건이에요.', '모래시계가 있어요.'][i]; say(l, 2); } });
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
