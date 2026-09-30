package com.moonsunfarm.game;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** 폰을 껐다 켜도 알림 예약이 이어지게 합니다. */
public class BootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c, Intent it) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(it.getAction())) {
            Notify.applyGrow(c, Notify.prefs(c).getString("growJson", "[]"));
            Notify.scheduleMail(c, 60_000);
        }
    }
}
