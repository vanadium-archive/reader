// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.android.apps.reader;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.pdf.PdfRenderer;
import android.graphics.pdf.PdfRenderer.Page;
import android.os.ParcelFileDescriptor;
import android.util.AttributeSet;
import android.widget.ImageView;

import com.google.common.io.ByteStreams;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;

import io.v.android.apps.reader.db.DB;

/**
 * Wrapper class for the PDF Viewer library.
 *
 * May be replaced with another library if needed.
 */
public class PdfViewWrapper extends ImageView {

    private PdfRenderer mRenderer;

    public PdfViewWrapper(Context context, AttributeSet attrs) {
        super(context, attrs);
    }

    /**
     * Loads the PDF file at the given path into the pdf.js component within WebView.
     */
    public void loadPdfFile(final String fileId, final int initialPage) throws IOException {
        File pdfFile = new File(getContext().getCacheDir(), fileId);

        try (InputStream in = DB.Singleton.get(getContext()).getInputStreamForFile(fileId);
             FileOutputStream out = new FileOutputStream(pdfFile)) {
            ByteStreams.copy(in, out);
        }

        mRenderer = new PdfRenderer(
                ParcelFileDescriptor.open(pdfFile, ParcelFileDescriptor.MODE_READ_ONLY));

        setPage(initialPage);
    }

    /**
     * Jumps to the given page number. Page number is one-based.
     *
     * @param pageNumber the page number to jump to. Page number is one-based.
     */
    public void setPage(int pageNumber) {
        if (pageNumber < 1 || pageNumber > mRenderer.getPageCount()) {
            // TODO(youngseokyoon): display not available page.
            return;
        }

        try (Page page = mRenderer.openPage(pageNumber - 1)) {
            // Create a bitmap that fits the entire view while keeping the aspect ratio of the source.
            float pageRatio = (float) page.getWidth() / (float) page.getHeight();
            float viewRatio = (float) getWidth() / (float) getHeight();

            Bitmap bitmap;
            if (pageRatio >= viewRatio) {
                bitmap = Bitmap.createBitmap(
                        getWidth(),
                        (int) (getWidth() / pageRatio),
                        Bitmap.Config.ARGB_8888);
            } else {
                bitmap = Bitmap.createBitmap(
                        (int) (getHeight() * pageRatio),
                        getHeight(),
                        Bitmap.Config.ARGB_8888);
            }

            // Render the page on the bitmap and display it on the ImageView.
            page.render(bitmap, null, null, Page.RENDER_MODE_FOR_DISPLAY);
            setImageBitmap(bitmap);
        }
    }

    public int getPageCount() {
        if (mRenderer == null) {
            return 0;
        }

        return mRenderer.getPageCount();
    }

}
