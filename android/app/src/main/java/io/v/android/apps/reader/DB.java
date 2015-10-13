// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.android.apps.reader;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;

/**
 * Borrowed the idea of having a DB interface from syncslides.
 *
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
                        // TODO(youngseokyoon): Replace this with a syncbase DB.
//                        instance = result = new FakeDB(context);
                        instance = result = new SyncbaseDB(context);
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
     * Represents a PDF file and its metadata.
     *
     * TODO(youngseokyoon): update this interface, once the syncbase DB schema is defined.
     */
    interface PdfFile {
        String getName();
    }

    /**
     * Callbacks for when the dataset changes dynamically.
     *
     * TODO(youngseokyoon): reorganize the interfaces into sub-packages.
     */
    interface Listener {
        void notifyItemChanged(int position);
        void notifyItemInserted(int position);
        void notifyItemRemoved(int position);
    }

    /**
     * Provides a list of PDF files via an API that fits well with RecyclerView.Adapter.
     */
    interface PdfFileList {
        /**
         * Returns the number of available PDF files.
         */
        int getItemCount();

        /**
         * Returns the PDF file object at the given position.
         */
        PdfFile getPdfFile(int position);

        /**
         * Sets the listener for changes to the list.  There can only be one listener.
         */
        void setListener(Listener listener);

        /**
         * Indicates that the list is no longer needed and should stop notifying its listener.
         */
        void discard();
    }

    /**
     * Gets the list of available PDF files.
     * @return a list of PDF files.
     */
    PdfFileList getPdfFileList();

}
