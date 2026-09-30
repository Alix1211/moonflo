// 문선농장 — 저장 보관: 폰 안의 저장을 구글 드라이브(또는 원하는 폴더)에도 복사해 두고, 필요하면 불러옴
'use strict';
(() => {
  const B = { st: null, at: 0, ask: false, msg: '' };
  const hasApp = () => !!(window.FarmBridge && FarmBridge.backupStatus);
  function refresh() { try { B.st = JSON.parse(FarmBridge.backupStatus() || 'null'); } catch (e) { B.st = null; } G.dirty = true; }
  window.onFarmBackup = () => { refresh(); B.msg = '저장 보관 위치를 정했어요. 지금부터 저장할 때마다 함께 복사돼요.'; };
  window.onFarmBackupFail = m => { B.msg = m || '저장하지 못했어요'; refresh(); };
  window.onFarmRestore = t => {
    try { const S = JSON.parse(t); if (!S || S.v !== 1) throw 0; if (S.rv !== 2) { S.rv = 2; t = JSON.stringify(S); } G.S = S; G.restoring = true; clearTimeout(saveTimer); FarmBridge.save(t); try { localStorage.setItem(SAVE_KEY, t); } catch (e) {} location.reload(); }
    catch (e) { B.msg = '이 파일은 문선농장 저장이 아니에요'; B.ask = false; G.dirty = true; }
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

  /* ---- 다른 기기에서 더 최근에 저장했으면 물어보고 불러오기 ---- */
  let declined = 0, asking = false;
  window.onFarmLinked = () => { B.msg = '연결했어요. 다른 기기의 저장이 더 최근이면 물어볼게요.'; setTimeout(() => { try { FarmBridge.checkRemote(); } catch (e) {} }, 300); };
  window.onFarmRemote = text => {
    try {
      const R = JSON.parse(text);
      if (!R || R.v !== 1 || R.rv !== 2 || !G.S || R.dev === DEV || asking) return;
      if ((R.ts || 0) <= (G.S.ts || 0) + 3000 || R.ts === declined) return;
      asking = true; try { FarmBridge.holdBackup(120000); } catch (e) {}
      const done = () => { asking = false; try { FarmBridge.holdBackup(0); } catch (e) {} };
      openPopup({
        title: '다른 기기의 저장',
        draw(r) {
          this.btns = []; const [x, y, w] = r, pd = G.mode === 'pad', fs = pd ? 36 : 40, bh = pd ? 100 : 130;
          wrap(`다른 기기에서 ${fmt(R.ts)}에 저장한 더 최근 진행이 있어요.\n불러오면 이 기기의 지금 진행은 그 진행으로 바뀌어요.`, x, y + 10, w, fs, '#6e4b28');
          const b1 = [x, y + (pd ? 250 : 330), w, bh]; button(b1, '불러와서 이어서 하기', { size: fs }); this.btns.push({ rect: b1, fn: () => { done(); window.onFarmRestore(text); } });
          const b2 = [x, b1[1] + bh + 20, w, bh]; button(b2, '이 기기 진행 그대로 두기', { size: fs }); this.btns.push({ rect: b2, fn: () => { declined = R.ts; done(); G.popup = null; } });
        },
      });
    } catch (e) { }
  };
  const chk = () => { try { if (window.FarmBridge && FarmBridge.checkRemote && G.S) FarmBridge.checkRemote(); } catch (e) {} };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(chk, 1500); });
  setTimeout(chk, 6000);
})();
