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
import io.v.android.apps.reader.vdl.DeviceSet;
import io.v.android.apps.reader.vdl.File;

/**
 * A fake implementation of the DB interface for manual testing.
 */
public class FakeDB implements DB {

    private static final Object[][] FILE_DATA = {
            { "fileId1", "Foo.pdf" },
            { "fileId2", "Bar.pdf" },
    };

    private static final Object[][] DEVICE_SET_DATA = {
            { "deviceSetId1", "fileId1" },
            { "deviceSetId2", "fileId2" },
    };

    private FakeFileList mFileList;
    private FakeDeviceSetList mDeviceSetList;

    public FakeDB(Context context) {
        mFileList = new FakeFileList();
        mDeviceSetList = new FakeDeviceSetList();
    }

    static class FakeFileList implements DBList<File> {

        private List<File> mFiles;
        private Listener mListener;

        public FakeFileList() {
            mFiles = new ArrayList<>();
            for (Object[] fileData : FILE_DATA) {
                mFiles.add(createFile(fileData));
            }
        }

        private static File createFile(Object[] fileData) {
            return new File(
                    (String) fileData[0],   // File ID
                    null,                   // BlobRef
                    (String) fileData[1],   // Title
                    0L,                     // Size
                    null                    // Type
            );
        }

        @Override
        public int getItemCount() {
            return mFiles.size();
        }

        @Override
        public File getItem(int position) {
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

    static class FakeDeviceSetList implements DBList<DeviceSet> {

        private List<DeviceSet> mDeviceSets;
        private Listener mListener;

        public FakeDeviceSetList() {
            mDeviceSets = new ArrayList<>();
            for (Object[] deviceSetData : DEVICE_SET_DATA) {
                mDeviceSets.add(createDeviceSet(deviceSetData));
            }
        }

        private static DeviceSet createDeviceSet(Object[] deviceSetData) {
            return new DeviceSet(
                    (String) deviceSetData[0],  // Device Set ID
                    (String) deviceSetData[1],  // File ID
                    null                        // Devices
            );
        }

        @Override
        public int getItemCount() {
            return mDeviceSets.size();
        }

        @Override
        public DeviceSet getItem(int position) {
            return mDeviceSets.get(position);
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

    @Override
    public DBList<DeviceSet> getDeviceSetList() {
        return mDeviceSetList;
    }

    @Override
    public File getFileById(String id) {
        for (int i = 0; i < mFileList.getItemCount(); ++i) {
            File file = mFileList.getItem(i);
            if (file.getId().equals(id)) {
                return file;
            }
        }

        return null;
    }

}
