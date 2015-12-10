// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.android.apps.reader;

import android.app.Application;
import android.os.Environment;
import android.util.Log;

import java.io.File;
import java.io.FilenameFilter;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Locale;

import io.v.android.apps.reader.model.DeviceInfoFactory;
import io.v.baku.toolkit.debug.DebugUtils;

/**
 * Base application class that contains logic which is shared whether or not the Google Analytics
 * integration is in place.
 *
 * This class is responsible for saving logcat logs to the external storage, and clearing old logs
 * upon app startup.
 */
public abstract class BaseReaderApplication extends Application {

    private static int MAX_LOG_COUNT = 10;
    private static final String APP_NAME = "reader";
    private static final String TAG = BaseReaderApplication.class.getSimpleName();

    private String mDeviceId;

    @Override
    public void onCreate() {
        super.onCreate();

        mDeviceId = DeviceInfoFactory.getDeviceId(this);

        // Only save logcat logs in debug mode.
        if (DebugUtils.isApkDebug(this)) {
            startSavingLogs();
        }
    }

    private void startSavingLogs() {
        // Use an app-independent files directory to avoid accidentally deleting log
        // files by clearing the app data.
        File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS);
        if (!dir.exists()) {
            dir.mkdirs();
        }

        Log.i(TAG, "Logcat logs are saved at: " + dir.getAbsolutePath());

        deleteOldLogs(dir);

        // Avoid having colons in the start timestamp
        String startTime = getTimeString();

        File logcatFile = new File(dir,
                String.format("%s-%s.log", getLogPrefix(), startTime));

        try {
            // Clear the previous logs
            Runtime.getRuntime().exec("logcat -c");
            Runtime.getRuntime().exec(String.format("logcat -v time -f %s", logcatFile.getCanonicalPath()));
        } catch (IOException e) {
            Log.e(TAG, "Could not start writing the logcat file.", e);
        }
    }

    private void deleteOldLogs(File dir) {
        File[] files = dir.listFiles(new FilenameFilter() {
            @Override
            public boolean accept(File file, String s) {
                return s.startsWith(getLogPrefix());
            }
        });

        if (files == null) {
            return;
        }

        List<File> logFiles = Arrays.asList(files);

        if (logFiles.size() >= MAX_LOG_COUNT) {
            Collections.sort(logFiles);
            Collections.reverse(logFiles);
            for (File oldLog : logFiles.subList(0, logFiles.size() - MAX_LOG_COUNT + 1)) {
                oldLog.delete();
            }
        }
    }

    private String getLogPrefix() {
        return String.format("%s-%s-logcat", APP_NAME, mDeviceId);
    }

    private String getTimeString() {
        SimpleDateFormat formatter = new SimpleDateFormat(
                "yyyyMMdd-HHmmss.SSS", Locale.getDefault());
        return formatter.format(new Date());
    }

}
