// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.android.apps.reader;

import android.Manifest;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.support.v4.app.ActivityCompat;
import android.support.v4.view.GestureDetectorCompat;
import android.view.MotionEvent;

import com.google.android.gms.analytics.HitBuilders;
import com.google.android.gms.analytics.Tracker;

import io.v.android.apps.reader.db.DB;
import io.v.android.apps.reader.model.DeviceInfoFactory;
import io.v.baku.toolkit.VAppCompatActivity;

import static io.v.android.apps.reader.debug.DebugUtils.startSavingLogs;
import static io.v.baku.toolkit.debug.DebugUtils.isApkDebug;

/**
 * Base activity class for all the Reader app activities. Its responsibilities include DB
 * initialization, touch gesture detection, and google analytics tracking
 */
public abstract class BaseReaderActivity extends VAppCompatActivity {

    private String mDeviceId;
    private DB mDB;
    private Tracker mTracker;
    private UserActionLogger mLogger;
    private GestureDetectorCompat mGestureDetector;
    private GestureListener mGestureListener;

    protected DB getDB() {
        return mDB;
    }

    protected Tracker getTracker() {
        return mTracker;
    }

    protected UserActionLogger getLogger() {
        return mLogger;
    }

    protected String getDeviceId() {
        if (mDeviceId == null) {
            mDeviceId = DeviceInfoFactory.getDeviceId(this);
        }

        return mDeviceId;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        initTracker();

        // TODO(youngseokyoon): allow screen rotation and properly handle orientation changes
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);

        // Initialize the DB
        mDB = DB.Singleton.get(this);
        mDB.init(this);
    }

    @Override
    protected void onResume() {
        super.onResume();

        if (mTracker != null) {
            String deviceId = DeviceInfoFactory.getDeviceId(this);
            mTracker.setScreenName(String.format("%s.%s", deviceId, getClass().getSimpleName()));
            mTracker.send(new HitBuilders.ScreenViewBuilder()
                    .setCustomDimension(1, Long.toString(System.currentTimeMillis()))
                    .build());
        }
    }

    private void initTracker() {
        if (!Utils.hasExternalStoragePermission(this)) {
            ActivityCompat.requestPermissions(
                    this,
                    new String[] {
                            Manifest.permission.READ_EXTERNAL_STORAGE,
                            Manifest.permission.WRITE_EXTERNAL_STORAGE
                    },
                    Constants.REQUEST_CODE_PERMISSION_EXTERNAL_STORAGE);
        }

        // TODO(youngseokyoon): consolidate the Tracker into UserActionLogger
        mLogger = UserActionLogger.getInstance(this);
        mGestureListener = new GestureListener(this);
        mGestureDetector = new GestureDetectorCompat(this, mGestureListener);
        mGestureDetector.setOnDoubleTapListener(mGestureListener);
    }

    @Override
    public boolean dispatchTouchEvent(MotionEvent ev) {
        // Forward all the touch event to the gesture detector.
        // Implementing this in onTouchEvent is not enough, because it can only capture touch events
        // that are not consumed by any child views.
        if (mGestureDetector != null) {
            mGestureDetector.onTouchEvent(ev);
        }

        return super.dispatchTouchEvent(ev);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions,
                                           int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        switch (requestCode) {
            case Constants.REQUEST_CODE_PERMISSION_EXTERNAL_STORAGE:
                // If the permission is granted, reinitialize the loggers.
                if (grantResults.length > 0 &&
                        grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    mLogger.initPrinters();

                    if (isApkDebug(this)) {
                        startSavingLogs(this, Constants.APP_NAME);
                    }
                }
                break;

            default:
                break;
        }
    }
}
