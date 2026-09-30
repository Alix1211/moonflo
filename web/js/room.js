// 문선농장 — 방: 그림 속 물건을 눌러 《천천히, 오늘》 기능을 여는 방
'use strict';
(() => {
  // 눌리는 물건 (그림 크기에 대한 비율: x1,y1,x2,y2). 물건보다 넉넉하게 잡음
  const OBJ = {
    pad: [
      { id: 'voice',    name: '말로 쓰기', r: [.755, .30, .905, .46] },   // 일기장 + 깃털 펜
      { id: 'calendar', name: '달력',     r: [.905, .31, 1.0, .46] },     // 탁상 달력
      { id: 'today',    name: '오늘 기록', r: [.165, .39, .36, .54] },     // 약통 + 혈압계 + 물컵
      { id: 'today',    name: '운동',     r: [.79, .70, 1.0, .93] },      // 요가 매트 + 아령
    ],
    phone: [
      { id: 'voice',    name: '말로 쓰기', r: [.58, .315, .86, .41] },
      { id: 'calendar', name: '달력',     r: [.84, .325, 1.0, .40] },
      { id: 'today',    name: '오늘 기록', r: [.08, .435, .46, .52] },
      { id: 'today',    name: '운동',     r: [.68, .565, 1.0, .66] },
    ],
  };
  const OBJ_NEW_PHONE = [                               // 새 세로 그림(노을·밤)은 구도가 달라 따로 잡음
    { id: 'voice',    name: '말로 쓰기', r: [.58, .40, .86, .49] },
    { id: 'calendar', name: '달력',     r: [.84, .37, 1.0, .46] },
    { id: 'today',    name: '오늘 기록', r: [.08, .50, .46, .60] },
    { id: 'today',    name: '운동',     r: [.68, .66, 1.0, .78] },
  ];
  const soundRect = () => { const b = backupRect(); return [b[0] - b[2] - 16, b[1], b[2], b[3]]; };
  function openSound() {
    openPopup({
      title: '소리 · 진동',
      draw(r) {
        this.btns = []; const [x, y, w] = r, pd = G.mode === 'pad', bh = pd ? 90 : 130, fs = pd ? 38 : 44, o = G.S.opt || {};
        [['snd', '효과음'], ['vib', '진동'], ['bgm', '잔잔한 배경음악']].forEach(([k, nm], i) => {
          const rc = [x, y + 20 + i * (bh + 22), w, bh];
          button(rc, `${nm}  :  ${o[k] ? '켜짐' : '꺼짐'}`, { size: fs, active: !!o[k] });
          this.btns.push({ rect: rc, fn: () => SFX.toggle(k) });
        });
        const tr = [x, y + 20 + 3 * (bh + 22), w, bh];
        button(tr, '진동 시험해 보기', { size: fs });
        this.btns.push({ rect: tr, fn: () => { const wasOn = G.S.opt.vib; G.S.opt.vib = 1; SFX.vib('mixOk'); G.S.opt.vib = wasOn; this.info = (window.FarmBridge && FarmBridge.vibInfo ? FarmBridge.vibInfo() : '폰 앱이 아니라서 진동을 못 씁니다') + ' / 결과:' + (SFX.lastVib || '-'); } });
        if (this.info) wrap(this.info, x, tr[1] + bh + 20, w, pd ? 28 : 32, '#6e4b28');
      },
    });
  }
  const roomStage = gardenStage;                          // 정원과 같은 시간표
  const newPhone = () => G.mode === 'phone' && roomStage() !== '';
  const objs = () => newPhone() ? OBJ_NEW_PHONE : OBJ[G.mode];
  const SOON = { voice: '말로 쓰기', today: '오늘 기록', calendar: '달력' };
  const rects = () => objs().map(o => ({ ...o, rc: [o.r[0] * G.L.W, o.r[1] * G.L.H, (o.r[2] - o.r[0]) * G.L.W, (o.r[3] - o.r[1]) * G.L.H] }));
  const backupRect = () => { const [sx, sy, sw, sh] = G.L.save; return [sx + sw - 300, sy + sh + 10, 300, G.mode === 'pad' ? 70 : 84]; };
  function open(id) {
    if (id === 'voice') return openDiary();
    if (id === 'today') return openToday();
    if (id === 'calendar') return openCalendar();
  }
  function sparkle(x, y, s, ph) {                       // 눌러 보라는 은은한 반짝임
    const a = .45 + .4 * Math.sin(Date.now() / 420 + ph), k = s * (.8 + .2 * Math.sin(Date.now() / 420 + ph));
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = a; ctx.fillStyle = '#fffbe0'; ctx.shadowColor = 'rgba(255,220,120,.9)'; ctx.shadowBlur = s * .6 * (G.scale || 1);
    ctx.beginPath();
    for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.moveTo(0, -k); ctx.quadraticCurveTo(k * .14, -k * .14, k, 0); ctx.quadraticCurveTo(k * .14, k * .14, 0, k); }
    ctx.fill(); ctx.restore();
  }
  // 달해(가분수 캐릭터): 러그 위에 서 있고, 누르면 잠깐 다른 동작을 함
  const CH = { pad: { x: .47, y: .80, h: .54 }, phone: { x: .5, y: .70, h: .27 } };
  const REACT = ['wave', 'jump', 'cheer', 'flower', 'yawn'];
  let pose = 'stand', poseUntil = 0;
  function charRect() {
    const c = newPhone() ? { x: .5, y: .86, h: .30 } : CH[G.mode], im = G.img['sd_' + pose] || G.img.sd_stand; if (!im) return null;
    const h = c.h * G.L.H, w = h * im.width / im.height, x = c.x * G.L.W, y = c.y * G.L.H;
    return { im, x: x - w / 2, y: y - h, w, h, feet: [x, y] };
  }
  function drawChar() {
    if (pose !== 'stand' && Date.now() > poseUntil) pose = 'stand';
    const r = charRect(); if (!r) return;
    const t = Date.now() / 900, bob = pose === 'stand' ? Math.sin(t) * r.h * .006 : 0;
    ctx.save(); ctx.globalAlpha = .22; ctx.fillStyle = '#6b4a2a';             // 발밑 그림자
    ctx.beginPath(); ctx.ellipse(r.feet[0], r.feet[1] - r.h * .01, r.w * .32, r.h * .045, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.drawImage(r.im, r.x, r.y + bob, r.w, r.h);
  }
  G.screens.room = {
    busy: () => true,                                    // 반짝임 때문에 계속 그림
    draw() {
      const ev = nextEvent();
      cachedLayer('room', [roomStage(), !!G.img[`bg_room_${G.mode}_${roomStage()}`], Math.floor(G.now / 60000), G.savedAt, G.S.coins, G.S.gems, ev ? ev.time + ev.title : '', decorKey()].join('|'), () => {
        const st_ = roomStage(), im = G.img[`bg_room_${G.mode}${st_ ? '_' + st_ : ''}`] || G.img[`bg_room_${G.mode}`];
        if (im) ctx.drawImage(im, 0, 0, G.L.W, G.L.H);
        else { ctx.fillStyle = '#f1dcc0'; ctx.fillRect(0, 0, G.L.W, G.L.H); }
        drawDecor('room');
        drawTopInfo();
      });
      drawChar();
      { const b = backupRect(); button(b, '☁ 저장 보관', { size: G.mode === 'pad' ? 30 : 34 }); const c = soundRect(); button(c, '♪ 소리·진동', { size: G.mode === 'pad' ? 30 : 34 }); }
      const s = G.mode === 'pad' ? 34 : 40;
      rects().forEach((o, i) => sparkle(o.rc[0] + o.rc[2] * .5, o.rc[1] + o.rc[3] * .18, s, i * 1.7));
    },
    up(p, tap) {
      if (!tap) return;
      const cr = charRect();
      if (cr && p.x > cr.x && p.x < cr.x + cr.w && p.y > cr.y && p.y < cr.y + cr.h) {
        pose = REACT[Math.floor(Math.random() * REACT.length)]; poseUntil = Date.now() + 2200; G.dirty = true; return;
      }
      if (inRect(p, backupRect())) { openBackup(); return; }
      if (inRect(p, soundRect())) { openSound(); return; }
      const hit = rects().find(o => inRect(p, o.rc));
      if (hit) open(hit.id);
    },
    buttonOpt(id) { if (id === 'shop') return {}; return {}; },
    onButton(id) { if (SOON[id]) open(id); },
  };
})();
