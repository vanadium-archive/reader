// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.android.apps.reader;

import android.content.Context;
import android.support.v4.view.GestureDetectorCompat;
import android.view.GestureDetector;
import android.view.MotionEvent;

/**
 * A swipe gesture detector which emits swipe events in left/right/up/down directions.
 */
public final class SwipeGestureDetector {

    /**
     * Use SwipeGestureDetector.create() instead.
     */
    private SwipeGestureDetector() {
    }

    /**
     * The listener interface that is used to notify when swipe gestures occur.
     * If you only want to listen for a subset, extend {@link SimpleOnSwipeListener} instead.
     */
    public interface OnSwipeListener {
        boolean onSwipeLeft();
        boolean onSwipeRight();
        boolean onSwipeUp();
        boolean onSwipeDown();
    }

    /**
     * A convenient class to extend when you only want to listen to a subset of swipe gestures.
     */
    public static class SimpleOnSwipeListener implements OnSwipeListener {
        @Override public boolean onSwipeLeft()  { return false; }
        @Override public boolean onSwipeRight() { return false; }
        @Override public boolean onSwipeUp()    { return false; }
        @Override public boolean onSwipeDown()  { return false; }
    }

    /**
     * A gesture listener that listens to fling events and turns them into swipe events.
     */
    private static class FlingToSwipeListener extends GestureDetector.SimpleOnGestureListener {

        private static final int DISTANCE_THRESHOLD = 100;
        private static final int VELOCITY_THRESHOLD = 100;

        private OnSwipeListener mSwipeListener;

        public FlingToSwipeListener(OnSwipeListener swipeListener) {
            mSwipeListener = swipeListener;
        }

        @Override
        public boolean onFling(MotionEvent e1, MotionEvent e2, float vx, float vy) {
            boolean result = false;
            float dx = e2.getX() - e1.getX();
            float dy = e2.getY() - e1.getY();
            if (Math.abs(dx) > Math.abs(dy)) {
                if (Math.abs(dx) > DISTANCE_THRESHOLD && Math.abs(vx) > VELOCITY_THRESHOLD) {
                    if (dx > 0) {
                        result = mSwipeListener.onSwipeRight();
                    } else {
                        result = mSwipeListener.onSwipeLeft();
                    }
                }
            } else {
                if (Math.abs(dy) > DISTANCE_THRESHOLD && Math.abs(vy) > VELOCITY_THRESHOLD) {
                    if (dy > 0) {
                        result = mSwipeListener.onSwipeDown();
                    } else {
                        result = mSwipeListener.onSwipeUp();
                    }
                }
            }

            return result;
        }

    }

    public static GestureDetectorCompat create(Context context, OnSwipeListener listener) {
        return new GestureDetectorCompat(context, new FlingToSwipeListener(listener));
    }

}
