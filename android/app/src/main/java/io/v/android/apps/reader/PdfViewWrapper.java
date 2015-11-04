// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.android.apps.reader;

import android.content.Context;
import android.util.AttributeSet;

import com.joanzapata.pdfview.PDFView;

/**
 * Wrapper class for the PDF Viewer library.
 *
 * May be replaced with another library if needed.
 */
public class PdfViewWrapper extends PDFView {

    public PdfViewWrapper(Context context, AttributeSet attrs) {
        super(context, attrs);
    }

    /**
     * Jumps to the given page number. Page number is one-based.
     *
     * @param page the page number to jump to. Page number is one-based.
     */
    public void setPage(int page) {
        jumpTo(page);
    }

}
