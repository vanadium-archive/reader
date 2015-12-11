// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.android.apps.reader;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Environment;
import android.support.v4.content.ContextCompat;

import java.io.File;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Utility class which contains useful static methods.
 */
public class Utils {

    /**
     * Checks if the app has read and write permission to the external storage.
     */
    public static boolean hasExternalStoragePermission(Context context) {
        boolean hasWritePermission = ContextCompat.checkSelfPermission(context,
                Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
        boolean hasReadPermission = ContextCompat.checkSelfPermission(context,
                Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;

        return hasWritePermission && hasReadPermission;
    }

    /**
     * Returns an app-independent files directory for saving log files, to avoid accidentally
     * deleting log files by clearing the app data.
     */
    public static File getLogDirectory() {
        File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS);
        if (!dir.exists()) {
            dir.mkdirs();
        }
        return dir;
    }

    /**
     * Returns the current time as string formatted as "yyyyMMdd-HHmmss.SSS",
     * which can be used in log filenames.
     */
    public static String getTimeString() {
        SimpleDateFormat formatter = new SimpleDateFormat(
                "yyyyMMdd-HHmmss.SSS", Locale.getDefault());
        return formatter.format(new Date());
    }

}
