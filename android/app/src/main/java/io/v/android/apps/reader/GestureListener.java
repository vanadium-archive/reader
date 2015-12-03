// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.android.apps.reader;

import android.content.Context;
import android.view.GestureDetector;
import android.view.MotionEvent;
import android.view.ScaleGestureDetector;

/**
 * Gesture listener implementation for sending gesture events to the Google Analytics tracker.
 * Send all the data without filtering, so that the events are not lost.
 */
public class GestureListener implements GestureDetector.OnGestureListener,
        GestureDetector.OnDoubleTapListener, ScaleGestureDetector.OnScaleGestureListener {

    private UserActionLogger mLogger;

    public GestureListener(Context context) {
        mLogger = UserActionLogger.getInstance(context);
    }

    @Override
    public boolean onDown(MotionEvent e) {
        mLogger.writeAction("Down");
        return true;
    }

    @Override
    public void onShowPress(MotionEvent e) {
        mLogger.writeAction("ShowPress");
    }

    @Override
    public boolean onSingleTapUp(MotionEvent e) {
        mLogger.writeAction("SingleTapUp");
        return true;
    }

    @Override
    public boolean onScroll(MotionEvent e1, MotionEvent e2, float distanceX, float distanceY) {
        mLogger.writeAction("Scroll");
        return true;
    }

    @Override
    public void onLongPress(MotionEvent e) {
        mLogger.writeAction("LongPress");
    }

    @Override
    public boolean onFling(MotionEvent e1, MotionEvent e2, float velocityX, float velocityY) {
        mLogger.writeAction("Fling");
        return true;
    }

    @Override
    public boolean onSingleTapConfirmed(MotionEvent e) {
        mLogger.writeAction("SingleTapConfirmed");
        return true;
    }

    @Override
    public boolean onDoubleTap(MotionEvent e) {
        mLogger.writeAction("DoubleTap");
        return true;
    }

    @Override
    public boolean onDoubleTapEvent(MotionEvent e) {
        mLogger.writeAction("DoubleTapEvent");
        return true;
    }

    @Override
    public boolean onScale(ScaleGestureDetector detector) {
        mLogger.writeAction("Scale");
        return true;
    }

    @Override
    public boolean onScaleBegin(ScaleGestureDetector detector) {
        mLogger.writeAction("ScaleBegin");
        return true;
    }

    @Override
    public void onScaleEnd(ScaleGestureDetector detector) {
        mLogger.writeAction("ScaleEnd");
    }
}
