// 문선농장 — 연구실: 큰 가마솥에 재료 세 개를 넣어 특수 꽃씨를 만드는 화면
'use strict';
(() => {
  const C = {
    pad:   { pot: [1000, 1020, 620], slots: [[560, 1120], [1000, 1130], [1440, 1120]], slotW: 160, mix: [1690, 1040, 440], back: [150, 1060, 190], msg: [1000, 70, 44], pts: [1850, 50] },
    phone: { pot: [610, 1900, 880], slots: [[250, 2200], [610, 2230], [970, 2200]], slotW: 280, mix: [610, 2490, 620], back: [150, 2610, 200], msg: [610, 190, 46], pts: [1130, 100] },
  };
  const st = { fx: [], shakeAt: 0, lastSpawn: 0, press: null };
  const cfg = () => C[G.mode];
  const filled = () => RS.slots.some(v => v);
  const popping = () => RS.popAt && Date.now() - RS.popAt < 2800;
  const hit = (p, cx, cy, w, h) => Math.abs(p.x - cx) <= w / 2 && Math.abs(p.y - cy) <= h / 2;
  function img(n, cx, cy, w) { const im = G.img['lab_' + n]; if (!im) return null; const h = w * im.height / im.width; ctx.drawImage(im, cx - w / 2, cy - h / 2, w, h); return { w, h }; }

  function drawPot(c) {
    const [px, yb, pw] = c.pot, now = Date.now();
    const n = popping() ? 2 : filled() ? 1 : 0, im = G.img['lab_pot' + n]; if (!im) return null;
    const h = pw * im.height / im.width, y0 = yb - h * .971;
    const shake = now - st.shakeAt < 600 ? Math.sin((now - st.shakeAt) / 38) * 10 * (1 - (now - st.shakeAt) / 600) : 0;
    ctx.save(); ctx.translate(px, yb - pw * .01); ctx.scale(1, .16);
    const sg = ctx.createRadialGradient(0, 0, pw * .05, 0, 0, pw * .6); sg.addColorStop(0, 'rgba(40,18,3,.85)'); sg.addColorStop(1, 'rgba(50,25,5,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0, 0, pw * .6, 0, 7); ctx.fill(); ctx.restore();
    const pot = { x: px, w: pw, y0, h, rim: y0 + h * .47 };
    drawDalhae(pot, now, shake);
    ctx.drawImage(im, px - pw / 2 + shake, y0, pw, h);
    return { x: px, mouthY: y0 + h * .55, w: pw, y0, h };
  }
  function drawDalhae(pot, now, shake) {         // 달해가 가마솥 뒤에서 고개를 내밉니다: 기대 / 집중 / 깜짝
    const hit = now - st.shakeAt < 900, n = popping() ? 1 : hit ? 2 : filled() ? 0 : 1, im = G.img['lab_dh' + n]; if (!im) return;
    const w = pot.w * (G.mode === 'pad' ? .68 : .82), h = w * im.height / im.width;
    let dy = Math.sin(now / 700) * 4 * (pot.w / 640);
    if (popping()) { const t = (now - RS.popAt) / 1000; dy -= (t < .35 ? t / .35 * 26 : Math.abs(Math.sin((t - .35) * 7)) * 24 * Math.max(0, 1 - t / 2.8)) * (pot.w / 640); }
    ctx.drawImage(im, pot.x - w / 2 + shake * .5, pot.rim - h + h * .04 + dy, w, h);
  }
  function spawn(pot, big) {
    const now = Date.now(), k = big ? 14 : 1;
    for (let i = 0; i < k; i++) {
      const isSpk = big && i % 2 === 0;
      st.fx.push({ k: isSpk ? 'spk' + (i / 2 % 3 | 0) : 'bub' + Math.floor(Math.random() * 3), x: pot.x + (Math.random() - .5) * pot.w * (big ? .7 : .42), y: pot.mouthY - 10, vx: (Math.random() - .5) * (big ? 260 : 40), vy: -(big ? 280 + Math.random() * 360 : 90 + Math.random() * 90), t0: now, life: big ? 1500 + Math.random() * 600 : 1700 + Math.random() * 700, w: (isSpk ? 50 + Math.random() * 60 : 26 + Math.random() * 38) * (pot.w / 640) });
    }
  }
  function drawFx(pot) {
    const now = Date.now(); st.fx = st.fx.filter(f => now - f.t0 < f.life);
    for (const f of st.fx) {
      const t = (now - f.t0) / 1000, a = 1 - (now - f.t0) / f.life;
      ctx.globalAlpha = Math.max(0, Math.min(1, a * 1.4)); ctx.globalCompositeOperation = f.k.startsWith('spk') ? 'lighter' : 'source-over';
      img(f.k, f.x + f.vx * t + Math.sin(t * 4 + f.x) * 6, f.y + f.vy * t + (f.k.startsWith('bub') ? 0 : 420 * t * t), f.w * (f.k.startsWith('spk') ? (.7 + .5 * Math.sin(t * 14)) : 1));
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
  }
  function drawResult(pot) {
    if (!popping() || !RS.last) return;
    const t = (Date.now() - RS.popAt) / 1000, e = Math.min(1, t / 1.2), out = Math.max(0, (t - 2.2) / .6), sp = SPECIAL[RS.last]; if (!sp) return;
    const s = pot.w * .3 * (.5 + .5 * e), y = pot.mouthY - pot.w * .42 * e, al = 1 - out, rx = pot.x + pot.w * .6 * e;
    ctx.globalAlpha = al; drawHalo(rx, y, s * 1.2, sp.hue); imgFit(G.img[`flower_${baseId(sp.id)}_seed`], rx, y, s); ctx.globalAlpha = 1;
  }
  function doMix() {
    const before = RS.popAt || 0; mixSeeds();
    if (RS.popAt && RS.popAt !== before) { const c = cfg(), pot = { x: c.pot[0], mouthY: c.pot[1] - c.pot[2] * 659 / 480 * .42, w: c.pot[2] }; spawn(pot, true); }
    else st.shakeAt = Date.now();
    G.dirty = true;
  }
  function openPick(i) {
    RS.pick = i;
    openPopup({ title: '재료 고르기', draw(r) { this.btns = []; pickTab(this, r); } });
  }

  G.screens.lab = {
    onEnter() { RS.pick = null; ensureSpecial(); },
    onMode() {},
    busy: () => filled() || popping() || st.fx.length > 0 || Date.now() - st.shakeAt < 650,
    draw() {
      const c = cfg(), W = G.L.W, H = G.L.H, S = G.S, now = Date.now();
      cachedLayer('lab', G.mode + (G.img['bg_lab_' + G.mode] ? 1 : 0), () => { const bg = G.img['bg_lab_' + G.mode]; if (bg) ctx.drawImage(bg, 0, 0, W, H); else { ctx.fillStyle = '#6a4a2a'; ctx.fillRect(0, 0, W, H); } });
      const pot = drawPot(c);
      if (pot) {
        if ((filled() || popping()) && now - st.lastSpawn > 260) { st.lastSpawn = now; spawn(pot, false); }
        drawFx(pot); drawResult(pot);
      }
      // 재료 병 세 개
      c.slots.forEach(([cx, cy], i) => {
        const tok = RS.slots[i], w = c.slotW, y = cy + (tok ? -6 * Math.sin(now / 400 + i) : 0), sz = img(tok ? 'slot_on' : 'slot', cx, y, w * (tok ? 1.1 : 1));
        if (!sz) return;
        if (tok) { drawTok(tok, cx, y - sz.h * .05, w * (tok.startsWith('seed') ? .78 : .62)); text(tokInfo(tok).name, cx, y - sz.h * .56, G.mode === 'pad' ? 26 : 34, '#fff8e0', 'center', true); }
        else text('+', cx, y - sz.h * .02, G.mode === 'pad' ? 56 : 84, 'rgba(255,255,255,.75)', 'center', true);
      });
      // 섞기 간판, 돌아가기
      const ok = RS.slots.every(v => v), pr = st.press === 'mix';
      ctx.globalAlpha = ok ? 1 : .55; const m = img('btn', c.mix[0], c.mix[1], c.mix[2] * (pr ? .95 : 1)); ctx.globalAlpha = 1;
      if (m) text('섞기', c.mix[0], c.mix[1] + 4, G.mode === 'pad' ? 66 : 76, ok ? '#fff6d8' : '#e8d8b8', 'center', true);
      img('back', c.back[0], c.back[1], c.back[2] * (st.press === 'back' ? .92 : 1));
      text(RS.msg || '병을 눌러 재료 세 개를 골라 주세요', c.msg[0], c.msg[1], c.msg[2] - (G.mode === 'phone' ? 6 : 0), '#fff8e0', 'center', true);
      text(`연구 포인트 ${S.research}`, c.pts[0], c.pts[1], 38, '#ffe9a0', 'right', true);
    },
    down(p) {
      const c = cfg();
      if (hit(p, c.mix[0], c.mix[1], c.mix[2], c.mix[2] * .6)) st.press = 'mix';
      else if (hit(p, c.back[0], c.back[1], c.back[2], c.back[2])) st.press = 'back';
      else st.press = null; G.dirty = true;
    },
    up(p, tap) {
      const was = st.press; st.press = null; G.dirty = true; if (!tap) return;
      const c = cfg();
      if (was === 'back') { go('greenhouse'); return; }
      if (was === 'mix') { if (RS.slots.every(v => v)) doMix(); else { RS.msg = '재료 세 개를 넣어 주세요.'; st.shakeAt = Date.now(); } return; }
      for (let i = 0; i < 3; i++) {
        const [cx, cy] = c.slots[i];
        if (hit(p, cx, cy, c.slotW * 1.2, c.slotW * 1.5)) { if (RS.slots[i]) { RS.slots[i] = null; RS.msg = ''; } else openPick(i); return; }
      }
    },
  };
})();
