// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.android.apps.reader;

import android.app.Application;

import com.google.android.gms.analytics.Tracker;

/**
 * This is a subclass of {@link Application} used to provide the {@link Tracker}.
 *
 * This file is conditionally included to the project, when the "google-services.json" file does not
 * exist.
 */
public class ReaderApplication extends BaseReaderApplication {
    /**
     * Gets the default {@link Tracker} for this {@link Application}.
     * Always returns null to disable tracking.
     *
     * @return null
     */
    public Tracker getDefaultTracker() {
        return null;
    }
}
