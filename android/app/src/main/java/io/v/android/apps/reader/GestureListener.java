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
        mLogger.writeTouchAction("Down");
        return true;
    }

    @Override
    public void onShowPress(MotionEvent e) {
        mLogger.writeTouchAction("ShowPress");
    }

    @Override
    public boolean onSingleTapUp(MotionEvent e) {
        mLogger.writeTouchAction("SingleTapUp");
        return true;
    }

    @Override
    public boolean onScroll(MotionEvent e1, MotionEvent e2, float distanceX, float distanceY) {
        mLogger.writeTouchAction("Scroll");
        return true;
    }

    @Override
    public void onLongPress(MotionEvent e) {
        mLogger.writeTouchAction("LongPress");
    }

    @Override
    public boolean onFling(MotionEvent e1, MotionEvent e2, float velocityX, float velocityY) {
        mLogger.writeTouchAction("Fling");
        return true;
    }

    @Override
    public boolean onSingleTapConfirmed(MotionEvent e) {
        mLogger.writeTouchAction("SingleTapConfirmed");
        return true;
    }

    @Override
    public boolean onDoubleTap(MotionEvent e) {
        mLogger.writeTouchAction("DoubleTap");
        return true;
    }

    @Override
    public boolean onDoubleTapEvent(MotionEvent e) {
        mLogger.writeTouchAction("DoubleTapEvent");
        return true;
    }

    @Override
    public boolean onScale(ScaleGestureDetector detector) {
        mLogger.writeTouchAction("Scale");
        return true;
    }

    @Override
    public boolean onScaleBegin(ScaleGestureDetector detector) {
        mLogger.writeTouchAction("ScaleBegin");
        return true;
    }

    @Override
    public void onScaleEnd(ScaleGestureDetector detector) {
        mLogger.writeTouchAction("ScaleEnd");
    }
}
