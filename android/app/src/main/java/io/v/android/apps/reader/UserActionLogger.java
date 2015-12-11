// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.android.apps.reader;

import android.content.Context;
import android.util.Log;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;

import java.io.Closeable;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;

import io.v.android.apps.reader.model.DeviceInfoFactory;

/**
 * A utility class for logging user actions, such as touch gestures and button presses.
 * Writes the user actions into a CSV file.
 *
 * This class implements {@link Closeable} interface, but closing this logger is not necessary to
 * get the full logs, because the log printing streams are flushed right after each row is written.
 */
public class UserActionLogger implements Closeable {

    private static final String TAG = GestureListener.class.getSimpleName();

    private static volatile UserActionLogger instance;

    private String mDeviceId;

    private CSVPrinter mTouchPrinter;
    private CSVPrinter mNavigationPrinter;

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

        if (Utils.hasExternalStoragePermission(context)) {
            initPrinters();
        }
    }

    public void initPrinters() {
        File dir = Utils.getLogDirectory();

        Log.i(TAG, "User action logs are saved at: " + dir.getAbsolutePath());

        String startTime = Utils.getTimeString();

        File touchLogFile = new File(dir,
                String.format("reader-%s-touch-%s.log", mDeviceId, startTime));
        File navigationLogFile = new File(dir,
                String.format("reader-%s-navigation-%s.log", mDeviceId, startTime));
        try {
            mTouchPrinter = CSVFormat.DEFAULT
                    .withHeader("ACTION", "TIMESTAMP")
                    .print(new FileWriter(touchLogFile));

            mNavigationPrinter = CSVFormat.DEFAULT
                    .withHeader("ACTION", "VALUE", "TIMESTAMP")
                    .print(new FileWriter(navigationLogFile));
        } catch (IOException e) {
            handleException(e);

            try {
                close();
            } catch (IOException e2) {
                // Nothing to do here.
            }
        }
    }

    @Override
    public void close() throws IOException {
        IOException ex = null;

        if (mTouchPrinter != null) {
            try {
                mTouchPrinter.close();
            } catch (IOException e) {
                ex = e;
            } finally {
                mTouchPrinter = null;
            }
        }

        if (mNavigationPrinter != null) {
            try {
                mNavigationPrinter.close();
            } catch (IOException e) {
                if (ex != null) {
                    ex.addSuppressed(e);
                } else {
                    ex = e;
                }
            } finally {
                mNavigationPrinter = null;
            }
        }

        if (ex != null) {
            throw ex;
        }
    }

    /**
     * Writes the given touch action to the CSV file.
     *
     * @param action name of the touch action.
     */
    public void writeTouchAction(String action) {
        if (mTouchPrinter == null) {
            return;
        }

        try {
            mTouchPrinter.printRecord(action, timestamp());
            mTouchPrinter.flush();
        } catch (IOException e) {
            handleException(e);
        }
    }

    /**
     * Writes the given navigation action to the CSV file.
     *
     * @param action name of the navigation action.
     * @param value the value associated with the action.
     */
    public void writeNavigationAction(String action, int value) {
        if (mNavigationPrinter == null) {
            return;
        }

        try {
            mNavigationPrinter.printRecord(action, value, timestamp());
            mNavigationPrinter.flush();
        } catch (IOException e) {
            handleException(e);
        }
    }

    private String timestamp() {
        return Long.toString(System.currentTimeMillis());
    }

    private static void handleException(Exception e) {
        Log.e(TAG, e.getMessage(), e);
    }
}
