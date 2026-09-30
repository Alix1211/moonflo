// 문선농장 — 저장 보관: 폰 안의 저장을 구글 드라이브(또는 원하는 폴더)에도 복사해 두고, 필요하면 불러옴
'use strict';
(() => {
  const B = { st: null, at: 0, ask: false, msg: '' };
  const hasApp = () => !!(window.FarmBridge && FarmBridge.backupStatus);
  function refresh() { try { B.st = JSON.parse(FarmBridge.backupStatus() || 'null'); } catch (e) { B.st = null; } G.dirty = true; }
  window.onFarmBackup = () => { refresh(); B.msg = '저장 보관 위치를 정했어요. 지금부터 저장할 때마다 함께 복사돼요.'; };
  window.onFarmBackupFail = m => { B.msg = m || '저장하지 못했어요'; refresh(); };
  // 실제로 불러오기 (확인 없이) — 다른 기기 저장 물어보기에서 '불러오기'를 눌렀을 때도 이것을 씀
  window.applyRestore = t => {
    const S = JSON.parse(t); S.rv = 2; S.syncTs = S.ts || Date.now(); t = JSON.stringify(S);
    G.S = S; G.restoring = true; clearTimeout(saveTimer); FarmBridge.save(t); try { localStorage.setItem(SAVE_KEY, t); } catch (e) {} location.reload();
  };
  // 파일을 고르면 먼저 그 파일 안의 진행을 보여 주고 확인받음 (엉뚱한 파일을 고르는 실수 방지)
  window.onFarmRestore = t => {
    let S = null; try { S = JSON.parse(t); } catch (e) {}
    if (!S || S.v !== 1) { B.msg = '이 파일은 문플로 저장이 아니에요'; B.ask = false; G.dirty = true; return; }
    const fl = S.flowers ? Object.values(S.flowers).reduce((a, b) => a + (+b || 0), 0) : 0;
    const info = [`저장한 때: ${S.ts ? fmt(S.ts) : '알 수 없음'}`, `돈 ${S.coins || 0} · 다이아 ${S.gems || 0}`, `화단 ${(S.beds || []).length}개 · 지금까지 수확 ${(S.stats && S.stats.harvest) || 0}송이 · 가진 꽃 ${fl}송이`];
    openPopup({
      title: '이 파일을 불러올까요?',
      draw(r) {
        this.btns = []; const [x, y, w] = r, pd = G.mode === 'pad', fs = pd ? 36 : 40, bh = pd ? 100 : 130;
        wrap('고른 파일 안의 진행이에요:\n' + info.join('\n'), x, y + 10, w, fs, '#6e4b28');
        const b1 = [x, y + (pd ? 330 : 420), w, bh]; button(b1, '이 진행으로 불러오기', { size: fs }); this.btns.push({ rect: b1, fn: () => window.applyRestore(t) });
        const b2 = [x, b1[1] + bh + 20, w, bh]; button(b2, '다른 파일 고르기', { size: fs }); this.btns.push({ rect: b2, fn: () => { G.popup = null; try { FarmBridge.pickRestore(); } catch (e) {} } });
      },
    });
  };
  const fmt = t => { if (!t) return '아직 없어요'; const d = new Date(t); return `${d.getMonth() + 1}월 ${d.getDate()}일 ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };
  window.openBackup = function () {
    B.ask = false; B.msg = ''; if (hasApp()) refresh();
    openPopup({
      title: '저장 보관',
      draw(r) {
        this.btns = []; const [x, y, w, h] = r, pd = G.mode === 'pad', fs = pd ? 34 : 38, bh = pd ? 84 : 112;
        if (!hasApp()) { wrap('이 기능은 폰 앱에서만 쓸 수 있어요.', x, y + 20, w, fs, '#6e4b28'); return; }
        const linked = B.st && B.st.linked;
        text(linked ? '보관 위치: 연결됨' : '보관 위치: 아직 정하지 않았어요', x, y + 30, fs, linked ? '#3d7a2a' : '#8a6a44');
        text(`마지막으로 복사한 때: ${fmt(B.st && B.st.at)}`, x, y + 30 + fs * 1.6, fs - 4, '#8a6a44', 'left', false, 500);
        let cy = y + 30 + fs * 3.2;
        const b1 = [x, cy, w, bh]; button(b1, linked ? '보관 위치 바꾸기 (구글 드라이브 등)' : '보관 위치 정하기 (구글 드라이브 등)', { size: fs }); this.btns.push({ rect: b1, fn: () => { B.msg = ''; try { FarmBridge.pickBackup(); } catch (e) {} } });
        cy += bh + 18;
        const bl = [x, cy, w, bh]; button(bl, '이미 있는 보관 파일에 연결하기', { size: fs }); this.btns.push({ rect: bl, fn: () => { B.msg = ''; try { FarmBridge.pickLink(); } catch (e) {} } });
        cy += bh + 18;
        const b2 = [x, cy, w, bh]; button(b2, '지금 바로 복사하기', { size: fs, disabled: !linked }); this.btns.push({ rect: b2, disabled: !linked, fn: () => { save(true); try { B.msg = FarmBridge.backupNow() ? '복사했어요' : '복사하지 못했어요'; } catch (e) {} refresh(); } });
        cy += bh + 18;
        if (!B.ask) { const b3 = [x, cy, w, bh]; button(b3, '보관해 둔 저장 불러오기', { size: fs }); this.btns.push({ rect: b3, fn: () => { B.ask = true; B.msg = ''; } }); }
        else {
          wrap('지금 진행 상황이 사라지고 고른 파일 내용으로 바뀝니다. 계속할까요?', x, cy, w, fs - 4, '#b03a2a');
          const hw = (w - 20) / 2, b4 = [x, cy + fs * 3.4, hw, bh], b5 = [x + hw + 20, cy + fs * 3.4, hw, bh];
          button(b4, '파일 고르기', { size: fs }); this.btns.push({ rect: b4, fn: () => { B.ask = false; try { FarmBridge.pickRestore(); } catch (e) {} } });
          button(b5, '그만두기', { size: fs }); this.btns.push({ rect: b5, fn: () => { B.ask = false; } });
        }
        if (B.msg) wrap(B.msg, x, y + h - fs * 2.4, w, fs - 6, '#3d7a2a');
      },
    });
  };

  /* ---- 여러 기기가 한 파일을 함께 쓸 때: 다른 기기가 더 나중에 저장했으면 덮어쓰지 않고 먼저 물어봄 ----
     syncTs = 이 기기가 알고 있는 '보관 파일의 마지막 저장 시각'. 파일 안의 시각이 이보다 새로우면 다른 기기가 쓴 것 */
  let asking = false;
  const hold = on => { G.syncHold = on; try { FarmBridge.holdBackup(on ? 30 * 60000 : 0); } catch (e) {} };
  if (window.FarmBridge && FarmBridge.holdBackup) hold(true);   // 확인이 끝나기 전에는 보관 파일에 쓰지 않음
  window.onFarmLinked = () => { B.msg = '연결했어요. 파일 안의 진행을 확인할게요.'; chk(true); };
  const info = R => { const fl = R.flowers ? Object.values(R.flowers).reduce((a, b) => a + (+b || 0), 0) : 0; return `돈 ${R.coins || 0} · 다이아 ${R.gems || 0} · 화단 ${(R.beds || []).length}개 · 수확 ${(R.stats && R.stats.harvest) || 0}송이 · 가진 꽃 ${fl}송이`; };
  window.onFarmRemote = text => {
    if (asking) return;
    let R = null; try { R = JSON.parse(text); } catch (e) {}
    if (!R || R.v !== 1 || !G.S || !((R.ts || 0) > (G.S.syncTs || 0) + 2000)) { hold(false); return; }   // 파일이 없거나 이 기기가 마지막으로 쓴 것 → 그냥 진행
    asking = true; hold(true);
    const done = () => { asking = false; G.S.syncTs = R.ts; hold(false); };
    openPopup({
      title: '보관 파일에 다른 진행이 있어요', _sync: true,
      draw(r) {
        this.btns = []; const [x, y, w] = r, pd = G.mode === 'pad', fs = pd ? 32 : 38, bh = pd ? 96 : 124;
        wrap(`다른 기기에서 ${fmt(R.ts)}에 저장한 진행이에요.\n${info(R)}\n\n지금 이 기기: ${info(G.S)}\n\n어느 쪽으로 할까요?`, x, y + 6, w, fs, '#6e4b28');
        const b1 = [x, y + (pd ? 420 : 560), w, bh]; button(b1, '파일의 진행으로 이어서 하기', { size: fs }); this.btns.push({ rect: b1, fn: () => { asking = false; window.applyRestore(text); } });
        const b2 = [x, b1[1] + bh + 18, w, bh]; button(b2, '이 기기 진행으로 파일 덮어쓰기', { size: fs }); this.btns.push({ rect: b2, fn: () => { done(); G.popup = null; save(true); setTimeout(() => { try { FarmBridge.backupNow(); } catch (e) {} }, 400); } });
      },
    });
  };
  function chk(force) {
    try {
      if (asking && !(G.popup && G.popup._sync)) asking = false;          // 고르지 않고 닫았으면 다음에 다시 물어봄 (그동안 파일엔 안 씀)
      if (!(window.FarmBridge && FarmBridge.checkRemote && G.S) || asking) return;
      hold(true); FarmBridge.checkRemote();
      setTimeout(() => { if (!asking && G.syncHold && !(G.popup && G.popup._sync)) hold(false); }, 20000);   // 답이 없으면 막아 둔 것 풀기
    } catch (e) { hold(false); }
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(chk, 800); });
  { const t = setInterval(() => { if (G.S) { clearInterval(t); chk(); } }, 300); }
})();
