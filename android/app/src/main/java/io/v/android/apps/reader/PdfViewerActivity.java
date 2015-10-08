// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.android.apps.reader;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;

/**
 * Activity that shows the contents of the selected pdf file.
 */
public class PdfViewerActivity extends Activity {

    private static final String EXTRA_FILE_NAME = "file_name";

    private PdfViewWrapper mPdfView;

    private Button mButtonPrev;
    private Button mButtonNext;

    /**
     * Helper method for creating an intent to start a PdfViewerActivity.
     */
    public static Intent createIntent(Context context, String fileName) {
        Intent intent = new Intent(context, PdfViewerActivity.class);
        intent.putExtra(EXTRA_FILE_NAME, fileName);
        return intent;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_pdf_viewer);

        mPdfView = (PdfViewWrapper) findViewById(R.id.pdfview);

        // Load the pdf file using the file name passed with the intent.
        Intent intent = getIntent();
        if (intent.hasExtra(EXTRA_FILE_NAME)) {
            mPdfView.fromAsset(intent.getStringExtra(EXTRA_FILE_NAME))
                    .enableSwipe(true)
                    .load();
        }

        mButtonPrev = (Button) findViewById(R.id.button_prev);
        mButtonNext = (Button) findViewById(R.id.button_next);

        mButtonPrev.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                mPdfView.prevPage();
            }
        });

        mButtonNext.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                mPdfView.nextPage();
            }
        });
    }
}
