package com.moonsunfarm.game;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.io.ByteArrayOutputStream;
import java.util.Calendar;
import java.util.HashSet;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

/** 알림: 꽃이 자란 때(예약)와 새 편지(주기적 확인). 밤(22시~7시)에는 소리 없이 조용히 표시합니다. */
public class Notify extends BroadcastReceiver {
    static final String CH = "farm_main", CH_Q = "farm_quiet";
    static final long POLL_MS = 30L * 60 * 1000;

    static SharedPreferences prefs(Context c) { return c.getSharedPreferences("farm", Context.MODE_PRIVATE); }

    static boolean quietNow() { int h = Calendar.getInstance().get(Calendar.HOUR_OF_DAY); return h >= 22 || h < 7; }

    static void post(Context c, int id, String title, String body) {
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        nm.createNotificationChannel(new NotificationChannel(CH, "꽃·편지 알림", NotificationManager.IMPORTANCE_DEFAULT));
        nm.createNotificationChannel(new NotificationChannel(CH_Q, "조용한 알림(밤)", NotificationManager.IMPORTANCE_LOW));
        Intent open = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, 1, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification n = new Notification.Builder(c, quietNow() ? CH_Q : CH)
            .setSmallIcon(R.drawable.ic_notify).setContentTitle(title).setContentText(body)
            .setContentIntent(pi).setAutoCancel(true).build();
        try { nm.notify(id, n); } catch (SecurityException e) { }
    }

    /** 꽃 알림 예약. json = [{"at":밀리초,"title":"..","body":".."}, ...] */
    static void applyGrow(Context c, String json) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        SharedPreferences p = prefs(c);
        int old = p.getInt("growN", 0);
        for (int i = 0; i < old; i++) am.cancel(growPi(c, i, "", ""));
        int n = 0;
        try {
            JSONArray a = new JSONArray(json);
            long now = System.currentTimeMillis();
            for (int i = 0; i < a.length() && n < 8; i++) {
                JSONObject o = a.getJSONObject(i);
                long at = o.getLong("at"); if (at <= now) continue;
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, growPi(c, n, o.optString("title", "문플로"), o.optString("body", "")));
                n++;
            }
        } catch (Exception e) { }
        p.edit().putInt("growN", n).putString("growJson", json).apply();
    }
    static PendingIntent growPi(Context c, int i, String title, String body) {
        Intent it = new Intent(c, Notify.class).setAction("grow" + i).putExtra("kind", "grow").putExtra("id", 300 + i).putExtra("title", title).putExtra("body", body);
        return PendingIntent.getBroadcast(c, 300 + i, it, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    /** 편지 확인 예약 (30분마다) */
    static void scheduleMail(Context c, long delayMs) {
        if (prefs(c).getString("mailUrl", "").isEmpty()) return;
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        Intent it = new Intent(c, Notify.class).setAction("mailpoll").putExtra("kind", "mail");
        PendingIntent pi = PendingIntent.getBroadcast(c, 299, it, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, System.currentTimeMillis() + delayMs, pi);
    }

    @Override public void onReceive(Context c, Intent it) {
        String act = it.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(act)) {
            applyGrow(c, prefs(c).getString("growJson", "[]")); scheduleMail(c, 60_000); return;
        }
        String kind = it.getStringExtra("kind");
        if ("grow".equals(kind)) { post(c, it.getIntExtra("id", 300), it.getStringExtra("title"), it.getStringExtra("body")); return; }
        if ("mail".equals(kind)) {
            final PendingResult pr = goAsync(); final Context ctx = c.getApplicationContext();
            new Thread(() -> { try { pollMail(ctx); } catch (Throwable e) { } finally { scheduleMail(ctx, POLL_MS); pr.finish(); } }).start();
        }
    }

    static void pollMail(Context c) throws Exception {
        SharedPreferences p = prefs(c);
        String u = p.getString("mailUrl", ""); if (u.isEmpty()) return;
        HttpURLConnection h = (HttpURLConnection) new URL(u + (u.contains("?") ? "&" : "?") + "t=" + System.currentTimeMillis()).openConnection();
        h.setConnectTimeout(15000); h.setReadTimeout(20000); h.setInstanceFollowRedirects(true);
        if (h.getResponseCode() != 200) return;
        InputStream in = h.getInputStream(); ByteArrayOutputStream bo = new ByteArrayOutputStream(); byte[] b = new byte[4096]; int r;
        while ((r = in.read(b)) > 0) bo.write(b, 0, r);
        JSONArray a = new JSONArray(bo.toString("UTF-8"));
        Set<String> seen = new HashSet<>(); for (String s : p.getString("mailSeen", "").split(",")) if (!s.isEmpty()) seen.add(s);
        int fresh = 0; long now = System.currentTimeMillis(); StringBuilder add = new StringBuilder();
        for (int i = 0; i < a.length(); i++) {
            JSONObject o = a.getJSONObject(i); String id = String.valueOf(o.opt("id"));
            if (seen.contains(id)) continue;
            String at = o.optString("at", "");
            if (!at.isEmpty()) { try { if (java.time.Instant.parse(at).toEpochMilli() > now) continue; } catch (Exception e) { } }
            fresh++; add.append(',').append(id);
        }
        if (fresh > 0) {
            post(c, 299, "문플로", fresh > 1 ? "새 편지가 " + fresh + "통 도착했어요" : "우체통에 새 편지가 도착했어요");
            p.edit().putString("mailSeen", p.getString("mailSeen", "") + add).apply();
        }
    }
}
