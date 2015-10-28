// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.android.apps.reader.db;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;

import java.util.ArrayList;
import java.util.List;

import io.v.android.apps.reader.model.Listener;
import io.v.android.apps.reader.model.File;
import io.v.v23.services.syncbase.nosql.BlobRef;

/**
 * A fake implementation of the DB interface for manual testing.
 */
public class FakeDB implements DB {

    private static final String[] FILE_NAMES = {
            "Foo.pdf",
            "Bar.pdf"
    };

    private FakeFileList mFileList;

    public FakeDB(Context context) {
        mFileList = new FakeFileList();
    }

    class FakeFile implements File {

        private String mId;
        private BlobRef mRef;
        private String mTitle;
        private long mSize;
        private String mType;

        public FakeFile(String title) {
            this(null, null, title, 0, null);
        }

        public FakeFile(String id, BlobRef ref, String title, long size, String type) {
            mId = id;
            mRef = ref;
            mTitle = title;
            mSize = size;
            mType = type;
        }

        @Override
        public String getId() {
            return mId;
        }

        @Override
        public BlobRef getRef() {
            return mRef;
        }

        @Override
        public String getTitle() {
            return mTitle;
        }

        @Override
        public long getSize() {
            return mSize;
        }

        @Override
        public String getType() {
            return mType;
        }
    }

    class FakeFileList implements DBList<File> {

        private List<FakeFile> mFiles;
        private Listener mListener;

        public FakeFileList() {
            mFiles = new ArrayList<>();
            for (String fileName : FILE_NAMES) {
                mFiles.add(new FakeFile(fileName));
            }
        }

        @Override
        public int getItemCount() {
            return mFiles.size();
        }

        @Override
        public FakeFile getItem(int position) {
            return mFiles.get(position);
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
    public DBList<File> getFileList() {
        return mFileList;
    }

}
