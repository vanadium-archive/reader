// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.android.apps.reader;

import android.util.Log;
import android.view.GestureDetector;
import android.view.MotionEvent;
import android.view.ScaleGestureDetector;
import android.content.Context;

import java.io.BufferedWriter;
import java.io.FileWriter;
import java.io.File;
import java.io.IOException;
import java.sql.Timestamp;

/**
 * Gesture listener implementation for sending gesture events to the Google Analytics tracker.
 * Send all the data without filtering, so that the events are not lost.
 */
public class GestureListener implements GestureDetector.OnGestureListener,
        GestureDetector.OnDoubleTapListener, ScaleGestureDetector.OnScaleGestureListener {

    private static final String TAG = GestureListener.class.getSimpleName();
    private static final String CATEGORY = "Touch Gesture";
    private static BufferedWriter buffer;

    private final String mDeviceId;

    public GestureListener(Context context, String deviceId) {
        mDeviceId = deviceId;

        if (buffer == null) {
            File directory = context.getFilesDir();
            String basename = String.format("reader-%s.log", now());
            File file = new File(directory, basename);

            try {
                buffer = new BufferedWriter(new FileWriter(file));
                buffer.write("DEVICE ID");
                buffer.write(",");
                buffer.write("ACTION");
                buffer.write(",");
                buffer.write("TIMESTAMP");
                buffer.newLine();
                buffer.flush();
            } catch (IOException e) {
                handleException(e);
            }
        }
    }

    private void send(String action) {
        try {
            buffer.write(mDeviceId);
            buffer.write(",");
            buffer.write(action);
            buffer.write(",");
            buffer.write(now().toString());
            buffer.newLine();
        } catch (IOException e) {
            handleException(e);
        }
    }

    private Timestamp now() {
        return new Timestamp(System.currentTimeMillis());
    }

    @Override
    public boolean onDown(MotionEvent e) {
        send("Down");
        return true;
    }

    @Override
    public void onShowPress(MotionEvent e) {
        send("ShowPress");
    }

    @Override
    public boolean onSingleTapUp(MotionEvent e) {
        send("SingleTapUp");
        return true;
    }

    @Override
    public boolean onScroll(MotionEvent e1, MotionEvent e2, float distanceX, float distanceY) {
        send("Scroll");
        return true;
    }

    @Override
    public void onLongPress(MotionEvent e) {
        send("LongPress");
    }

    @Override
    public boolean onFling(MotionEvent e1, MotionEvent e2, float velocityX, float velocityY) {
        send("Fling");
        return true;
    }

    @Override
    public boolean onSingleTapConfirmed(MotionEvent e) {
        send("SingleTapConfirmed");
        return true;
    }

    @Override
    public boolean onDoubleTap(MotionEvent e) {
        send("DoubleTap");
        return true;
    }

    @Override
    public boolean onDoubleTapEvent(MotionEvent e) {
        send("DoubleTapEvent");
        return true;
    }

    @Override
    public boolean onScale(ScaleGestureDetector detector) {
        send("Scale");
        return true;
    }

    @Override
    public boolean onScaleBegin(ScaleGestureDetector detector) {
        send("ScaleBegin");
        return true;
    }

    @Override
    public void onScaleEnd(ScaleGestureDetector detector) {
        send("ScaleEnd");
    }

    private static void handleException(Exception e) {
        Log.e(TAG, e.getMessage(), e);
    }
}
