// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.android.apps.reader.model;

import android.util.Log;

import java.util.UUID;

/**
 * Helper class for generating id strings to be used in Syncbase tables.
 *
 * The purpose of this class is to make it easier to change the id generation logic,
 * for example to make the ids consistent with the Web version Reader app.
 */
public class IdFactory {

    private static final String TAG = IdFactory.class.getSimpleName();

    /**
     * Gets a randomly generated id string.
     */
    public static String getRandomId() {
        return UUID.randomUUID().toString();
    }

    private static void handleException(Exception e) {
        Log.e(TAG, e.getMessage(), e);
    }

}
