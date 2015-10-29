// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.android.apps.reader.model;

import android.content.Context;
import android.graphics.Point;
import android.os.Build;
import android.provider.Settings;
import android.view.Display;
import android.view.WindowManager;

import io.v.android.apps.reader.vdl.Device;
import io.v.android.apps.reader.vdl.Screen;

/**
 * A factory class that provides the information of the current device.
 */
public class DeviceInfoFactory {

    private static final String DEVICE_TYPE = "Android";

    private static volatile Device instance;

    /**
     * Singleton method for getting the Device object that represents this device.
     *
     * @param context Android context
     * @return Device object representing this device.
     */
    public static Device get(Context context) {
        Device result = instance;
        if (instance == null) {
            synchronized (DeviceInfoFactory.class) {
                result = instance;
                if (result == null) {
                    String id = Settings.Secure.getString(
                            context.getContentResolver(),
                            Settings.Secure.ANDROID_ID);

                    String name = Build.MODEL;

                    String arch = System.getProperty("os.arch");

                    Point size = getScreenSize(context);
                    Screen screen = new Screen(size.x, size.y);

                    instance = result = new Device(id, DEVICE_TYPE, name, arch, screen);
                }
            }
        }

        return result;
    }

    /**
     * Gets the screen size.
     */
    private static Point getScreenSize(Context context) {
        WindowManager wm = (WindowManager) context
                .getSystemService(Context.WINDOW_SERVICE);
        Display display = wm.getDefaultDisplay();
        Point size = new Point();
        display.getSize(size);

        // Make width <= height, regardless of the current screen orientation.
        if (size.x > size.y) {
            size.set(size.y, size.x);
        }

        return size;
    }
}
