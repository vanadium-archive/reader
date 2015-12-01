// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.android.apps.reader;

import android.view.GestureDetector;
import android.view.MotionEvent;
import android.view.ScaleGestureDetector;

import com.google.android.gms.analytics.HitBuilders;
import com.google.android.gms.analytics.Tracker;

/**
 * Gesture listener implementation for sending gesture events to the Google Analytics tracker.
 * Send all the data without filtering, so that the events are not lost.
 */
public class GestureListener implements GestureDetector.OnGestureListener,
        GestureDetector.OnDoubleTapListener, ScaleGestureDetector.OnScaleGestureListener {

    private static final String CATEGORY = "Touch Gesture";

    private final Tracker mTracker;
    private final String mLabel;

    public GestureListener(Tracker tracker, String label) {
        mTracker = tracker;
        mLabel = label;
    }

    private void send(String action) {
        mTracker.send(new HitBuilders.EventBuilder()
                .setCustomDimension(1, Long.toString(System.currentTimeMillis()))
                .setCategory(CATEGORY)
                .setAction(action)
                .setLabel(mLabel)
                .build());
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
}
