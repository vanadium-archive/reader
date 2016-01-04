// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.android.apps.reader;

import android.content.Context;
import android.util.AttributeSet;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.google.common.util.concurrent.FutureCallback;
import com.google.common.util.concurrent.Futures;
import com.google.common.util.concurrent.SettableFuture;

import java.io.InputStream;

import io.v.android.apps.reader.db.DB;

/**
 * Wrapper class for the PDF Viewer library.
 *
 * May be replaced with another library if needed.
 */
public class PdfViewWrapper extends WebView {

    private static final String TAG = PdfViewWrapper.class.getSimpleName();

    private SettableFuture<Boolean> mPageLoaded;
    private int mPageCount;

    public PdfViewWrapper(Context context, AttributeSet attrs) {
        super(context, attrs);

        mPageLoaded = SettableFuture.create();
    }

    public void init() {
        WebSettings settings = getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        setWebChromeClient(new WebChromeClient());
        setWebViewClient(new PdfViewClient());
        addJavascriptInterface(new JSInterface(), "android");

        loadUrl("file:///android_asset/pdfjs/pdf-web-view.html");
    }

    /**
     * Loads the PDF file at the given path into the pdf.js component within WebView.
     */
    public void loadPdfFile(final String filePath) {
        Futures.addCallback(mPageLoaded, new FutureCallback<Boolean>() {
            @Override
            public void onSuccess(Boolean result) {
                Log.i(TAG, "loadPdfFile called: " + filePath);
                evaluateJavascript("window.client.open(\"" + filePath + "\");", null);

                // leave the page count as 0 until the page count value is properly set from JS side.
                mPageCount = 0;
            }

            @Override
            public void onFailure(Throwable t) {
                // Nothing to do.
            }
        });
    }

    /**
     * Jumps to the given page number. Page number is one-based.
     *
     * @param page the page number to jump to. Page number is one-based.
     */
    public void setPage(int page) {
        evaluateJavascript("window.client.page(" + page + ");", null);
    }

    public int getPageCount() {
        return mPageCount;
    }

    /**
     * This class provides public methods that can be called from the JavaScript side.
     */
    private class JSInterface {

        private final String TAG = JSInterface.class.getSimpleName();

        @JavascriptInterface
        public void setPageCount(int pageCount) {
            Log.d(TAG, "setPageCount(" + pageCount + ") called.");
            mPageCount = pageCount;
        }
    }

    private class PdfViewClient extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Log.i(TAG, "shouldInterceptRequest called");

            String path = request.getUrl().getPath();
            if (!path.startsWith("/file_id/")) {
                Log.i(TAG, "Not a file id path. Falling back to super.shouldInterceptRequest");
                return super.shouldInterceptRequest(view, request);
            }

            String fileId = request.getUrl().getLastPathSegment();
            Log.i(TAG, "File ID: " + fileId);

            // Should NOT close the stream here, so that the stream can be read by WebView.
            InputStream in = DB.Singleton.get(getContext()).getInputStreamForFile(fileId);

            if (in != null) {
                Log.i(TAG, "returning a custom WebResourceResponse");
                return new WebResourceResponse("application/pdf", "binary", in);
            } else {
                Log.i(TAG, "Could not open an input stream. " +
                        "Falling back to super.shouldInterceptRequest");
                return super.shouldInterceptRequest(view, request);
            }
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            mPageLoaded.set(true);
        }
    }

}
