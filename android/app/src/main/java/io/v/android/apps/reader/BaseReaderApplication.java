// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.android.apps.reader;

import android.app.Application;

import static io.v.android.apps.reader.debug.DebugUtils.startSavingLogs;
import static io.v.baku.toolkit.debug.DebugUtils.isApkDebug;

/**
 * Base application class that contains logic which is shared whether or not the Google Analytics
 * integration is in place.
 *
 * This class is responsible for saving logcat logs to the external storage, and clearing old logs
 * upon app startup.
 */
public abstract class BaseReaderApplication extends Application {

    @Override
    public void onCreate() {
        super.onCreate();

        // Only save logcat logs in debug mode.
        // It is possible that we do not have storage access permission at the moment. In that case,
        // startSavingLogs() should be called again after the permission is granted.
        if (isApkDebug(this)) {
            startSavingLogs(this, Constants.APP_NAME);
        }
    }

}
