// 문선농장 — 방의 기능: 말로 쓰기(일기), 오늘 기록(약·혈압·운동·화장실), 달력(일정·기록 모아보기)
'use strict';
(() => {
  const pad = () => G.mode === 'pad';
  const hm = t => { const d = new Date(t); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const keyOf = (y, m, d) => `${y}-${m}-${d}`;
  const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return { y, m, d }; };
  const MOODS = [
    { id: 'laugh', label: '좋아요', img: 'talk_laugh' }, { id: 'smile', label: '편안해요', img: 'talk_smile' },
    { id: 'think', label: '그저 그래요', img: 'talk_think' }, { id: 'worry', label: '힘들어요', img: 'talk_worry' },
    { id: 'yawn', label: '졸려요', img: 'talk_yawn' },
  ];
  const MOOD = Object.fromEntries(MOODS.map(m => [m.id, m]));
  const dayRec = k => { const S = G.S; S.rec = S.rec || {}; const R = S.rec[k] || (S.rec[k] = { med: [], bp: [], ex: [], bowel: [], wt: [] }); if (!R.wt) R.wt = []; return R; };
  const peekRec = k => (G.S.rec && G.S.rec[k]) || null;
  const dayDiary = k => { const S = G.S; S.diary = S.diary || {}; return S.diary[k] || (S.diary[k] = { mood: null, entries: [] }); };
  const peekDiary = k => (G.S.diary && G.S.diary[k]) || null;
  const cheer = () => { if (typeof buddyCheer === 'function') buddyCheer(); };
  function wrap(str, w, size, weight = 600) {
    ctx.font = font(size, weight); const out = [];
    for (const para of String(str).split('\n')) { let line = ''; for (const ch of para) { if (ctx.measureText(line + ch).width > w) { out.push(line); line = ch; } else line += ch; } out.push(line); }
    return out;
  }
  function face(id, cx, cy, s) {          // 기분 얼굴: 상반신 그림을 정사각 칸에 맞춰 그림
    const im = G.img[MOOD[id] && MOOD[id].img]; if (!im) return;
    const k = Math.min(s / im.width, s / im.height), w = im.width * k, h = im.height * k;
    ctx.drawImage(im, cx - w / 2, cy - h / 2, w, h);
  }

  /* ---------- 글자 입력 칸 (화면 위에 얹는 진짜 입력 칸: 키보드의 마이크로 말해도 됨) ---------- */
  const F = { els: {} };
  function fieldSync() {
    const p = G.popup, want = p && p.fields && p._inner ? p.fields(p._inner) : null, seen = {};
    if (want) {
      const cr = cv.getBoundingClientRect(), s = G.scale;
      for (const f of want) {
        seen[f.key] = 1; let el = F.els[f.key];
        if (!el) {
          el = document.createElement(f.multi ? 'textarea' : 'input'); if (!f.multi) el.type = f.type || 'text';
          el.id = 'ov_' + f.key; el.placeholder = f.ph || ''; el.value = (p.vals && p.vals[f.key]) || '';
          if (!f.multi) el.autocomplete = 'off';
          Object.assign(el.style, { position: 'absolute', zIndex: 5, boxSizing: 'border-box', border: '3px solid #cdb08a', borderRadius: '18px', background: '#fffdf3', color: '#5c3d1e', fontFamily: FONT, outline: 'none', resize: 'none', touchAction: 'manipulation', webkitUserSelect: 'text', userSelect: 'text', padding: '10px 16px' });
          el.addEventListener('input', () => { p.vals = p.vals || {}; p.vals[f.key] = el.value; });
          el.addEventListener('focusout', () => setTimeout(resize, 350));
          document.body.appendChild(el); F.els[f.key] = el;
        }
        el.style.left = (cr.left + f.rect[0] * s) + 'px'; el.style.top = (cr.top + f.rect[1] * s) + 'px';
        el.style.width = (f.rect[2] * s) + 'px'; el.style.height = (f.rect[3] * s) + 'px';
        el.style.fontSize = (f.size * s) + 'px'; el.style.lineHeight = f.multi ? (f.size * 1.5 * s) + 'px' : 'normal';
      }
    }
    for (const k of Object.keys(F.els)) if (!seen[k]) { F.els[k].remove(); delete F.els[k]; }
  }
  setInterval(fieldSync, 120);
  const setVal = (p, key, v) => { p.vals = p.vals || {}; p.vals[key] = v; if (F.els[key]) F.els[key].value = v; G.dirty = true; };
  const focusField = key => { const el = F.els[key]; if (el) el.focus(); };

  /* ---------- 말로 받아쓰기 ---------- */
  const V = { on: false, rec: null };
  function voice(onText) {
    if (V.on) { try { V.rec && V.rec.stop(); } catch (e) {} V.on = false; G.dirty = true; return true; }
    if (window.FarmBridge && FarmBridge.startVoice) {          // 안드로이드 앱이 음성 입력을 대신 해 줌
      window.onFarmVoice = t => { if (t) onText(t); V.on = false; G.dirty = true; };
      try { FarmBridge.startVoice(); V.on = true; G.dirty = true; return true; } catch (e) {}
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return false;
    try {
      const rec = new SR(); rec.lang = 'ko-KR'; rec.interimResults = false; rec.continuous = false;
      rec.onresult = e => { const t = Array.from(e.results).map(r => r[0].transcript).join(' ').trim(); if (t) onText(t); };
      rec.onerror = () => { V.on = false; G.dirty = true; toast('잘 못 들었어요. 다시 말씀해 주세요'); };
      rec.onend = () => { V.on = false; G.dirty = true; };
      rec.start(); V.rec = rec; V.on = true; G.dirty = true; return true;
    } catch (e) { return false; }
  }
  function micTap(p, key) {
    const ok = voice(t => { const cur = (p.vals && p.vals[key]) || ''; setVal(p, key, (cur ? cur + ' ' : '') + t); });
    if (!ok) { focusField(key); toast('키보드의 마이크 버튼을 눌러 말씀해 주세요', 3200); }
  }

  /* ================= 말로 쓰기 (일기) ================= */
  window.openDiary = function () {
    const k = todayKey(), P = {
      title: '말로 쓰기', big: 'smile', vals: {}, mood: (peekDiary(k) || {}).mood || null,
      fields(r) { const pd = pad(); return [{ key: 'story', multi: true, rect: pd ? [r[0], r[1] + 190, r[2], 250] : [r[0], r[1] + 280, r[2], 700], size: pd ? 38 : 44, ph: '여기를 눌러 적거나, 아래 "말로 쓰기"를 눌러 말씀하세요' }]; },
      draw(r) {
        this.btns = []; const pd = pad(), [x, y, w, h] = r;
        const gap = pd ? 14 : 12, cw = (w - 4 * gap) / 5, ch = pd ? 170 : 250;
        MOODS.forEach((m, i) => {
          const rc = [x + i * (cw + gap), y, cw, ch], on = this.mood === m.id; card(rc, on);
          face(m.id, rc[0] + cw / 2, rc[1] + ch * .42, pd ? 120 : 176);
          text(m.label, rc[0] + cw / 2, rc[1] + ch - (pd ? 26 : 34), pd ? 28 : 34, on ? '#8a5a12' : '#8a6a44', 'center');
          this.btns.push({ rect: rc, fn: () => { this.mood = this.mood === m.id ? null : m.id; } });
        });
        const by = pd ? y + 470 : y + 1010, bh = pd ? 120 : 140, g2 = pd ? 24 : 20;
        const ws = pd ? [420, 250, 434] : [380, 240, 340];
        let bx = x;
        const b1 = [bx, by, ws[0], bh]; bx += ws[0] + g2; const b2 = [bx, by, ws[1], bh]; bx += ws[1] + g2; const b3 = [bx, by, ws[2], bh];
        button(b1, V.on ? '멈추기' : '🎤 말로 쓰기', { size: pd ? 44 : 46, active: V.on }); this.btns.push({ rect: b1, fn: () => micTap(this, 'story') });
        button(b2, '지우기', { size: pd ? 44 : 46 }); this.btns.push({ rect: b2, fn: () => setVal(this, 'story', '') });
        button(b3, '남기기', { size: pd ? 46 : 48 }); this.btns.push({ rect: b3, fn: () => this.saveNow() });
        if (!pd) {
          const d = peekDiary(k), n = d ? d.entries.length : 0;
          text(n ? `오늘 남긴 이야기 ${n}개` : '오늘 남긴 이야기가 아직 없어요', x + w / 2, y + 1215, 34, '#8a6a44', 'center');
          if (n) { const ls = wrap(d.entries[n - 1].text, w - 20, 34).slice(0, 3); ls.forEach((ln, i) => text(ln, x + 10, y + 1275 + i * 46, 34, '#6e4b28')); }
        }
      },
      saveNow() {
        const t = ((this.vals && this.vals.story) || '').trim();
        if (!t) { toast('먼저 이야기를 적어 주세요'); return; }
        const d = dayDiary(k); if (this.mood) d.mood = this.mood;
        d.entries.push({ t: Date.now(), text: t, mood: this.mood || null }); save();
        setVal(this, 'story', ''); toast(`오늘 ${d.entries.length}번째 이야기를 남겼어요`); cheer();
      },
    };
    openPopup(P);
  };

  /* ================= 오늘 기록 ================= */
  function takeMed(i) {
    const R = dayRec(todayKey()); if (R.med.find(m => m.slot === i)) return;
    R.med.push({ slot: i, t: Date.now() }); save();
    if (!giveDiamond('med')) toast('약 먹은 것을 적어 두었어요'); else cheer();
  }
  const EX_KINDS = ['걷기', '재활 운동', '마사지', '스트레칭'], EX_MIN = [5, 10, 15, 20, 30];
  const BOWEL = [{ id: 'easy', label: '쉬웠어요' }, { id: 'ok', label: '보통이었어요' }, { id: 'hard', label: '힘들었어요' }];
  function lastWeight() {                   // 가장 최근 체중 (최근 120일 안)
    for (let i = 0; i < 120; i++) { const d = new Date(Date.now() - i * 864e5), k = keyOf(d.getFullYear(), d.getMonth() + 1, d.getDate()), R = peekRec(k); if (R && R.wt && R.wt.length) return { kg: R.wt[R.wt.length - 1].kg, md: `${d.getMonth() + 1}/${d.getDate()}` }; }
    return null;
  }
  const exObj = e => typeof e === 'number' ? { t: e } : e, bwObj = e => typeof e === 'number' ? { t: e } : e;
  const exText = e => { e = exObj(e); return `${e.kind || '운동'}${e.min ? ' ' + e.min + '분' : ''}`; };
  const bwText = e => { e = bwObj(e); const b = BOWEL.find(q => q.id === e.f); return b ? b.label.replace('이었어요', '').replace('었어요', '').replace('했어요', '') : '기록'; };
  const KD = { 영: 0, 공: 0, 일: 1, 이: 2, 삼: 3, 사: 4, 오: 5, 육: 6, 륙: 6, 칠: 7, 팔: 8, 구: 9 };
  function koNum(s) {                       // "백이십" → 120, "팔십오" → 85, "일이공" → 120
    if (!s || ![...s].every(c => c in KD || c === '십' || c === '백')) return null;
    if (![...s].some(c => c === '십' || c === '백')) return parseInt([...s].map(c => KD[c]).join(''), 10);
    let total = 0, cur = 0;
    for (const c of s) { if (c in KD) cur = KD[c]; else if (c === '십') { total += (cur || 1) * 10; cur = 0; } else { total += (cur || 1) * 100; cur = 0; } }
    return total + cur;
  }
  function parseBP(t) {
    const nums = (t.match(/\d+/g) || []).map(Number); if (nums.length >= 2) return [nums[0], nums[1]];
    const parts = t.replace(/[,.]/g, ' ').split(/\s+|에|하고|의|에서|\/|-/).filter(Boolean).map(koNum).filter(n => n !== null);
    return parts.length >= 2 ? [parts[0], parts[1]] : null;
  }
  window.openToday = function () {
    const P = {
      title: '오늘 기록', big: 'po_med', mode: 'main', bp: { sys: '', dia: '', f: 'sys' },
      go(m) { this.mode = m; this.big = { main: 'po_med', bp: 'po_bp', bowel: 'po_toilet' }[m] || 'smile'; this._bigT = 0; this.title = { bp: '혈압 적기', ex: '운동 기록', bowel: '화장실 기록', wt: '체중 적기' }[m] || '오늘 기록'; this.wt = { v: '' }; this.bp = { sys: '', dia: '', f: 'sys' }; this.ex = { kind: null, min: null }; },
      draw(r) { this.btns = []; (this.mode === 'bp' ? this.drawBP : this.mode === 'ex' ? this.drawEx : this.mode === 'bowel' ? this.drawBowel : this.mode === 'wt' ? this.drawWt : this.drawMain).call(this, r); },
      drawMain(r) {
        const pd = pad(), R = dayRec(todayKey()), bh = pd ? 112 : 120, g = 24, [rx, ry, rw, rh] = r;
        let cells;
        if (pd) { const c3 = (rw - 2 * g) / 3, rh2 = (rh - g) / 2; cells = [[rx, ry, 2 * c3 + g, rh2], [rx + 2 * c3 + 2 * g, ry, c3, rh2], [rx, ry + rh2 + g, c3, rh2], [rx + c3 + g, ry + rh2 + g, c3, rh2], [rx + 2 * (c3 + g), ry + rh2 + g, c3, rh2]]; }
        else cells = gridRects(r, 1, 5, 18);
        const fitT = (str, maxW, size) => { let sz = size; ctx.font = font(sz, 700); while (sz > 20 && ctx.measureText(str).width > maxW) { sz -= 1; ctx.font = font(sz, 700); } return sz; };
        const head = (c, t, sub) => { card(c, false); text(t, c[0] + 30, c[1] + 46, 40, '#6e4b28'); if (sub) { const sz = fitT(sub, c[2] - 50, 30); text(sub, c[0] + 30, c[1] + 100, sz, '#8a6a44'); } };
        const add = (c, label, fn) => { const br = [c[0] + c[2] - 30 - 300, c[1] + c[3] - bh - 24, 300, bh]; button(br, label, { size: 44 }); this.btns.push({ rect: br, fn }); };
        // 약
        let c = cells[0], [x, y, w, h] = c; const labels = ['아침', '점심', '저녁'];
        head(c, `약 먹기  ${R.med.length}/3`, labels.map((l, i) => { const m = R.med.find(q => q.slot === i); return m ? `${l} ${hm(m.t)}` : `${l} -`; }).join('  ·  '));
        const bw = (w - 60 - 32) / 3;
        labels.forEach((l, i) => {
          const took = R.med.find(m => m.slot === i), br = [x + 30 + i * (bw + 16), y + h - bh - 24, bw, bh];
          button(br, took ? `✓ ${l}` : l, { disabled: !!took, size: 38 }); this.btns.push({ rect: br, disabled: !!took, fn: () => takeMed(i) });
        });
        const lastBP = R.bp[R.bp.length - 1];
        head(cells[1], '혈압', lastBP ? `${lastBP.s} / ${lastBP.d}   (${hm(lastBP.t)})` : '오늘은 아직 없어요'); add(cells[1], '적기', () => this.go('bp'));
        const lx = R.ex[R.ex.length - 1];
        head(cells[2], '운동', lx ? `${exText(lx)}  (${hm(exObj(lx).t)})${R.ex.length > 1 ? '  외 ' + (R.ex.length - 1) + '번' : ''}` : '오늘은 아직 없어요'); add(cells[2], '적기', () => this.go('ex'));
        const lb = R.bowel[R.bowel.length - 1];
        head(cells[3], '화장실', lb ? `${bwText(lb)}  (${hm(bwObj(lb).t)})${R.bowel.length > 1 ? '  외 ' + (R.bowel.length - 1) + '번' : ''}` : '오늘은 아직 없어요'); add(cells[3], '적기', () => this.go('bowel'));
        const lw = lastWeight();
        head(cells[4], '체중', lw ? `${lw.kg} kg  (${lw.md})` : '가끔 적어 두세요'); add(cells[4], '적기', () => this.go('wt'));
      },
      drawWt(r) {
        const pd = pad(), [x, y, w, h] = r, b = this.wt;
        const fld = [x, y + 6, pd ? 560 : w, pd ? 200 : 230]; card(fld, true); text('체중 (kg)', fld[0] + 28, fld[1] + 44, 32, '#8a6a44');
        text(b.v || '', fld[0] + fld[2] - 40, fld[1] + fld[3] * .6, 110, '#6e4b28', 'right');
        const kx = pd ? x + 620 : x, ky = pd ? y : y + 270, kw = pd ? 560 : w, kg = 16, cw = (kw - 2 * kg) / 3, ch = pd ? 138 : 170;
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '지움'].forEach((kk, i) => {
          const rc = [kx + (i % 3) * (cw + kg), ky + Math.floor(i / 3) * (ch + kg), cw, ch]; button(rc, kk, { size: kk.length > 1 ? 44 : 64 });
          this.btns.push({ rect: rc, fn: () => { if (kk === '지움') b.v = b.v.slice(0, -1); else if (kk === '.') { if (b.v && !b.v.includes('.')) b.v += '.'; } else if (b.v.replace('.', '').length < 4 && !(b.v.includes('.') && b.v.split('.')[1].length >= 1)) b.v += kk; } });
        });
        const by = pd ? y + 240 : y + 1130, bh = pd ? 120 : 140, bw = pd ? 270 : (w - 20) / 2, sv = [x, by, bw, bh], bk = [x + bw + 20, by, bw, bh];
        button(sv, '저장', { size: 48 }); this.btns.push({ rect: sv, fn: () => this.saveWt() }); button(bk, '뒤로', { size: 48 }); this.btns.push({ rect: bk, fn: () => this.go('main') });
      },
      saveWt() {
        const kg = parseFloat(this.wt.v); if (!(kg >= 20 && kg <= 250)) { toast('숫자를 다시 확인해 주세요'); return; }
        dayRec(todayKey()).wt.push({ t: Date.now(), kg }); save(); toast(`체중 ${kg}kg 기록했어요`); this.go('main');
      },
      drawBP(r) {
        const pd = pad(), [x, y, w, h] = r, b = this.bp;
        const fw = pd ? 560 : w, fh = pd ? 140 : 190;
        const fld = (rc, label, key) => {
          const on = b.f === key; card(rc, on); text(label, rc[0] + 28, rc[1] + 40, 30, '#8a6a44');
          text(b[key] || '', rc[0] + rc[2] - 40, rc[1] + rc[3] * .58, 100, '#6e4b28', 'right');
          this.btns.push({ rect: rc, fn: () => { b.f = key; } });
        };
        fld([x, y + 6, fw, fh], '위 숫자 (수축기)', 'sys'); fld([x, y + 6 + fh + 20, fw, fh], '아래 숫자 (이완기)', 'dia');
        const kx = pd ? x + 620 : x, ky = pd ? y : y + 430, kw = pd ? 560 : w, kg = 16, cw = (kw - 2 * kg) / 3, ch = pd ? 138 : 170;
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '지움', '0', '다음'].forEach((kk, i) => {
          const rc = [kx + (i % 3) * (cw + kg), ky + Math.floor(i / 3) * (ch + kg), cw, ch];
          button(rc, kk, { size: kk.length > 1 ? 44 : 64 });
          this.btns.push({ rect: rc, fn: () => this.key(kk) });
        });
        const mic = pd ? [x, y + 2 * fh + 46, fw, 110] : [x, y + 1190, w, 140];
        button(mic, V.on ? '멈추기' : '🎤 말로 적기 (예: 백이십에 팔십오)', { size: pd ? 36 : 40, active: V.on }); this.btns.push({ rect: mic, fn: () => this.micBP() });
        const by = pd ? y + 2 * fh + 46 + 130 : y + 1350, bh = pd ? 120 : 140, bw = pd ? 270 : (w - 20) / 2;
        const sv = [x, by, bw, bh], bk = [x + bw + 20, by, bw, bh];
        button(sv, '저장', { size: 48 }); this.btns.push({ rect: sv, fn: () => this.saveBP() });
        button(bk, '뒤로', { size: 48 }); this.btns.push({ rect: bk, fn: () => this.go('main') });
      },
      micBP() {
        const ok = voice(t => {
          const r = parseBP(t);
          if (!r) { toast(`"${t}" 라고 들렸어요. 다시 말씀해 주세요`, 3000); return; }
          this.bp = { sys: String(r[0]), dia: String(r[1]), f: 'dia' }; toast(`${r[0]} / ${r[1]} 으로 들었어요. 맞으면 저장을 눌러 주세요`, 3600);
        });
        if (!ok) toast('이 기기에서는 말로 적기가 안 돼요. 숫자판을 눌러 주세요', 3200);
      },
      drawEx(r) {
        const pd = pad(), [x, y, w, h] = r, e = this.ex, g = 16;
        text('어떤 운동을 하셨어요?', x + 6, y + 24, 34, '#8a5a12');
        const cols = pd ? 3 : 2, ch = pd ? 110 : 160, cw = (w - g * (cols - 1)) / cols, y0 = y + 56;
        EX_KINDS.forEach((k, i) => { const rc = [x + (i % cols) * (cw + g), y0 + Math.floor(i / cols) * (ch + g), cw, ch]; button(rc, k, { size: pd ? 44 : 48, active: e.kind === k }); this.btns.push({ rect: rc, fn: () => { e.kind = k; } }); });
        const rows = Math.ceil(EX_KINDS.length / cols), ty = y0 + rows * (ch + g) + 14;
        text('얼마나 하셨어요?', x + 6, ty + 10, 34, '#8a5a12');
        const mc = pd ? 5 : 3, mh = pd ? 100 : 140, mw = (w - g * (mc - 1)) / mc, my = ty + 44;
        EX_MIN.forEach((m, i) => { const rc = [x + (i % mc) * (mw + g), my + Math.floor(i / mc) * (mh + g), mw, mh]; button(rc, `${m}분`, { size: pd ? 42 : 48, active: e.min === m }); this.btns.push({ rect: rc, fn: () => { e.min = m; } }); });
        const mrows = Math.ceil(EX_MIN.length / mc), by = my + mrows * (mh + g) + 10, bh = pd ? 100 : 140, bw = (w - 20) / 2, ok = !!(e.kind && e.min);
        const sv = [x, Math.min(by, y + h - bh), bw, bh], bk = [x + bw + 20, sv[1], bw, bh];
        button(sv, '저장', { size: 46, disabled: !ok }); this.btns.push({ rect: sv, disabled: !ok, fn: () => this.saveEx() });
        button(bk, '뒤로', { size: 46 }); this.btns.push({ rect: bk, fn: () => this.go('main') });
      },
      saveEx() {
        const e = this.ex; if (!e.kind || !e.min) return;
        const R = dayRec(todayKey()); R.ex.push({ t: Date.now(), kind: e.kind, min: e.min }); save();
        if (!giveDiamond('exercise')) toast(`${e.kind} ${e.min}분 기록했어요`); else cheer();
        this.go('main');
      },
      drawBowel(r) {
        const pd = pad(), [x, y, w, h] = r, g = 20;
        text('오늘은 어떠셨어요?', x + w / 2, y + 40, 44, '#6e4b28', 'center');
        const cols = pd ? 3 : 1, bh = pd ? 200 : 210, cw = (w - g * (cols - 1)) / cols, y0 = y + 100;
        BOWEL.forEach((b, i) => { const rc = pd ? [x + i * (cw + g), y0, cw, bh] : [x, y0 + i * (bh + g), w, bh]; button(rc, b.label, { size: pd ? 46 : 56 }); this.btns.push({ rect: rc, fn: () => { const R = dayRec(todayKey()); R.bowel.push({ t: Date.now(), f: b.id }); save(); toast('기록해 두었어요'); this.go('main'); } }); });
        const bk = pd ? [x + w / 2 - 150, y + 360, 300, 110] : [x + w / 2 - 150, y0 + 3 * (bh + g) + 20, 300, 130];
        button(bk, '뒤로', { size: 46 }); this.btns.push({ rect: bk, fn: () => this.go('main') });
      },
      key(kk) {
        const b = this.bp, cur = b[b.f];
        if (kk === '지움') { if (cur) b[b.f] = cur.slice(0, -1); else if (b.f === 'dia') b.f = 'sys'; }
        else if (kk === '다음') b.f = b.f === 'sys' ? 'dia' : 'sys';
        else if (cur.length < 3) { b[b.f] = cur + kk; if (b.f === 'sys' && b.sys.length === 3) b.f = 'dia'; }
      },
      saveBP() {
        const s = +this.bp.sys, d = +this.bp.dia;
        if (!(s >= 70 && s <= 260 && d >= 40 && d <= 160 && s > d)) { toast('숫자를 다시 확인해 주세요'); return; }
        const R = dayRec(todayKey()); R.bp.push({ t: Date.now(), s, d }); save();
        if (!giveDiamond('bp')) toast(`혈압 ${s}/${d} 기록했어요`); else cheer();
        this.go('main');
      },
    };
    openPopup(P);
  };

  /* ================= 달력 ================= */
  const bridgeCache = {};
  function bridgeEvents(y, m) {           // 안드로이드 앱이 구글 캘린더에서 넣어 줌 (없으면 빈 목록)
    const ck = `${y}-${m}`; if (bridgeCache[ck] && Date.now() - bridgeCache[ck].t < 60000) return bridgeCache[ck].list;
    let list = [];
    try { if (window.FarmBridge && FarmBridge.getEvents) list = JSON.parse(FarmBridge.getEvents(y, m) || '[]') || []; } catch (e) {}
    bridgeCache[ck] = { t: Date.now(), list }; return list;
  }
  function eventsOn(k) {
    const { y, m } = parseKey(k), out = [];
    for (const e of bridgeEvents(y, m)) if (e.date === k) out.push({ time: e.time || '', text: e.title || e.text || '', ro: true });
    for (const e of (G.S.events || [])) if (e.date === k) out.push({ time: e.time || '', text: e.text, id: e.id });
    return out.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }
  window.localNextEvent = function () {
    if (!G.S) return null;
    const now = new Date(), today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()), nowHM = hm(now.getTime()).padStart(5, '0');
    let best = null;
    for (const e of (G.S.events || [])) {
      const p = parseKey(e.date), dd = Math.round((new Date(p.y, p.m - 1, p.d) - today0) / 864e5);
      if (dd < 0 || dd > 14) continue;
      if (dd === 0 && e.time && e.time < nowHM) continue;
      const sk = dd * 10000 + (e.time ? +e.time.replace(':', '') : 0);
      if (!best || sk < best.sk) best = { sk, e, dd, p };
    }
    if (!best) return null;
    return { time: best.dd === 0 ? (best.e.time || '오늘') : `${best.p.m}/${best.p.d}${best.e.time ? ' ' + best.e.time : ''}`, title: best.e.text };
  };
  window.openCalendar = function () {
    const now = new Date(), P = {
      title: '달력', mode: 'month', y: now.getFullYear(), m: now.getMonth() + 1, day: null, vals: {}, del: null,
      fields(r) { if (this.mode !== 'ev') return null; const pd = pad(); return [
        { key: 'evText', rect: pd ? [r[0], r[1] + 90, r[2], 110] : [r[0], r[1] + 110, r[2], 130], size: pd ? 40 : 46, ph: '예: 병원 예약, 아들 오는 날' },
        { key: 'evTime', type: 'time', rect: pd ? [r[0], r[1] + 230, 380, 100] : [r[0], r[1] + 280, 460, 120], size: pd ? 38 : 46 }]; },
      draw(r) { this.btns = []; if (this.mode === 'month') this.drawMonth(r); else if (this.mode === 'day') this.drawDay(r); else this.drawEv(r); },
      shift(n) { let m = this.m + n, y = this.y; if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; } this.m = m; this.y = y; },
      drawMonth(r) {
        const pd = pad(), [x, y, w, h] = r, k0 = todayKey();
        const pv = [x, y, 140, 80], nx = [x + w - 140, y, 140, 80];
        button(pv, '‹', { size: 56 }); this.btns.push({ rect: pv, fn: () => this.shift(-1) });
        button(nx, '›', { size: 56 }); this.btns.push({ rect: nx, fn: () => this.shift(1) });
        text(`${this.y}년 ${this.m}월`, x + w / 2 - (pd ? 110 : 0), y + 40, 50, '#6e4b28', 'center');
        const st = [x + w - 140 - 20 - 230, y, 230, 80];
        if (pd) { button(st, '모아보기', { size: 38 }); this.btns.push({ rect: st, fn: () => openStats() }); }
        else { const sb = [x + w / 2 - 250, y + h - 140, 500, 130]; button(sb, '나의 기록 모아보기', { size: 44 }); this.btns.push({ rect: sb, fn: () => openStats() }); }
        const gy = y + (pd ? 130 : 160), cw = w / 7, rh = pd ? (h - 130) / 6 : 200;
        WEEK.forEach((wd, i) => text(wd, x + i * cw + cw / 2, y + (pd ? 108 : 138), pd ? 30 : 34, i === 0 ? '#c0503c' : i === 6 ? '#3f6cb0' : '#8a6a44', 'center'));
        const first = new Date(this.y, this.m - 1, 1).getDay(), dim = new Date(this.y, this.m, 0).getDate();
        for (let d = 1; d <= dim; d++) {
          const i = first + d - 1, col = i % 7, row = Math.floor(i / 7), rc = [x + col * cw + 3, gy + row * rh + 3, cw - 6, rh - 6], k = keyOf(this.y, this.m, d);
          const dr = peekDiary(k), rr = peekRec(k), ev = eventsOn(k), has = (dr && dr.entries.length) || (rr && (rr.med.length || rr.bp.length || rr.ex.length || rr.bowel.length || (rr.wt && rr.wt.length))) || ev.length;
          rrect(rc[0], rc[1], rc[2], rc[3], 18); ctx.fillStyle = has ? '#f3e6cf' : 'rgba(243,230,207,.35)'; ctx.fill();
          if (k === k0) { ctx.lineWidth = 5; ctx.strokeStyle = '#c9892f'; ctx.stroke(); }
          text(String(d), rc[0] + 16, rc[1] + (pd ? 24 : 30), pd ? 30 : 36, col === 0 ? '#c0503c' : col === 6 ? '#3f6cb0' : '#6e4b28');
          if (dr && dr.mood) face(dr.mood, rc[0] + rc[2] - (pd ? 36 : 48), rc[1] + rc[3] * (pd ? .62 : .58), pd ? 52 : 74);
          if (rr && rr.med.length) for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.arc(rc[0] + 22 + j * 20, rc[1] + rc[3] - 20, 7, 0, 7); ctx.fillStyle = j < rr.med.length ? '#4f9a6a' : 'rgba(150,120,80,.25)'; ctx.fill(); }
          if (ev.length) { rrect(rc[0] + 14, rc[1] + rc[3] - (rr && rr.med.length ? 44 : 26), rc[2] * .5, 8, 4); ctx.fillStyle = '#e07a5f'; ctx.fill(); }
          this.btns.push({ rect: rc, fn: () => { this.day = k; this.scroll = 0; this.mode = 'day'; this.title = '달력'; this.del = null; } });
        }
      },
      drawDay(r) {
        const pd = pad(), [x, y, w, h] = r, k = this.day, { m, d } = parseKey(k), wd = WEEK[new Date(...k.split('-').map((v, i) => i === 1 ? v - 1 : +v)).getDay()];
        const bk = [x, y, 230, 84], ad = [x + w - 330, y, 330, 84];
        button(bk, '달력', { size: 40 }); this.btns.push({ rect: bk, fn: () => { this.mode = 'month'; this.scroll = 0; } });
        button(ad, '일정 넣기', { size: 40 }); this.btns.push({ rect: ad, fn: () => { this.mode = 'ev'; this.vals = {}; } });
        text(`${m}월 ${d}일 ${wd}`, x + w / 2 - 20, y + 42, pd ? 44 : 46, '#6e4b28', 'center');
        const rr = [x, y + 104, w, h - 104], items = [], fs = pd ? 34 : 38, tw = w - 40;
        const sec = t => items.push({ h: 74, fn: cy => text(t, x + 6, cy + 40, fs + 6, '#8a5a12') });
        // 일정
        sec('일정'); const evs = eventsOn(k);
        if (!evs.length) items.push({ h: 64, fn: cy => text('일정이 없어요', x + 20, cy + 30, fs, '#a08a6c') });
        evs.forEach(e => items.push({ h: 96, fn: cy => {
          const rc = [x, cy + 4, w, 84]; card(rc, false); text(e.time || '종일', x + 24, cy + 46, fs, '#b0651a'); text(e.text, x + 190, cy + 46, fs, '#6e4b28');
          if (e.id) {
            const conf = this.del === e.id, db = [x + w - 200, cy + 12, 180, 68]; button(db, conf ? '정말요?' : '지우기', { size: 32 });
            const hit = scrollHit(this, rr, db); if (hit) this.btns.push({ rect: hit, fn: () => { if (conf) { G.S.events = G.S.events.filter(q => q.id !== e.id); this.del = null; save(); } else this.del = e.id; } });
          } else text('구글', x + w - 100, cy + 46, 28, '#a08a6c', 'center');
        } }));
        // 이야기
        const dr = peekDiary(k); sec('이야기');
        if (!dr || !dr.entries.length) items.push({ h: 64, fn: cy => text('남긴 이야기가 없어요', x + 20, cy + 30, fs, '#a08a6c') });
        else {
          if (dr.mood) items.push({ h: 96, fn: cy => { face(dr.mood, x + 50, cy + 44, 84); text(MOOD[dr.mood].label, x + 120, cy + 46, fs, '#6e4b28'); } });
          dr.entries.forEach(en => { const ls = wrap(en.text, tw, fs); items.push({ h: 56 + ls.length * (fs * 1.45) + 16, fn: cy => { text(hm(en.t), x + 20, cy + 26, fs - 6, '#b0651a'); ls.forEach((ln, i) => text(ln, x + 20, cy + 70 + i * fs * 1.45, fs, '#6e4b28')); } }); });
        }
        // 몸 상태
        const rc0 = peekRec(k); sec('몸 상태');
        const lines = [];
        if (rc0) {
          if (rc0.med.length) lines.push('약: ' + ['아침', '점심', '저녁'].map((l, i) => { const q = rc0.med.find(v => v.slot === i); return q ? `${l} ${hm(q.t)}` : ''; }).filter(Boolean).join('  ·  '));
          if (rc0.bp.length) lines.push('혈압: ' + rc0.bp.map(q => `${q.s}/${q.d} (${hm(q.t)})`).join('  ·  '));
          if (rc0.ex.length) lines.push('운동: ' + rc0.ex.map(q => `${exText(q)} (${hm(exObj(q).t)})`).join('  ·  '));
          if (rc0.wt && rc0.wt.length) lines.push('체중: ' + rc0.wt.map(q => `${q.kg}kg (${hm(q.t)})`).join('  ·  '));
          if (rc0.bowel.length) lines.push('화장실: ' + rc0.bowel.map(q => `${bwText(q)} (${hm(bwObj(q).t)})`).join('  ·  '));
        }
        if (!lines.length) items.push({ h: 64, fn: cy => text('기록이 없어요', x + 20, cy + 30, fs, '#a08a6c') });
        lines.forEach(l => { const ls = wrap(l, tw, fs); items.push({ h: ls.length * fs * 1.45 + 22, fn: cy => ls.forEach((ln, i) => text(ln, x + 20, cy + 24 + i * fs * 1.45, fs, '#6e4b28')) }); });
        const total = items.reduce((a, b) => a + b.h, 0) + 10;
        scrollBegin(this, rr, total); let cy = rr[1]; for (const it of items) { it.fn(cy); cy += it.h; } scrollEnd(this, rr);
      },
      drawEv(r) {
        const pd = pad(), [x, y, w, h] = r, { m, d } = parseKey(this.day);
        text(`${m}월 ${d}일 일정 넣기`, x + w / 2, y + 40, 46, '#6e4b28', 'center');
        text('시간 (없어도 돼요)', x + (pd ? 400 : 480), y + (pd ? 280 : 340), pd ? 30 : 34, '#8a6a44');
        const by = pd ? y + 380 : y + 470, bh = pd ? 120 : 140, bw = (w - 40) / 3;
        const b1 = [x, by, bw, bh], b2 = [x + bw + 20, by, bw, bh], b3 = [x + 2 * (bw + 20), by, bw, bh];
        button(b1, V.on ? '멈추기' : '🎤 말로', { size: 44, active: V.on }); this.btns.push({ rect: b1, fn: () => micTap(this, 'evText') });
        button(b2, '넣기', { size: 48 }); this.btns.push({ rect: b2, fn: () => this.addEv() });
        button(b3, '취소', { size: 48 }); this.btns.push({ rect: b3, fn: () => { this.mode = 'day'; } });
      },
      addEv() {
        const t = ((this.vals && this.vals.evText) || '').trim(); if (!t) { toast('일정 내용을 적어 주세요'); return; }
        G.S.events = G.S.events || []; G.S.events.push({ id: Date.now() + Math.random(), date: this.day, time: (this.vals && this.vals.evTime) || '', text: t });
        save(); toast('일정을 넣었어요'); this.mode = 'day'; this.scroll = 0;
      },
    };
    openPopup(P);
  };

  /* ================= 나의 기록 모아보기 ================= */
  const md = k => { const p = parseKey(k); return `${p.m}/${p.d}`; };
  function dayKeys(n) { const out = []; for (let i = n - 1; i >= 0; i--) { const d = new Date(Date.now() - i * 864e5); out.push(keyOf(d.getFullYear(), d.getMonth() + 1, d.getDate())); } return out; }
  function lineChart(x, y, w, h, days, series) {
    const vals = series.flatMap(q => q.pts.map(p => p[1]));
    if (!vals.length) { text('기록이 없어요', x + w / 2, y + h / 2 - 10, 34, '#a08a6c', 'center'); return; }
    let lo = Math.min(...vals), hi = Math.max(...vals); const pp = Math.max(4, (hi - lo) * .25); lo = Math.floor(lo - pp); hi = Math.ceil(hi + pp);
    const cx = x + 100, cw = w - 130, cy = y + 12, chh = h - 64, n = days.length;
    const px = i => cx + (n === 1 ? cw / 2 : cw * i / (n - 1)), py = v => cy + chh * (1 - (v - lo) / (hi - lo));
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(150,120,80,.3)';
    for (let i = 0; i <= 3; i++) { const yy = cy + chh * i / 3; ctx.beginPath(); ctx.moveTo(cx, yy); ctx.lineTo(cx + cw, yy); ctx.stroke(); text(String(Math.round(hi - (hi - lo) * i / 3)), cx - 14, yy, 26, '#a08a6c', 'right'); }
    series.forEach(q => {
      ctx.lineWidth = 5; ctx.strokeStyle = q.color; ctx.lineJoin = 'round'; ctx.beginPath();
      q.pts.forEach((p, j) => { if (j) ctx.lineTo(px(p[0]), py(p[1])); else ctx.moveTo(px(p[0]), py(p[1])); }); ctx.stroke();
      q.pts.forEach(p => { ctx.beginPath(); ctx.arc(px(p[0]), py(p[1]), 8, 0, 7); ctx.fillStyle = q.color; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#fff8ea'; ctx.stroke(); });
    });
    [0, Math.floor((n - 1) / 2), n - 1].forEach(i => text(md(days[i]), px(i), y + h - 18, 26, '#8a6a44', 'center'));
  }
  function barChart(x, y, w, h, days, vals, max, color) {
    const n = days.length, gap = n > 40 ? 1 : 4, bw = (w - gap * (n - 1)) / n;
    rrect(x, y, w, h, 10); ctx.fillStyle = 'rgba(150,120,80,.1)'; ctx.fill();
    vals.forEach((v, i) => { if (v > 0) { const bh = Math.max(6, (h - 8) * Math.min(1, v / max)); ctx.fillStyle = color; ctx.fillRect(x + i * (bw + gap), y + h - bh - 4, bw, bh); } });
    [0, n - 1].forEach(i => text(md(days[i]), x + (i ? w : 0), y + h + 22, 24, '#8a6a44', i ? 'right' : 'left'));
  }
  window.openStats = function () {
    const P = {
      title: '나의 기록 모아보기', range: 7, scroll: 0,
      draw(r) {
        this.btns = []; const pd = pad(), [x, y, w, h] = r;
        const tb = [['1주', 7], ['1달', 30], ['3달', 90]], tw = (w - 40) / 3;
        tb.forEach(([l, n], i) => { const rc = [x + i * (tw + 20), y, tw, 84]; button(rc, l, { size: 42, active: this.range === n }); this.btns.push({ rect: rc, fn: () => { this.range = n; this.scroll = 0; } }); });
        const rr = [x, y + 104, w, h - 104], days = dayKeys(this.range), n = days.length;
        const recs = days.map(peekRec);
        const bp = [[], []], wt = [], medN = [], exMin = [];
        let exCnt = 0, exTot = 0, bw = { easy: 0, ok: 0, hard: 0, none: 0 }, medTot = 0, bpAll = [], recDays = 0;
        recs.forEach((R, i) => {
          if (!R) { medN.push(0); exMin.push(0); return; }
          if (R.med.length || R.bp.length || R.ex.length || R.bowel.length || (R.wt && R.wt.length)) recDays++;
          R.bp.forEach(q => { bp[0].push([i, q.s]); bp[1].push([i, q.d]); bpAll.push(q); });
          (R.wt || []).forEach(q => wt.push([i, q.kg]));
          medN.push(R.med.length); medTot += R.med.length;
          let m = 0; R.ex.forEach(e => { e = exObj(e); exCnt++; m += e.min || 0; exTot += e.min || 0; }); exMin.push(m);
          R.bowel.forEach(e => { e = bwObj(e); bw[e.f || 'none']++; });
        });
        const avg = a => a.length ? Math.round(a.reduce((p, q) => p + q, 0) / a.length) : 0;
        const fs = pd ? 34 : 38, items = [], sec = t => items.push({ h: 76, fn: cy => text(t, x + 6, cy + 40, fs + 8, '#8a5a12') });
        const lines = (arr, hh) => items.push({ h: arr.length * hh + 12, fn: cy => arr.forEach((t, i) => text(t, x + 20, cy + hh / 2 + 4 + i * hh, fs, '#6e4b28')) });
        sec('한눈에');
        lines([`기록한 날  ${recDays} / ${n}일`, `약  ${medTot}번 먹었어요  (하루 세 번 기준 ${Math.round(medTot / (n * 3) * 100)}%)`, `운동  ${exCnt}번  ·  모두 ${exTot}분`, `화장실  ${bw.easy + bw.ok + bw.hard + bw.none}번  (쉬움 ${bw.easy} · 보통 ${bw.ok} · 힘듦 ${bw.hard})`, bpAll.length ? `혈압 평균  ${avg(bpAll.map(q => q.s))} / ${avg(bpAll.map(q => q.d))}   (${bpAll.length}번 잼)` : '혈압  기록이 없어요', wt.length ? `체중  ${wt[wt.length - 1][1]} kg  (${wt.length > 1 ? (wt[wt.length - 1][1] - wt[0][1] >= 0 ? '+' : '') + (Math.round((wt[wt.length - 1][1] - wt[0][1]) * 10) / 10) + ' kg 변화' : '첫 기록'})` : '체중  기록이 없어요'], pd ? 52 : 58);
        sec('혈압'); items.push({ h: 20, fn: cy => { } });
        items.push({ h: pd ? 300 : 340, fn: cy => { lineChart(x, cy, w, pd ? 290 : 330, days, [{ pts: bp[0], color: '#d2553f' }, { pts: bp[1], color: '#3f6cb0' }]); } });
        items.push({ h: 50, fn: cy => { ctx.fillStyle = '#d2553f'; ctx.fillRect(x + 100, cy + 14, 36, 8); text('위 숫자', x + 146, cy + 18, 26, '#6e4b28'); ctx.fillStyle = '#3f6cb0'; ctx.fillRect(x + 320, cy + 14, 36, 8); text('아래 숫자', x + 366, cy + 18, 26, '#6e4b28'); } });
        sec('체중'); items.push({ h: pd ? 300 : 340, fn: cy => lineChart(x, cy, w, pd ? 290 : 330, days, [{ pts: wt, color: '#4f9a6a' }]) });
        sec('약  (하루에 먹은 횟수)'); items.push({ h: 170, fn: cy => barChart(x + 10, cy + 6, w - 20, 110, days, medN, 3, '#4f9a6a') });
        sec('운동  (하루에 한 시간)'); items.push({ h: 170, fn: cy => barChart(x + 10, cy + 6, w - 20, 110, days, exMin, 60, '#e0913a') });
        const total = items.reduce((q, z) => q + z.h, 0) + 20;
        scrollBegin(this, rr, total); let cy = rr[1]; for (const it of items) { it.fn(cy); cy += it.h; } scrollEnd(this, rr);
      },
    };
    openPopup(P);
  };
})();
