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
     * Move to the previous page, if the current page is not the first page.
     */
    public void prevPage() {
        // NOTE: getCurrentPage() returns a zero-based page number,
        //       whereas the jumpTo() method expects a one-based page number.
        int page = getCurrentPage();
        if (page > 0) {
            jumpTo(page);
        }
    }

    /**
     * Move to the next page, if the current page is not the last page.
     */
    public void nextPage() {
        // NOTE: getCurrentPage() returns a zero-based page number,
        //       whereas the jumpTo() method expects a one-based page number.
        int page = getCurrentPage();
        if (page < getPageCount() - 1) {
            jumpTo(page + 2);
        }
    }

}
