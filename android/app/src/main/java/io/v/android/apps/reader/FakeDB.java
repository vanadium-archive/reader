// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.android.apps.reader;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;

import java.util.ArrayList;
import java.util.List;

/**
 * A fake implementation of the DB interface for manual testing.
 */
public class FakeDB implements DB {

    private static final String[] PDF_FILE_NAMES = {
            "Foo.pdf",
            "Bar.pdf"
    };

    private FakePdfFileList mPdfFileList;

    public FakeDB(Context context) {
        mPdfFileList = new FakePdfFileList();
    }

    class FakePdfFile implements DB.PdfFile {

        private String mName;

        public FakePdfFile(String name) {
            mName = name;
        }

        @Override
        public String getName() {
            return mName;
        }
    }

    class FakePdfFileList implements DB.PdfFileList {

        private List<FakePdfFile> mPdfFiles;
        private Listener mListener;

        public FakePdfFileList() {
            mPdfFiles = new ArrayList<>();
            for (String fileName : PDF_FILE_NAMES) {
                mPdfFiles.add(new FakePdfFile(fileName));
            }
        }

        @Override
        public int getItemCount() {
            return mPdfFiles.size();
        }

        @Override
        public FakePdfFile getPdfFile(int position) {
            return mPdfFiles.get(position);
        }

        @Override
        public void setListener(Listener listener) {
            // This fake list never calls the notify methods.
            // Just check if the listener is set only once.
            assert mListener == null;
            mListener = listener;
        }

        @Override
        public void discard() {
            // Nothing to do.
        }
    }

    public void init(Activity activity) {
        // Nothing to do.
    }

    @Override
    public boolean onActivityResult(int requestCode, int resultCode, Intent data) {
        // Nothing to do.
        return false;
    }

    @Override
    public PdfFileList getPdfFileList() {
        return mPdfFileList;
    }

}
