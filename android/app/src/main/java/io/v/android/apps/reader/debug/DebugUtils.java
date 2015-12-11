// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.android.apps.reader.debug;

import android.content.Context;
import android.util.Log;

import java.io.File;
import java.io.FilenameFilter;
import java.io.IOException;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import io.v.android.apps.reader.Utils;
import io.v.android.apps.reader.model.DeviceInfoFactory;

/**
 * Utility class which contains debug related features.
 */
public class DebugUtils {

    private static final int MAX_LOG_COUNT = 10;
    private static final String TAG = DebugUtils.class.getSimpleName();

    private static boolean isSavingLogs = false;

    /**
     * Start saving the logcat logs to a file in the external storage.
     * The app needs to obtain the read/write permission to the external storage before calling this
     * method. If not, this method will do nothing.
     */
    public static void startSavingLogs(Context context, String appName) {
        if (isSavingLogs) {
            return;
        }

        // Stop if we don't have enough storage access permission.
        if (!Utils.hasExternalStoragePermission(context)) {
            return;
        }

        File dir = Utils.getLogDirectory();

        Log.i(TAG, "Logcat logs are saved at: " + dir.getAbsolutePath());

        String startTime = Utils.getTimeString();
        String deviceId = DeviceInfoFactory.getDeviceId(context);

        deleteOldLogs(dir, appName, deviceId);

        File logcatFile = new File(dir,
                String.format("%s-%s.log", getLogPrefix(appName, deviceId), startTime));

        try {
            // Clear the previous logs
            Runtime.getRuntime().exec("logcat -c");
            Runtime.getRuntime().exec(String.format("logcat -v time -f %s", logcatFile.getCanonicalPath()));
            isSavingLogs = true;
        } catch (IOException e) {
            Log.e(TAG, "Could not start writing the logcat file.", e);
        }
    }

    private static void deleteOldLogs(File dir, final String appName, final String deviceId) {
        File[] files = dir.listFiles(new FilenameFilter() {
            @Override
            public boolean accept(File file, String s) {
                return s.startsWith(getLogPrefix(appName, deviceId));
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

    private static String getLogPrefix(String appName, String deviceId) {
        return String.format("%s-%s-logcat", appName, deviceId);
    }

}
