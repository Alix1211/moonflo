// 문플로 — 소리·진동·배경음악 (파일 없이 코드로 만든 부드러운 피아노/유리 소리)
'use strict';
(() => {
  let ac = null, master = null, sfxBus = null, bgmBus = null, verb = null, unlocked = false, bgmOn = false, bgmTimer = 0, bgmStep = 0, nextT = 0;
  const last = {};
  const opt = () => (G.S && G.S.opt) || { snd: 1, vib: 1, bgm: 1 };
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);           // 미디 음 번호 → 주파수
  const N = { C3: 48, D3: 50, E3: 52, G3: 55, A3: 57, C4: 60, D4: 62, E4: 64, G4: 67, A4: 69, C5: 72, D5: 74, E5: 76, G5: 79, A5: 81, C6: 84 };

  function init() {
    if (ac) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
      ac = new AC();
      master = ac.createGain(); master.gain.value = .9; master.connect(ac.destination);
      sfxBus = ac.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master);
      bgmBus = ac.createGain(); bgmBus.gain.value = .0; bgmBus.connect(master);
      // 부드러운 울림(잔향): 짧게 사라지는 잡음으로 만든 응답
      const len = ac.sampleRate * 1.8, buf = ac.createBuffer(2, len, ac.sampleRate);
      for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
      verb = ac.createConvolver(); verb.buffer = buf;
      const vg = ac.createGain(); vg.gain.value = .32; verb.connect(vg); vg.connect(master);
      return true;
    } catch (e) { ac = null; return false; }
  }

  // 피아노 저음 느낌의 한 음: 기본음 + 배음, 빠르게 켜지고 천천히 사라짐
  function note(m, t, dur, vol, bus, wet) {
    const f = hz(m), g = ac.createGain(), lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(Math.min(9000, f * 7), t); lp.frequency.exponentialRampToValueAtTime(Math.max(500, f * 2), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    lp.connect(g); g.connect(bus || sfxBus); if (wet !== 0) { const s = ac.createGain(); s.gain.value = wet == null ? .5 : wet; g.connect(s); s.connect(verb); }
    [[1, 1, 'sine'], [2, .34, 'sine'], [3, .12, 'triangle'], [4.01, .05, 'sine']].forEach(([mul, a, ty]) => {
      const o = ac.createOscillator(), og = ac.createGain(); o.type = ty; o.frequency.value = f * mul; og.gain.value = a;
      o.connect(og); og.connect(lp); o.start(t); o.stop(t + dur + .05);
    });
  }
  // 맑은 유리 소리(맥 효과음 같은 '띠링')
  function glass(m, t, dur, vol) {
    const f = hz(m), g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(sfxBus); const s = ac.createGain(); s.gain.value = .6; g.connect(s); s.connect(verb);
    [[1, 1], [2.756, .28], [5.4, .08]].forEach(([mul, a]) => { const o = ac.createOscillator(), og = ac.createGain(); o.type = 'sine'; o.frequency.value = f * mul; og.gain.value = a; o.connect(og); og.connect(g); o.start(t); o.stop(t + dur + .05); });
  }
  // 톡 (짧은 낮은 물방울/팝)
  function pop(f0, f1, t, dur, vol) {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + dur + .03);
  }
  // 바스락/쉬이 (필터 잡음)
  function hush(t, dur, vol, f0, f1) {
    const len = Math.max(1, Math.floor(ac.sampleRate * dur)), b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = ac.createBufferSource(); s.buffer = b; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = .9;
    bp.frequency.setValueAtTime(f0, t); bp.frequency.linearRampToValueAtTime(f1, t + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * .25); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(bp); bp.connect(g); g.connect(sfxBus); s.start(t);
  }
  function thump(t, vol, f0 = 110, f1 = 42, dur = .32) { pop(f0, f1, t, dur, vol); }

  const P = {   // 효과음 목록
    tap:     t => { note(N.G3, t, .28, .16); },
    open:    t => { note(N.G3, t, .5, .16); note(N.D4, t + .07, .6, .13); },
    close:   t => { note(N.D4, t, .35, .11); note(N.G3, t + .07, .5, .12); },
    nav:     t => { note(N.E3, t, .5, .16); note(N.A3, t + .06, .5, .1); },
    swap:    t => { pop(520, 300, t, .07, .16); },
    nope:    t => { note(N.D3, t, .3, .16, null, .2); pop(180, 120, t, .12, .1); },
    till:    t => { hush(t, .16, .22, 500, 260); thump(t, .18, 120, 60, .16); },
    plant:   t => { pop(330, 200, t, .11, .2); hush(t + .01, .1, .1, 900, 500); },
    water:   t => { hush(t, .42, .16, 2600, 1500); pop(900, 500, t + .28, .09, .06); },
    harvest: t => { note(N.G4, t, .5, .16); note(N.C5, t + .09, .7, .15); },
    coin:    t => { glass(N.E5, t, .7, .17); glass(N.A5, t + .08, .9, .13); },
    mail:    t => { note(N.E4, t, .8, .15); note(N.G4, t + .16, .8, .13); note(N.C5, t + .32, 1.1, .12); },
    special: t => { thump(t, .34, 130, 38, .4); glass(N.C5, t + .02, .9, .13); glass(N.G5, t + .1, 1.1, .1); },
    mixOk:   t => { [N.C4, N.E4, N.G4, N.C5, N.E5].forEach((m, i) => note(m, t + i * .11, 1.1, .15)); glass(N.C6, t + .6, 1.4, .12); glass(N.G5, t + .72, 1.4, .1); },
    mixFail: t => { const o = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter(); o.type = 'sawtooth'; lp.type = 'lowpass'; lp.frequency.value = 300;
                    o.frequency.setValueAtTime(96, t); o.frequency.exponentialRampToValueAtTime(58, t + .5);
                    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(.2, t + .05); g.gain.exponentialRampToValueAtTime(0.0001, t + .55);
                    o.connect(lp); lp.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + .6); },
    combo:   (t, n) => { const sc = [N.C4, N.D4, N.E4, N.G4, N.A4, N.C5, N.D5, N.E5]; const m = sc[Math.min(sc.length - 1, (n || 1) - 1)]; note(m, t, .7, .17); note(m + 12, t + .05, .5, .07); },
    pop:     (t, n) => { const sc = [N.C4, N.D4, N.E4, N.G4, N.A4, N.C5]; note(sc[Math.min(sc.length - 1, (n || 1) - 1)], t, .45, .13); },
  };
  // 진동 무늬: [켜짐ms, 세기, 꺼짐ms, 0, ...]
  const V = {
    tap:     [12, 70],
    special: [70, 255, 40, 0, 120, 200],
    combo:   n => { const k = Math.min(4, n); const a = []; for (let i = 0; i < k; i++) { a.push(28, 150 + i * 30, 45, 0); } return a; },
    mixFail: [420, 90, 60, 0, 260, 55],                                    // 지이잉…
    mixOk:   [55, 220, 60, 0, 55, 220, 60, 0, 55, 220, 60, 0, 90, 255],    // 징징징!
    coin:    [25, 120],
    harvest: [20, 110],
    nope:    [30, 90],
  };

  const SFX = {
    unlock() {
      if (!init()) return;
      if (ac.state === 'suspended') ac.resume();
      if (!unlocked) { unlocked = true; SFX.bgmSync(); }
    },
    play(name, n, gap = 45) {
      try {
        if (!opt().snd || !unlocked || !ac || ac.state !== 'running') return;
        const now = performance.now(); if (last[name] && now - last[name] < gap) return; last[name] = now;
        const f = P[name]; if (f) f(ac.currentTime + .005, n);
      } catch (e) { }
    },
    vib(name, n) {
      try {
        if (!opt().vib) return;
        let p = V[name]; if (typeof p === 'function') p = p(n || 1); if (!p) return;
        const now = performance.now(); if (last['v' + name] && now - last['v' + name] < 60) return; last['v' + name] = now;
        if (window.FarmBridge && FarmBridge.vibrate) SFX.lastVib = FarmBridge.vibrate(p.join(','));
        else if (navigator.vibrate) { const a = []; for (let i = 0; i < p.length; i += 2) a.push(p[i]); navigator.vibrate(a); }
      } catch (e) { }
    },
    both(name, n) { SFX.play(name, n); SFX.vib(name, n); },
    // ---- 배경음악: 천천히 흐르는 잔잔한 피아노 (직접 만든 곡이라 저작권 걱정 없음) ----
    bgmSync() {
      if (!ac || !unlocked) return;
      const want = !!opt().bgm && !document.hidden;
      if (want && !bgmOn) { bgmOn = true; nextT = ac.currentTime + .8; bgmStep = 0; bgmBus.gain.cancelScheduledValues(ac.currentTime); bgmBus.gain.setValueAtTime(bgmBus.gain.value, ac.currentTime); bgmBus.gain.linearRampToValueAtTime(.55, ac.currentTime + 3); bgmTimer = setInterval(bgmPump, 400); }
      if (!want && bgmOn) { bgmOn = false; clearInterval(bgmTimer); bgmBus.gain.cancelScheduledValues(ac.currentTime); bgmBus.gain.setValueAtTime(bgmBus.gain.value, ac.currentTime); bgmBus.gain.linearRampToValueAtTime(0, ac.currentTime + .6); }
    },
    toggle(key) { const o = (G.S.opt = G.S.opt || { snd: 1, vib: 1, bgm: 1 }); o[key] = o[key] ? 0 : 1; save(); SFX.bgmSync(); if (key === 'snd' && o.snd) SFX.play('open'); if (key === 'vib' && o.vib) SFX.vib('special'); G.dirty = true; },
  };
  // 4마디 진행: Cmaj7 - Am7 - Fmaj7 - G6 (마디마다 낮은 음 + 느린 아르페지오 + 가끔 높은 음)
  const CH = [[36, 43, 52, 59, 64], [33, 40, 52, 55, 60], [29, 36, 48, 55, 60], [31, 38, 50, 55, 62]];
  const BEAT = 1.0;      // 1박 = 1초 (느린 곡)
  function bgmPump() {
    if (!ac || !bgmOn) return;
    while (nextT < ac.currentTime + 2.2) {
      const bar = Math.floor(bgmStep / 8) % 4, k = bgmStep % 8, ch = CH[bar];
      if (k === 0) { note(ch[0], nextT, 4.2, .2, bgmBus, .35); note(ch[1], nextT + .02, 3.6, .1, bgmBus, .35); }
      // 잔잔한 아르페지오: 박마다 한 음씩, 거르기도 함
      const arp = [2, 3, 4, 3, 2, 3, 4, 3][k];
      if (Math.random() < .78) note(ch[arp] + (Math.random() < .12 ? 12 : 0), nextT + (k % 2 ? .05 : 0), 2.4, .075 + Math.random() * .03, bgmBus, .6);
      if (k === 6 && Math.random() < .5) note(ch[4] + 12, nextT + .5, 3, .05, bgmBus, .8);
      bgmStep++; nextT += BEAT * .5 * 2 * .95;
    }
  }
  SFX._d = () => ({ ac, master });
  window.SFX = SFX;

  // 첫 터치로 소리 켜기 (폰은 터치 전엔 소리를 못 냄)
  ['pointerdown', 'touchstart', 'keydown'].forEach(ev => document.addEventListener(ev, () => SFX.unlock(), { capture: true, passive: true }));
  document.addEventListener('visibilitychange', () => { if (!ac) return; if (document.hidden) { ac.suspend(); } else { ac.resume(); } SFX.bgmSync(); });

  // ---- 기존 함수에 소리 붙이기 ----
  const wrap1 = (name, before, after) => { const f = window[name]; if (typeof f !== 'function') return; window[name] = function (...a) { if (before) before(...a); const r = f.apply(this, a); if (after) after(r, ...a); return r; }; };
  wrap1('go', (n) => { if (G.screen !== n) SFX.play('nav'); });
  wrap1('openPopup', () => SFX.play('open'));
  wrap1('popupTap', (pt) => { const p = G.popup; if (!p) return; if (inRect(pt, p._close)) SFX.play('close'); else if ((p.btns || []).some(b => inRect(pt, b.rect) && !b.disabled)) SFX.both('tap'); });
  wrap1('deliver', null, () => SFX.both('coin'));
  wrap1('deliverSpecial', null, () => SFX.both('coin'));
  wrap1('claimGift', null, () => SFX.both('coin'));
  wrap1('buy', null, () => SFX.play('coin'));
  wrap1('mixSeeds', null, () => {
    if (RS.popAt && Date.now() - RS.popAt < 300) SFX.both('mixOk');
    else if (RS.msg && /아무 일도/.test(RS.msg)) SFX.both('mixFail');
  });
})();
