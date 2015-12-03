// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.android.apps.reader;

import android.content.Context;
import android.os.Environment;
import android.util.Log;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

import io.v.android.apps.reader.model.DeviceInfoFactory;

/**
 * A utility class for logging user actions, such as touch gestures and button presses.
 * Writes the user actions into a CSV file.
 */
public class UserActionLogger {

    private static final String TAG = GestureListener.class.getSimpleName();

    private static volatile UserActionLogger instance;

    private String mDeviceId;
    private BufferedWriter mWriter;

    /**
     * Singleton accessor of the UserActionLogger class.
     */
    public static UserActionLogger getInstance(Context context) {
        UserActionLogger result = instance;
        if (instance == null) {
            synchronized (UserActionLogger.class) {
                result = instance;
                if (result == null) {
                    instance = result = new UserActionLogger(context);
                }
            }
        }

        return result;
    }

    private UserActionLogger(Context context) {
        mDeviceId = DeviceInfoFactory.getDeviceId(context);

        // Use an app-independent files directory to avoid accidentally deleting log
        // files by clearing the app data.
        File directory = Environment.getExternalStoragePublicDirectory(
                Environment.DIRECTORY_DOCUMENTS);
        if (!directory.exists()) {
            directory.mkdirs();
        }

        // Avoid having colons in the start timestamp
        SimpleDateFormat formatter = new SimpleDateFormat(
                "yyyyMMdd-HHmmss.SSS", Locale.getDefault());
        String startTime = formatter.format(new Date());

        String basename = String.format("reader-%s.log", startTime);
        File file = new File(directory, basename);

        try {
            mWriter = new BufferedWriter(new FileWriter(file));
            mWriter.write("DEVICE ID");
            mWriter.write(",");
            mWriter.write("ACTION");
            mWriter.write(",");
            mWriter.write("TIMESTAMP");
            mWriter.newLine();
            mWriter.flush();
        } catch (IOException e) {
            handleException(e);
            mWriter = null;
        }
    }

    /**
     * Writes the given action to the CSV file.
     *
     * @param action name of the user action.
     */
    public synchronized void writeAction(String action) {
        if (mWriter == null) {
            return;
        }

        try {
            mWriter.write(mDeviceId);
            mWriter.write(",");
            mWriter.write(action);
            mWriter.write(",");
            mWriter.write(Long.toString(System.currentTimeMillis()));
            mWriter.newLine();
            mWriter.flush();
        } catch (IOException e) {
            handleException(e);
        }
    }

    private static void handleException(Exception e) {
        Log.e(TAG, e.getMessage(), e);
    }
}
