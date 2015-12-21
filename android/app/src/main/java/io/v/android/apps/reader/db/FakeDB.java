// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.android.apps.reader.db;

import android.app.Activity;
import android.content.Context;
import android.util.Log;

import com.google.common.io.ByteStreams;

import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import io.v.android.apps.reader.Constants;
import io.v.android.apps.reader.model.DeviceInfoFactory;
import io.v.android.apps.reader.model.IdFactory;
import io.v.android.apps.reader.model.Listener;
import io.v.android.apps.reader.vdl.Device;
import io.v.android.apps.reader.vdl.DeviceSet;
import io.v.android.apps.reader.vdl.File;

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

    @Override
    public void init(Activity activity) {
        // Nothing to do.
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
    public File storeBytes(byte[] bytes, String title) {
        // In Fake DB, store the bytes as a temporary file in the local filesystem.
        String id = IdFactory.getFileId(bytes);

        java.io.File jFile = new java.io.File(mContext.getCacheDir(), id);
        try (FileOutputStream out = new FileOutputStream(jFile)) {
            out.write(bytes);
        } catch (IOException e) {
            Log.e(TAG, e.getMessage(), e);
        }

        return new File(
                id,
                null,
                title,
                bytes.length,
                Constants.PDF_MIME_TYPE
        );
    }

    @Override
    public byte[] readBytes(File file) {
        java.io.File jFile = new java.io.File(mContext.getCacheDir(), file.getId());
        try (FileInputStream in = new FileInputStream(jFile)) {
            return ByteStreams.toByteArray(in);
        } catch (IOException e) {
            Log.e(TAG, e.getMessage(), e);
        }

        return null;
    }
}
