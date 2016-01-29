// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.android.apps.reader.db;

import android.app.Activity;
import android.content.Context;
import android.util.Log;

import com.google.common.util.concurrent.Futures;
import com.google.common.util.concurrent.ListenableFuture;

import java.io.ByteArrayOutputStream;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;

import io.v.android.apps.reader.Constants;
import io.v.android.apps.reader.model.DeviceInfoFactory;
import io.v.android.apps.reader.model.Listener;
import io.v.android.apps.reader.vdl.Device;
import io.v.android.apps.reader.vdl.DeviceSet;
import io.v.android.apps.reader.vdl.File;
import io.v.v23.vom.VomUtil;

/**
 * A fake implementation of the DB interface for manual testing.
 */
public class FakeDB implements DB {

    private static final String TAG = FakeDB.class.getSimpleName();

    private Context mContext;
    private FakeFileList mFileList;
    private FakeDeviceList mDeviceList;
    private FakeDeviceSetList mDeviceSetList;

    public FakeDB(Context context) {
        mContext = context;
        mFileList = new FakeFileList();
        mDeviceList = new FakeDeviceList();
        mDeviceSetList = new FakeDeviceSetList();

        mDeviceList.addItem(DeviceInfoFactory.getDevice(context));
    }

    static abstract class BaseFakeList<E> implements DBList<E> {

        private List<E> mItems;
        private Listener mListener;

        public BaseFakeList() {
            mItems = new ArrayList<>();
        }

        protected abstract String getId(E e);

        @Override
        public int getItemCount() {
            return mItems.size();
        }

        @Override
        public E getItem(int position) {
            return mItems.get(position);
        }

        @Override
        public E getItemById(String id) {
            for (E item : mItems) {
                if (getId(item).equals(id)) {
                    return item;
                }
            }

            return null;
        }

        @Override
        public void setListener(Listener listener) {
            assert mListener == null;
            mListener = listener;
        }

        @Override
        public void discard() {
            // Nothing to do.
        }

        public void addItem(E item) {
            mItems.add(item);
            if (mListener != null) {
                mListener.notifyItemInserted(mItems.size() - 1);
            }
        }

        public void updateItem(E item) {
            for (int i = 0; i < mItems.size(); ++i) {
                if (getId(mItems.get(i)).equals(getId(item))) {
                    mItems.set(i, item);

                    if (mListener != null) {
                        mListener.notifyItemChanged(i);
                    }

                    return;
                }
            }
        }

        public void removeItemById(String id) {
            for (int i = 0; i < mItems.size(); ++i) {
                if (getId(mItems.get(i)).equals(id)) {
                    mItems.remove(i);

                    if (mListener != null) {
                        mListener.notifyItemRemoved(i);
                    }

                    return;
                }
            }
        }

    }

    static class FakeFileList extends BaseFakeList<File> {
        public String getId(File file) {
            return file.getId();
        }
    }

    static class FakeDeviceList extends BaseFakeList<Device> {
        public String getId(Device device) {
            return device.getId();
        }
    }

    static class FakeDeviceSetList extends BaseFakeList<DeviceSet> {
        public String getId(DeviceSet ds) {
            return ds.getId();
        }
    }

    private class FakeFileBuilder implements FileBuilder {

        private MessageDigest mDigest;
        private String mTitle;
        private long mSize;
        private ByteArrayOutputStream mOutputStream;

        public FakeFileBuilder(String title) throws Exception {
            mDigest = MessageDigest.getInstance("MD5");
            mTitle = title;
            mSize = 0L;
            mOutputStream = new ByteArrayOutputStream();
        }

        @Override
        public void write(byte[] b, int off, int len) throws IOException {
            mOutputStream.write(b, off, len);
            mDigest.update(b, off, len);
            mSize += len;
        }

        @Override
        public void cancel() {
            try {
                mOutputStream.close();
            } catch (IOException e) {
                Log.e(TAG, "Could not cancel the writing: " + e.getMessage(), e);
            }
        }

        @Override
        public File build() {
            try {
                mOutputStream.close();

                String id = VomUtil.bytesToHexString(mDigest.digest());

                java.io.File jFile = new java.io.File(mContext.getCacheDir(), id + ".db");
                try (FileOutputStream out = new FileOutputStream(jFile)) {
                    out.write(mOutputStream.toByteArray());
                } catch (IOException e) {
                    Log.e(TAG, e.getMessage(), e);
                }

                return new File(
                        id,
                        null,
                        mTitle,
                        mSize,
                        Constants.PDF_MIME_TYPE);

            } catch (IOException e) {
                Log.e(TAG, "Could not build the File: " + e.getMessage(), e);
            }
            return null;
        }

        @Override
        public void close() throws IOException {
            mOutputStream.close();
            mOutputStream = null;
        }
    }

    @Override
    public void init(Activity activity) {
        // Nothing to do.
    }

    @Override
    public ListenableFuture<Void> onInitialized() {
        return Futures.immediateFuture(null);
    }

    @Override
    public boolean isInitialized() {
        return true;
    }

    @Override
    public DBList<File> getFileList() {
        return mFileList;
    }

    @Override
    public DBList<Device> getDeviceList() {
        return mDeviceList;
    }

    @Override
    public DBList<DeviceSet> getDeviceSetList() {
        return mDeviceSetList;
    }

    @Override
    public void addFile(File file) {
        mFileList.addItem(file);
    }

    @Override
    public void deleteFile(String id) {
        mFileList.removeItemById(id);
    }

    @Override
    public void addDeviceSet(DeviceSet ds) {
        mDeviceSetList.addItem(ds);
    }

    @Override
    public void updateDeviceSet(DeviceSet ds) {
        mDeviceSetList.updateItem(ds);
    }

    @Override
    public void deleteDeviceSet(String id) {
        mDeviceSetList.removeItemById(id);
    }

    @Override
    public FileBuilder getFileBuilder(String title) throws Exception {
        return new FakeFileBuilder(title);
    }

    @Override
    public InputStream getInputStreamForFile(File file) {
        return getInputStreamForFile(file.getId());
    }

    @Override
    public InputStream getInputStreamForFile(String fileId) {
        java.io.File jFile = new java.io.File(mContext.getCacheDir(), fileId + ".db");
        try {
            return new FileInputStream(jFile);
        } catch (IOException e) {
            Log.e(TAG, e.getMessage(), e);
        }

        return null;
    }

}
