// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.android.apps.reader;

import android.content.Context;
import android.util.AttributeSet;
import android.util.Log;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;

/**
 * Wrapper class for the PDF Viewer library.
 *
 * May be replaced with another library if needed.
 */
public class PdfViewWrapper extends WebView {

    private static final String TAG = PdfViewWrapper.class.getSimpleName();

    public PdfViewWrapper(Context context, AttributeSet attrs) {
        super(context, attrs);
    }

    public void init() {
        WebSettings settings = getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setAllowUniversalAccessFromFileURLs(true);

        setWebChromeClient(new WebChromeClient());

        setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Log.i(TAG, "shouldInterceptRequest called");

                File file = new File(request.getUrl().getPath());
                Log.i(TAG, "file path: " + file.getPath());

                try {
                    // Should NOT close the stream here, so that the stream can be read by WebView.
                    InputStream inputStream = new FileInputStream(file);

                    Log.i(TAG, "returning a custom WebResourceResponse");
                    return new WebResourceResponse("application/pdf", "binary", inputStream);
                } catch (IOException e) {
                    Log.i(TAG, "falling back to super.shouldInterceptRequest");
                    return super.shouldInterceptRequest(view, request);
                }
            }
        });

        loadUrl("file:///android_asset/pdfjs/pdf-web-view.html");
    }

    /**
     * Loads the PDF file at the given path into the pdf.js component within WebView.
     * NOTE: must be called after the page loading is finished.
     */
    public void loadPdfFile(String filePath) {
        evaluateJavascript("window.atom.href.set(\"" + filePath + "\");", null);
    }

    /**
     * Jumps to the given page number. Page number is one-based.
     *
     * @param page the page number to jump to. Page number is one-based.
     */
    public void setPage(int page) {
        evaluateJavascript("window.atom.pages.current.set(" + page + ");", null);
    }

    public int getPageCount() {
        // TODO(youngseokyoon): provide a JS interface to set the page count from the JS side.
        // For now, just return 10 for testing purposes.
        return 10;
    }

}
