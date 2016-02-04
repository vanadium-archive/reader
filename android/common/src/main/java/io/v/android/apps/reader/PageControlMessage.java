// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.android.apps.reader;

/**
 * A class that contains a few constant strings used for sending/receiving page control messages
 * between the handheld and the wearable apps.
 */
public class PageControlMessage {

    public static final String PATH = "/page-control";
    public static final String TOGGLE_LINK = "ToggleLink";
    public static final String PREV_PAGE = "PrevPage";
    public static final String NEXT_PAGE = "NextPage";

}
