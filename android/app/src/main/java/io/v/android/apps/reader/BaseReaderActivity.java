// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.android.apps.reader;

import android.content.pm.ActivityInfo;
import android.os.Bundle;
import android.support.v4.view.GestureDetectorCompat;
import android.support.v7.app.AppCompatActivity;
import android.view.MotionEvent;

import com.google.android.gms.analytics.HitBuilders;
import com.google.android.gms.analytics.Tracker;

import io.v.android.apps.reader.db.DB;
import io.v.android.apps.reader.model.DeviceInfoFactory;

/**
 * Base activity class for all the Reader app activities. Its responsibilities include DB
 * initialization, touch gesture detection, and google analytics tracking
 */
public abstract class BaseReaderActivity extends AppCompatActivity {
    private String mDeviceId;
    private DB mDB;
    private Tracker mTracker;
    private GestureDetectorCompat mGestureDetector;
    private GestureListener mGestureListener;

    protected DB getDB() {
        return mDB;
    }

    protected Tracker getTracker() {
        return mTracker;
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
        mGestureListener = new GestureListener(this, DeviceInfoFactory.getDeviceId(this));
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

}
