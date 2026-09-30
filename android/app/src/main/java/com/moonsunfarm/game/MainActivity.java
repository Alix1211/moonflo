package com.moonsunfarm.game;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.CalendarContract;
import android.speech.RecognizerIntent;
import android.util.Log;
import android.view.Display;
import android.view.View;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import androidx.webkit.WebViewAssetLoader;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import org.json.JSONArray;
import org.json.JSONObject;

public final class MainActivity extends Activity {
    private WebView game;
    private static final String SAVE_FILE = "farm-save.json";
    private static final String SAVE_BAK = "farm-save.bak.json";
    private static final int REQ_VOICE = 501, REQ_BACKUP = 502, REQ_RESTORE = 503, REQ_PERM = 504, REQ_LINK = 505;
    private SharedPreferences prefs;
    private String lastSave = "";
    private long lastBackupWrite = 0, holdUntil = 0, lastRemoteChk = 0;
    private final Handler ui = new Handler(Looper.getMainLooper());
    // 자동 업데이트: 켤 때마다 인터넷의 최신 게임을 불러오고, 안 되면 앱 안에 든 게임으로 실행
    private static final String REMOTE = "https://alix1211.github.io/moonflo/";
    private static final String LOCAL = "https://appassets.androidplatform.net/assets/index.html";
    private boolean usingLocal = false, remoteOk = false;
    private void loadLocal() { if (usingLocal) return; usingLocal = true; if (game != null) game.loadUrl(LOCAL); }

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences("farm", MODE_PRIVATE);
        hideBars();
        getWindow().getDecorView().setOnSystemUiVisibilityChangeListener(v -> ui.postDelayed(this::hideBars, 1500));
        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            WebView.setWebContentsDebuggingEnabled(true);
        }
        game = new WebView(this);
        game.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        game.setBackgroundColor(Color.rgb(47, 74, 34));
        WebSettings s = game.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        game.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                return loader.shouldInterceptRequest(r.getUrl());
            }
            @Override public void onReceivedError(WebView v, WebResourceRequest r, android.webkit.WebResourceError e) {
                if (r.isForMainFrame() && !usingLocal) ui.post(MainActivity.this::loadLocal);
            }
            @Override public void onReceivedHttpError(WebView v, WebResourceRequest r, WebResourceResponse e) {
                if (r.isForMainFrame() && !usingLocal) ui.post(MainActivity.this::loadLocal);
            }
            @Override public void onPageFinished(WebView v, String url) {
                if (url != null && url.startsWith(REMOTE)) remoteOk = true;
            }
            @Override public boolean onRenderProcessGone(WebView v, RenderProcessGoneDetail d) {
                String why = d.didCrash() ? "화면 엔진이 멈췄습니다(충돌)" : "화면 엔진이 메모리 부족으로 종료됐습니다";
                Toast.makeText(MainActivity.this, why + " - 다시 시작합니다", Toast.LENGTH_LONG).show();
                recreate();
                return true;
            }
        });
        game.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onConsoleMessage(ConsoleMessage m) {
                Log.d("MoonSunFarm", m.message() + " @" + m.sourceId() + ":" + m.lineNumber());
                return true;
            }
        });
        game.addJavascriptInterface(new FarmBridge(), "FarmBridge");
        setContentView(game);
        requestHighestRefreshRate();
        java.util.ArrayList<String> need = new java.util.ArrayList<>();
        if (checkSelfPermission(Manifest.permission.READ_CALENDAR) != PackageManager.PERMISSION_GRANTED) need.add(Manifest.permission.READ_CALENDAR);
        if (android.os.Build.VERSION.SDK_INT >= 33 && checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) need.add("android.permission.POST_NOTIFICATIONS");
        if (!need.isEmpty()) requestPermissions(need.toArray(new String[0]), REQ_PERM);
        if (prefs.getBoolean("offlineOnly", false)) loadLocal();
        else {
            game.loadUrl(REMOTE + "index.html");
            ui.postDelayed(() -> { if (!remoteOk) loadLocal(); }, 15000);   // 15초 안에 못 받으면 앱 안의 게임으로
        }
    }

    private void hideBars() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
    }

    @Override public void onWindowFocusChanged(boolean hasFocus) { super.onWindowFocusChanged(hasFocus); if (hasFocus) hideBars(); }

    private void requestHighestRefreshRate() {
        try {
            Display d = getWindowManager().getDefaultDisplay();
            float best = d.getRefreshRate();
            for (float r : d.getSupportedRefreshRates()) if (r > best) best = r;
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.preferredRefreshRate = best;
            getWindow().setAttributes(lp);
        } catch (Exception ignored) { }
    }

    @Override protected void onResume() { super.onResume(); hideBars(); requestHighestRefreshRate(); }

    @Override protected void onPause() {
        super.onPause();
        if (game != null) game.evaluateJavascript("try{save(true)}catch(e){}", null);
        ui.postDelayed(() -> writeBackup(true), 600);
    }

    private void js(String code) { if (game != null) game.post(() -> game.evaluateJavascript(code, null)); }

    /* ---------- 보관 위치(구글 드라이브 등) ---------- */
    private Uri backupUri() { String u = prefs.getString("backupUri", null); return u == null ? null : Uri.parse(u); }

    private boolean writeBackup(boolean force) {
        Uri u = backupUri(); String data = lastSave;
        if (u == null || data == null || data.length() < 2) return false;
        long now = System.currentTimeMillis();
        if (now < holdUntil) return false;      // 다른 기기의 더 새 저장을 물어보는 중에는 덮어쓰지 않음
        if (!force && now - lastBackupWrite < 60000) return false;
        lastBackupWrite = now;
        new Thread(() -> {
            try (OutputStream o = getContentResolver().openOutputStream(u, "wt")) {
                if (o == null) return;
                o.write(data.getBytes(StandardCharsets.UTF_8));
                prefs.edit().putLong("backupAt", System.currentTimeMillis()).apply();
            } catch (Exception e) { Log.w("MoonSunFarm", "backup fail " + e); }
        }).start();
        return true;
    }

    @Override protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req == REQ_VOICE) {
            String text = "";
            if (res == RESULT_OK && data != null) {
                ArrayList<String> r = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
                if (r != null && !r.isEmpty()) text = r.get(0);
            }
            js("window.onFarmVoice&&window.onFarmVoice(" + JSONObject.quote(text) + ")");
        } else if (req == REQ_BACKUP) {
            if (res == RESULT_OK && data != null && data.getData() != null) {
                Uri u = data.getData();
                try { getContentResolver().takePersistableUriPermission(u, Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION); } catch (Exception ignored) { }
                prefs.edit().putString("backupUri", u.toString()).apply();
                writeBackup(true);
                ui.postDelayed(() -> js("window.onFarmBackup&&window.onFarmBackup()"), 700);
            } else js("window.onFarmBackupFail&&window.onFarmBackupFail('위치를 정하지 않았어요')");
        } else if (req == REQ_LINK) {          // 이미 있는 보관 파일에 연결 (덮어쓰지 않고 그대로 연결만)
            if (res == RESULT_OK && data != null && data.getData() != null) {
                Uri u = data.getData();
                try { getContentResolver().takePersistableUriPermission(u, Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION); } catch (Exception ignored) { }
                prefs.edit().putString("backupUri", u.toString()).apply();
                lastRemoteChk = 0;
                ui.postDelayed(() -> js("window.onFarmBackup&&window.onFarmBackup();window.onFarmLinked&&window.onFarmLinked()"), 500);
            } else js("window.onFarmBackupFail&&window.onFarmBackupFail('파일을 고르지 않았어요')");
        } else if (req == REQ_RESTORE) {
            if (res == RESULT_OK && data != null && data.getData() != null) {
                try (InputStream in = getContentResolver().openInputStream(data.getData()); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                    byte[] buf = new byte[65536]; int n; while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                    js("window.onFarmRestore&&window.onFarmRestore(" + JSONObject.quote(out.toString("UTF-8")) + ")");
                } catch (Exception e) { js("window.onFarmBackupFail&&window.onFarmBackupFail('파일을 읽지 못했어요')"); }
            }
        }
    }

    /* ---------- 달력 ---------- */
    private boolean hasCal() { return checkSelfPermission(Manifest.permission.READ_CALENDAR) == PackageManager.PERMISSION_GRANTED; }

    private static final class Ev { long begin, end; boolean allDay; String title; }

    private ArrayList<Ev> queryEvents(long from, long to) {
        ArrayList<Ev> list = new ArrayList<>();
        if (!hasCal()) return list;
        android.net.Uri.Builder b = CalendarContract.Instances.CONTENT_URI.buildUpon();
        android.content.ContentUris.appendId(b, from); android.content.ContentUris.appendId(b, to);
        try (Cursor c = getContentResolver().query(b.build(), new String[]{CalendarContract.Instances.TITLE, CalendarContract.Instances.BEGIN, CalendarContract.Instances.END, CalendarContract.Instances.ALL_DAY}, null, null, CalendarContract.Instances.BEGIN + " ASC")) {
            while (c != null && c.moveToNext()) {
                Ev e = new Ev(); e.title = c.getString(0) == null ? "" : c.getString(0); e.begin = c.getLong(1); e.end = c.getLong(2); e.allDay = c.getInt(3) == 1;
                list.add(e);
            }
        } catch (Exception ex) { Log.w("MoonSunFarm", "cal " + ex); }
        return list;
    }

    private static String keyOf(Ev e) {          // 종일 일정은 UTC 기준 날짜
        Calendar c = Calendar.getInstance(e.allDay ? TimeZone.getTimeZone("UTC") : TimeZone.getDefault()); c.setTimeInMillis(e.begin);
        return c.get(Calendar.YEAR) + "-" + (c.get(Calendar.MONTH) + 1) + "-" + c.get(Calendar.DAY_OF_MONTH);
    }
    private static String hm(Ev e) { return e.allDay ? "" : new SimpleDateFormat("HH:mm", Locale.KOREA).format(new Date(e.begin)); }

    /* ---------- 앱과 게임 사이 다리 ---------- */

    private Vibrator getVib() {
        if (android.os.Build.VERSION.SDK_INT >= 31) {
            android.os.VibratorManager vm = (android.os.VibratorManager) getSystemService(VIBRATOR_MANAGER_SERVICE);
            return vm == null ? null : vm.getDefaultVibrator();
        }
        return (Vibrator) getSystemService(VIBRATOR_SERVICE);
    }
    private void hapticFallback() {
        try { runOnUiThread(() -> { View v = getWindow().getDecorView(); v.performHapticFeedback(android.view.HapticFeedbackConstants.LONG_PRESS, android.view.HapticFeedbackConstants.FLAG_IGNORE_GLOBAL_SETTING); }); } catch (Throwable e) { }
    }

    private final class FarmBridge {
        // 진동: "시간,세기,시간,세기..." (시간 ms, 세기 0~255; 세기 0이면 쉬는 시간). 항상 "켜짐"으로 시작
        @JavascriptInterface public String vibrate(String pat) {
            try {
                Vibrator vb = getVib();
                if (vb == null || !vb.hasVibrator()) { hapticFallback(); return "no-vibrator"; }
                String[] a = pat.split(",");
                int n = a.length / 2; if (n < 1) return "bad";
                long[] t = new long[n]; int[] amp = new int[n];
                for (int i = 0; i < n; i++) { t[i] = Math.max(1, Long.parseLong(a[i * 2].trim())); amp[i] = Math.max(0, Math.min(255, Integer.parseInt(a[i * 2 + 1].trim()))); }
                VibrationEffect ef;
                if (vb.hasAmplitudeControl()) ef = VibrationEffect.createWaveform(t, amp, -1);
                else { long[] tt = new long[n + 1]; for (int i = 0; i < n; i++) tt[i + 1] = t[i]; ef = VibrationEffect.createWaveform(tt, -1); }
                vb.cancel();
                // 알람 용도로 보내면 기기의 '터치 진동' 설정과 상관없이 울림
                vb.vibrate(ef, new android.media.AudioAttributes.Builder().setUsage(android.media.AudioAttributes.USAGE_ALARM).setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
                return "ok";
            } catch (Throwable e) { hapticFallback(); return "err:" + e; }
        }
        // 꽃 알림 예약 (json 배열) / 편지 확인 주소와 이미 받은 편지 번호
        @JavascriptInterface public void schedule(String json) { try { Notify.applyGrow(MainActivity.this, json); } catch (Throwable e) { } }
        @JavascriptInterface public void mailSync(String url, String seenCsv) {
            try {
                prefs.edit().putString("mailUrl", url).putString("mailSeen", seenCsv).apply();
                Notify.scheduleMail(MainActivity.this, Notify.POLL_MS);
            } catch (Throwable e) { }
        }
        // 보관 위치의 저장을 읽어 게임에 알려 줌 (다른 기기에서 더 최근에 저장했는지 게임이 비교)
        @JavascriptInterface public void holdBackup(long ms) { holdUntil = ms > 0 ? System.currentTimeMillis() + ms : 0; }
        @JavascriptInterface public void checkRemote() {
            final Uri u = backupUri(); if (u == null) { js("window.onFarmRemote&&window.onFarmRemote('')"); return; }
            long now = System.currentTimeMillis(); if (now - lastRemoteChk < 20000) { js("window.onFarmRemote&&window.onFarmRemote('')"); return; } lastRemoteChk = now;
            new Thread(() -> {
                try (InputStream in = getContentResolver().openInputStream(u); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                    if (in == null) { js("window.onFarmRemote&&window.onFarmRemote('')"); return; }
                    byte[] buf = new byte[65536]; int n; while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                    String s = out.toString("UTF-8"); if (s.length() < 2) { js("window.onFarmRemote&&window.onFarmRemote('')"); return; }
                    js("window.onFarmRemote&&window.onFarmRemote(" + JSONObject.quote(s) + ")");
                } catch (Exception e) { Log.w("MoonSunFarm", "remote read fail " + e); js("window.onFarmRemote&&window.onFarmRemote('')"); }
            }).start();
        }
        @JavascriptInterface public String gameSource() { return usingLocal ? "local" : "online"; }
        @JavascriptInterface public String vibInfo() {
            try { Vibrator vb = getVib(); return "진동장치:" + (vb != null && vb.hasVibrator() ? "있음" : "없음") + " 세기조절:" + (vb != null && vb.hasAmplitudeControl() ? "됨" : "안됨") + " 안드로이드:" + android.os.Build.VERSION.SDK_INT; }
            catch (Throwable e) { return "확인 실패"; }
        }
        @JavascriptInterface public void save(String json) {
            if (json == null || json.length() < 2 || json.length() > 8000000) return;
            lastSave = json;
            try {
                File f = new File(getFilesDir(), SAVE_FILE);
                if (f.exists()) { File b = new File(getFilesDir(), SAVE_BAK); if (b.exists()) b.delete(); f.renameTo(b); }
                try (FileOutputStream o = new FileOutputStream(new File(getFilesDir(), SAVE_FILE))) { o.write(json.getBytes(StandardCharsets.UTF_8)); }
            } catch (Exception ignored) { }
            writeBackup(false);
        }

        @JavascriptInterface public String load() {
            for (String name : new String[]{SAVE_FILE, SAVE_BAK}) {
                try {
                    File f = new File(getFilesDir(), name);
                    if (!f.exists() || f.length() < 2) continue;
                    try (FileInputStream in = new FileInputStream(f); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                        byte[] buf = new byte[65536]; int n;
                        while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                        String t = out.toString("UTF-8");
                        if (t.startsWith("{")) { lastSave = t; return t; }
                    }
                } catch (Exception ignored) { }
            }
            return "";
        }

        // 말로 쓰기: 구글 음성 입력 창을 띄우고, 결과는 window.onFarmVoice(글)로 돌려줌
        @JavascriptInterface public void startVoice() {
            runOnUiThread(() -> {
                try {
                    Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                    i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                    i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "ko-KR");
                    i.putExtra(RecognizerIntent.EXTRA_PROMPT, "말씀하세요");
                    startActivityForResult(i, REQ_VOICE);
                } catch (ActivityNotFoundException e) {
                    Toast.makeText(MainActivity.this, "이 폰에는 음성 입력이 없어요. 키보드의 마이크를 써 주세요", Toast.LENGTH_LONG).show();
                    js("window.onFarmVoice&&window.onFarmVoice('')");
                }
            });
        }

        // 달력: 그 달의 일정 [{date:'2026-9-30', time:'14:00', title:'...'}]
        @JavascriptInterface public String getEvents(int y, int m) {
            JSONArray arr = new JSONArray();
            try {
                Calendar a = Calendar.getInstance(); a.clear(); a.set(y, m - 1, 1);
                Calendar z = (Calendar) a.clone(); z.add(Calendar.MONTH, 1);
                long from = a.getTimeInMillis() - 86400000L, to = z.getTimeInMillis() + 86400000L;
                for (Ev e : queryEvents(from, to)) {
                    String k = keyOf(e); String[] p = k.split("-");
                    if (Integer.parseInt(p[0]) != y || Integer.parseInt(p[1]) != m) continue;
                    arr.put(new JSONObject().put("date", k).put("time", hm(e)).put("title", e.title));
                    if (arr.length() >= 300) break;
                }
            } catch (Exception ignored) { }
            return arr.toString();
        }

        // 위쪽에 보이는 다음 일정 {time, title} (2주 안)
        @JavascriptInterface public String nextEvent() {
            try {
                long now = System.currentTimeMillis();
                ArrayList<Ev> l = queryEvents(now, now + 14L * 86400000L);
                Collections.sort(l, Comparator.comparingLong(e -> e.begin));
                Calendar t0 = Calendar.getInstance(); String today = t0.get(Calendar.YEAR) + "-" + (t0.get(Calendar.MONTH) + 1) + "-" + t0.get(Calendar.DAY_OF_MONTH);
                for (Ev e : l) {
                    if (e.end <= now) continue;
                    String k = keyOf(e), t;
                    if (k.equals(today)) t = e.allDay ? "오늘" : hm(e);
                    else { String[] p = k.split("-"); t = p[1] + "/" + p[2] + (e.allDay ? "" : " " + hm(e)); }
                    return new JSONObject().put("time", t).put("title", e.title).toString();
                }
            } catch (Exception ignored) { }
            return "null";
        }

        @JavascriptInterface public String backupStatus() {
            try { return new JSONObject().put("linked", backupUri() != null).put("at", prefs.getLong("backupAt", 0)).toString(); }
            catch (Exception e) { return "null"; }
        }
        @JavascriptInterface public void pickBackup() {
            runOnUiThread(() -> {
                Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                i.addCategory(Intent.CATEGORY_OPENABLE); i.setType("application/json"); i.putExtra(Intent.EXTRA_TITLE, "moonsun-farm-save.json");
                i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
                startActivityForResult(i, REQ_BACKUP);
            });
        }
        @JavascriptInterface public boolean backupNow() { return writeBackup(true); }
        @JavascriptInterface public void pickLink() {
            runOnUiThread(() -> {
                Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                i.addCategory(Intent.CATEGORY_OPENABLE); i.setType("*/*");
                i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
                startActivityForResult(i, REQ_LINK);
            });
        }
        @JavascriptInterface public void pickRestore() {
            runOnUiThread(() -> {
                Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                i.addCategory(Intent.CATEGORY_OPENABLE); i.setType("*/*");
                startActivityForResult(i, REQ_RESTORE);
            });
        }
    }

    @Override protected void onDestroy() {
        if (game != null) { game.destroy(); game = null; }
        super.onDestroy();
    }
}
