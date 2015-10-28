// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.android.apps.reader.model;

import io.v.v23.services.syncbase.nosql.BlobRef;

/**
 * Represents a PDF file and its metadata.
 */
public interface File {
    String getId();
    BlobRef getRef();
    String getTitle();
    long getSize();
    String getType();
}
