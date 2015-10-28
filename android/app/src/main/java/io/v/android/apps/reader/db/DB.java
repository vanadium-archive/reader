// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.android.apps.reader.db;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;

import io.v.android.apps.reader.model.Listener;
import io.v.android.apps.reader.model.File;

/**
 * Provides high-level methods for getting and setting the state of PDF reader.
 * It is an interface instead of a concrete class to make testing easier.
 */
public interface DB {

    class Singleton {

        private static volatile DB instance;

        public static DB get(Context context) {
            DB result = instance;
            if (instance == null) {
                synchronized (Singleton.class) {
                    result = instance;
                    if (result == null) {
                        // uncomment either one
                        instance = result = new FakeDB(context);
//                        instance = result = new SyncbaseDB(context);
                    }
                }
            }

            return result;
        }
    }

    /**
     * Perform initialization steps.  This method must be called early in the lifetime
     * of the activity.  As part of the initialization, it might send an intent to
     * another activity.
     *
     * @param activity implements onActivityResult() to call into DB.onActivityResult.
     */
    void init(Activity activity);

    /**
     * If init() sent an intent to another Activity, the result must be forwarded
     * from our app's activity to this method.
     *
     * @return true if the requestCode matches an intent sent by this implementation.
     */
    boolean onActivityResult(int requestCode, int resultCode, Intent data);

    /**
     * Provides a list of elements that fits well with RecyclerView.Adapter.
     */
    interface DBList<E> {
        /**
         * Returns the number of available elements.
         */
        int getItemCount();

        /**
         * Returns the element at the given position.
         */
        E getItem(int position);

        /**
         * Sets the listener for changes to the list.
         * There can only be one listener.
         */
        void setListener(Listener listener);

        /**
         * Indicates that the list is no longer needed
         * and should stop notifying its listener.
         */
        void discard();
    }

    /**
     * Gets the list of available PDF files.
     * @return a list of PDF files.
     */
    DBList<File> getFileList();

}
