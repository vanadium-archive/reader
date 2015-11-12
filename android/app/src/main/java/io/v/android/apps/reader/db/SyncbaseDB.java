// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.android.apps.reader.db;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.widget.Toast;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableMap;
import com.google.common.collect.Lists;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import io.v.android.apps.reader.model.DeviceInfoFactory;
import io.v.android.apps.reader.model.Listener;
import io.v.android.apps.reader.vdl.Device;
import io.v.android.apps.reader.vdl.DeviceSet;
import io.v.android.apps.reader.vdl.File;
import io.v.android.libs.security.BlessingsManager;
import io.v.android.v23.V;
import io.v.android.v23.services.blessing.BlessingCreationException;
import io.v.android.v23.services.blessing.BlessingService;
import io.v.impl.google.naming.NamingUtil;
import io.v.impl.google.services.syncbase.SyncbaseServer;
import io.v.v23.VIterable;
import io.v.v23.context.CancelableVContext;
import io.v.v23.context.VContext;
import io.v.v23.rpc.Server;
import io.v.v23.security.BlessingPattern;
import io.v.v23.security.Blessings;
import io.v.v23.security.VCertificate;
import io.v.v23.security.VPrincipal;
import io.v.v23.security.VSecurity;
import io.v.v23.security.access.AccessList;
import io.v.v23.security.access.Constants;
import io.v.v23.security.access.Permissions;
import io.v.v23.services.syncbase.nosql.BatchOptions;
import io.v.v23.services.syncbase.nosql.KeyValue;
import io.v.v23.services.syncbase.nosql.SyncgroupMemberInfo;
import io.v.v23.services.syncbase.nosql.SyncgroupSpec;
import io.v.v23.services.syncbase.nosql.TableRow;
import io.v.v23.services.watch.ResumeMarker;
import io.v.v23.syncbase.Syncbase;
import io.v.v23.syncbase.SyncbaseApp;
import io.v.v23.syncbase.SyncbaseService;
import io.v.v23.syncbase.nosql.BatchDatabase;
import io.v.v23.syncbase.nosql.Database;
import io.v.v23.syncbase.nosql.RowRange;
import io.v.v23.syncbase.nosql.Syncgroup;
import io.v.v23.syncbase.nosql.Table;
import io.v.v23.syncbase.nosql.WatchChange;
import io.v.v23.verror.ExistException;
import io.v.v23.verror.VException;
import io.v.v23.vom.VomUtil;

/**
 * A class representing the syncbase instance.
 */
public class SyncbaseDB implements DB {

    private static final String TAG = SyncbaseDB.class.getSimpleName();

    /**
     * The intent result code for when we get blessings from the account manager.
     * The value must not conflict with any other blessing result codes.
     */
    private static final int BLESSING_REQUEST = 200;

    private static final String GLOBAL_MOUNT_TABLE = "/ns.dev.v.io:8101";
    private static final String SYNCBASE_APP = "reader";
    private static final String SYNCBASE_DB = "db";
    private static final String TABLE_FILES = "files";
    private static final String TABLE_DEVICES = "devices";
    private static final String TABLE_DEVICE_SETS = "deviceSets";

    private Permissions mPermissions;
    private Context mContext;
    private VContext mVContext;
    private SyncbaseHierarchy mLocalSB;
    private boolean mInitialized;

    private String mUsername;
    private String mSyncgroupName;

    SyncbaseDB(Context context) {
        mContext = context;
    }

    @Override
    public void init(Activity activity) {
        if (isInitialized()) {
            // Already initialized.
            return;
        }

        if (mVContext == null) {
            mVContext = V.init(mContext);
            try {
                mVContext = V.withListenSpec(
                        mVContext, V.getListenSpec(mVContext).withProxy("proxy"));
            } catch (VException e) {
                handleError("Couldn't setup vanadium proxy: " + e.getMessage());
            }
        }

        AccessList acl = new AccessList(
                ImmutableList.of(new BlessingPattern("...")), ImmutableList.<String>of());
        mPermissions = new Permissions(ImmutableMap.of(
                Constants.READ.getValue(), acl,
                Constants.WRITE.getValue(), acl,
                Constants.ADMIN.getValue(), acl,
                Constants.RESOLVE.getValue(), acl,
                Constants.DEBUG.getValue(), acl));
        getBlessings(activity);
    }

    @Override
    public boolean isInitialized() {
        return mInitialized;
    }

    private void getBlessings(Activity activity) {
        Blessings blessings = null;
        try {
            // See if there are blessings stored in shared preferences.
            blessings = BlessingsManager.getBlessings(mContext);
        } catch (VException e) {
            handleError("Error getting blessings from shared preferences " + e.getMessage());
        }
        if (blessings == null) {
            // Request new blessings from the account manager via an intent.  This intent
            // will call back to onActivityResult() which will continue with
            // configurePrincipal().
            refreshBlessings(activity);
            return;
        }
        configurePrincipal(blessings);
    }

    private void refreshBlessings(Activity activity) {
        Intent intent = BlessingService.newBlessingIntent(mContext);
        activity.startActivityForResult(intent, BLESSING_REQUEST);
    }

    @Override
    public boolean onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == BLESSING_REQUEST) {
            try {
                byte[] blessingsVom = BlessingService.extractBlessingReply(resultCode, data);
                Blessings blessings = (Blessings) VomUtil.decode(blessingsVom, Blessings.class);
                BlessingsManager.addBlessings(mContext, blessings);
                Toast.makeText(mContext, "Success", Toast.LENGTH_SHORT).show();
                configurePrincipal(blessings);
            } catch (BlessingCreationException e) {
                handleError("Couldn't create blessing: " + e.getMessage());
            } catch (VException e) {
                handleError("Couldn't derive blessing: " + e.getMessage());
            }
            return true;
        }
        return false;
    }

    private void configurePrincipal(Blessings blessings) {
        try {
            VPrincipal p = V.getPrincipal(mVContext);
            p.blessingStore().setDefaultBlessings(blessings);
            p.blessingStore().set(blessings, new BlessingPattern("..."));
            VSecurity.addToRoots(p, blessings);

            // "<user_email>/android"
            mUsername = mountNameFromBlessings(blessings);
        } catch (VException e) {
            handleError(String.format(
                    "Couldn't set local blessing %s: %s", blessings, e.getMessage()));
            return;
        }

        setupLocalSyncbase();
    }

    private void setupLocalSyncbase() {
        // "users/<user_email>/android/reader/<device_id>/syncbase"
        final String syncbaseName = NamingUtil.join(
                "users",
                mUsername,
                "reader",
                DeviceInfoFactory.getDevice(mContext).getId(),
                "syncbase"
        );
        Log.i(TAG, "SyncbaseName: " + syncbaseName);

        // Prepare the syncbase storage directory.
        java.io.File storageDir = new java.io.File(mContext.getFilesDir(), "syncbase");
        storageDir.mkdirs();

        try {
            mVContext = SyncbaseServer.withNewServer(
                    mVContext,
                    new SyncbaseServer.Params()
                            .withName(syncbaseName)
                            .withPermissions(mPermissions)
                            .withStorageRootDir(storageDir.getAbsolutePath()));
        } catch (SyncbaseServer.StartException e) {
            handleError("Couldn't start syncbase server");
            return;
        }

        try {
            Server syncbaseServer = V.getServer(mVContext);
            String serverName = "/" + syncbaseServer.getStatus().getEndpoints()[0];

            Log.i(TAG, "Local Syncbase ServerName: " + serverName);

            mLocalSB = createHierarchy(serverName, "local");

            setupCloudSyncbase();
        } catch (VException e) {
            handleError("Couldn't setup syncbase service: " + e.getMessage());
        }
    }

    /**
     * This method assumes that there is a separate cloudsync instance running at:
     * "users/[user_email]/reader/cloudsync"
     */
    private void setupCloudSyncbase() {
        try {
            // "users/<user_email>/reader/cloudsync"
            String cloudsyncName = NamingUtil.join(
                    "users",
                    NamingUtil.trimSuffix(mUsername, "android"),
                    "reader/cloudsync"
            );

            SyncbaseHierarchy cloudSB = createHierarchy(cloudsyncName, "cloud");

            createSyncgroup(cloudSB.db);
        } catch (VException e) {
            handleError("Couldn't setup cloudsync: " + e.getMessage());
        }
    }

    /**
     * Creates a syncgroup at cloudsync with the following name:
     * "users/[user_email]/reader/cloudsync/%%sync/cloudsync"
     */
    private void createSyncgroup(Database db) {
        mSyncgroupName = NamingUtil.join(
                "users",
                NamingUtil.trimSuffix(mUsername, "android"),
                "reader/cloudsync/%%sync/cloudsync"
        );

        Syncgroup group = db.getSyncgroup(mSyncgroupName);

        List<TableRow> prefixes = ImmutableList.of(
                new TableRow(TABLE_FILES, ""),
                new TableRow(TABLE_DEVICES, ""),
                new TableRow(TABLE_DEVICE_SETS, "")
        );

        List<String> mountTables = ImmutableList.of(
                NamingUtil.join(
                        GLOBAL_MOUNT_TABLE,
                        "users",
                        NamingUtil.trimSuffix(mUsername, "android"),
                        "reader/rendezvous"
                )
        );

        SyncgroupSpec spec = new SyncgroupSpec(
                "reader syncgroup",
                mPermissions,
                prefixes,
                mountTables,
                false
        );

        try {
            group.create(mVContext, spec, new SyncgroupMemberInfo());
            Log.i(TAG, "Syncgroup is created successfully.");
        } catch (ExistException e) {
                Log.i(TAG, "Syncgroup already exists.");
        } catch (VException e) {
                handleError("Syncgroup could not be created: " + e.getMessage());
                return;
            }
        }

        joinSyncgroup();
    }

    /**
     * Sets up the local syncbase to join the syncgroup.
     */
    private void joinSyncgroup() {
        Syncgroup group = mLocalSB.db.getSyncgroup(mSyncgroupName);

        try {
            SyncgroupSpec spec = group.join(mVContext, new SyncgroupMemberInfo());
            Log.i(TAG, "Successfully joined the syncgroup!");
            Log.i(TAG, "Syncgroup spec: " + spec);

            Map<String, SyncgroupMemberInfo> members = group.getMembers(mVContext);
            for (String memberName : members.keySet()) {
                Log.i(TAG, "Member: " + memberName);
            }
        } catch (VException e) {
            handleError("Could not join the syncgroup: " + e.getMessage());
            return;
        }

        mInitialized = true;

        // When successfully joined the syncgroup, first register the device information.
        registerDevice();
    }

    private void registerDevice() {
        try {
            Device thisDevice = DeviceInfoFactory.getDevice(mContext);
            mLocalSB.devices.put(mVContext, thisDevice.getId(), thisDevice, Device.class);
            Log.i(TAG, "Registered this device to the syncbase table: " + thisDevice);
        } catch (VException e) {
            handleError("Could not register this device: " + e.getMessage());
        }
    }

    /**
     * Creates the "[app]/[db]/[table]" hierarchy at the provided syncbase name.
     */
    private SyncbaseHierarchy createHierarchy(
            String syncbaseName, String debugName) throws VException {

        SyncbaseService service = Syncbase.newService(syncbaseName);

        SyncbaseHierarchy result = new SyncbaseHierarchy();

        result.app = service.getApp(SYNCBASE_APP);
        if (!result.app.exists(mVContext)) {
            result.app.create(mVContext, mPermissions);
            Log.i(TAG, String.format(
                    "\"%s\" app is created at %s", result.app.name(), debugName));
        } else {
            Log.i(TAG, String.format(
                    "\"%s\" app already exists at %s", result.app.name(), debugName));
        }

        result.db = result.app.getNoSqlDatabase(SYNCBASE_DB, null);
        if (!result.db.exists(mVContext)) {
            result.db.create(mVContext, mPermissions);
            Log.i(TAG, String.format(
                    "\"%s\" db is created at %s", result.db.name(), debugName));
        } else {
            Log.i(TAG, String.format(
                    "\"%s\" db already exists at %s", result.db.name(), debugName));
        }

        result.files = result.db.getTable(TABLE_FILES);
        if (!result.files.exists(mVContext)) {
            result.files.create(mVContext, mPermissions);
            Log.i(TAG, String.format(
                    "\"%s\" table is created at %s", result.files.name(), debugName));
        } else {
            Log.i(TAG, String.format(
                    "\"%s\" table already exists at %s", result.files.name(), debugName));
        }

        result.devices = result.db.getTable(TABLE_DEVICES);
        if (!result.devices.exists(mVContext)) {
            result.devices.create(mVContext, mPermissions);
            Log.i(TAG, String.format(
                    "\"%s\" table is created at %s", result.devices.name(), debugName));
        } else {
            Log.i(TAG, String.format(
                    "\"%s\" table already exists at %s", result.devices.name(), debugName));
        }

        result.deviceSets = result.db.getTable(TABLE_DEVICE_SETS);
        if (!result.deviceSets.exists(mVContext)) {
            result.deviceSets.create(mVContext, mPermissions);
            Log.i(TAG, String.format(
                    "\"%s\" table is created at %s", result.deviceSets.name(), debugName));
        } else {
            Log.i(TAG, String.format(
                    "\"%s\" table already exists at %s", result.deviceSets.name(), debugName));
        }

        return result;
    }

    /**
     * This method finds the last certificate in our blessing's certificate
     * chains whose extension contains an '@'. We will assume that extension to
     * represent our username.
     */
    private static String mountNameFromBlessings(Blessings blessings) {
        for (List<VCertificate> chain : blessings.getCertificateChains()) {
            for (VCertificate certificate : Lists.reverse(chain)) {
                if (certificate.getExtension().contains("@")) {
                    return certificate.getExtension();
                }
            }
        }
        return "";
    }

    @Override
    public DBList<File> getFileList() {
        if (!mInitialized) {
            return new EmptyList<>();
        }

        return new SyncbaseFileList(TABLE_FILES, File.class);
    }

    @Override
    public DBList<Device> getDeviceList() {
        if (!mInitialized) {
            return new EmptyList<>();
        }

        return new SyncbaseDeviceList(TABLE_DEVICES, Device.class);
    }

    @Override
    public DBList<DeviceSet> getDeviceSetList() {
        if (!mInitialized) {
            return new EmptyList<>();
        }

        return new SyncbaseDeviceSetList(TABLE_DEVICE_SETS, DeviceSet.class);
    }

    @Override
    public void addFile(File file) {
        try {
            mLocalSB.files.put(mVContext, file.getId(), file, File.class);
        } catch (VException e) {
            handleError("Failed to add the file(" + file + "): " + e.getMessage());
        }
    }

    @Override
    public void deleteFile(String id) {
        try {
            mLocalSB.files.delete(mVContext, id);
        } catch (VException e) {
            handleError("Failed to delete the file with id " + id + ": " + e.getMessage());
        }
    }

    @Override
    public void addDeviceSet(DeviceSet ds) {
        try {
            mLocalSB.deviceSets.put(mVContext, ds.getId(), ds, DeviceSet.class);
        } catch (VException e) {
            handleError("Failed to add the device set(" + ds + "): " + e.getMessage());
        }
    }

    @Override
    public void updateDeviceSet(DeviceSet ds) {
        try {
            mLocalSB.deviceSets.put(mVContext, ds.getId(), ds, DeviceSet.class);
        } catch (VException e) {
            handleError("Failed to update the device set(" + ds + "): " + e.getMessage());
        }
    }

    @Override
    public void deleteDeviceSet(String id) {
        try {
            mLocalSB.deviceSets.delete(mVContext, id);
        } catch (VException e) {
            handleError("Failed to delete the device set with id " + id + ": " + e.getMessage());
        }
    }

    private void handleError(String msg) {
        Log.e(TAG, msg);
        Toast.makeText(mContext, msg, Toast.LENGTH_LONG).show();
    }

    // TODO(youngseokyoon): Remove once the list is implemented properly.
    private static class EmptyList<E> implements DBList<E> {
        @Override
        public int getItemCount() {
            return 0;
        }

        @Override
        public E getItem(int position) {
            return null;
        }

        @Override
        public E getItemById(String id) {
            return null;
        }

        @Override
        public void setListener(Listener listener) {
        }

        @Override
        public void discard() {
        }
    }

    private class SyncbaseFileList extends SyncbaseDBList<File> {

        public SyncbaseFileList(String tableName, Class clazz) {
            super(tableName, clazz);
        }

        @Override
        protected String getId(File file) {
            return file.getId();
        }
    }

    private class SyncbaseDeviceList extends SyncbaseDBList<Device> {

        public SyncbaseDeviceList(String tableName, Class clazz) {
            super(tableName, clazz);
        }

        @Override
        protected String getId(Device device) {
            return device.getId();
        }
    }

    private class SyncbaseDeviceSetList extends SyncbaseDBList<DeviceSet> {

        public SyncbaseDeviceSetList(String tableName, Class clazz) {
            super(tableName, clazz);
        }

        @Override
        protected String getId(DeviceSet deviceSet) {
            return deviceSet.getId();
        }
    }

    private abstract class SyncbaseDBList<E> implements DBList<E> {

        private final String TAG;

        private CancelableVContext mCancelableVContext;
        private Handler mHandler;
        private Listener mListener;
        private ResumeMarker mResumeMarker;
        private String mTableName;
        private Class mClass;
        private List<E> mItems;

        public SyncbaseDBList(String tableName, Class clazz) {
            mCancelableVContext = mVContext.withCancel();
            mTableName = tableName;
            mClass = clazz;
            mItems = new ArrayList<>();
            mHandler = new Handler(Looper.getMainLooper());

            TAG = String.format("%s<%s>",
                    SyncbaseDBList.class.getSimpleName(), mClass.getSimpleName());

            readInitialData();

            // Run this in a background thread
            new Thread(new Runnable() {
                @Override
                public void run() {
                    watchForChanges();
                }
            }).start();
        }

        private void readInitialData() {
            try {
                Log.i(TAG, "Reading initial data from table: " + mTableName);

                BatchDatabase batch = mLocalSB.db.beginBatch(
                        mCancelableVContext, new BatchOptions("fetch", true));

                // Read existing data from the table.
                Table table = batch.getTable(mTableName);
                VIterable<KeyValue> kvs = table.scan(mCancelableVContext, RowRange.range("", ""));
                for (KeyValue kv : kvs) {
                    @SuppressWarnings("unchecked")
                    E item = (E) VomUtil.decode(kv.getValue(), mClass);
                    mItems.add(item);
                }

                // Remember this resume marker for the watch call.
                mResumeMarker = batch.getResumeMarker(mVContext);

                batch.abort(mCancelableVContext);

                Log.i(TAG, "Done reading initial data from table: " + mTableName);
            } catch (Exception e) {
                handleError(e.getMessage());
            }
        }

        private void watchForChanges() {
            try {
                // Watch for new changes coming from other Syncbase peers.
                VIterable<WatchChange> watchStream = mLocalSB.db.watch(
                        mCancelableVContext, mTableName, "", mResumeMarker);

                Log.i(TAG, "Watching for changes of table: " + mTableName + "...");

                for (final WatchChange wc : watchStream) {
                    printWatchChange(wc);

                    // Handle the watch change differently, depending on the change type.
                    switch (wc.getChangeType()) {
                        case PUT_CHANGE:
                            // Run this in the UI thread.
                            mHandler.post(new Runnable() {
                                @Override
                                public void run() {
                                    handlePutChange(wc);
                                }
                            });
                            break;

                        case DELETE_CHANGE:
                            // Run this in the UI thread.
                            mHandler.post(new Runnable() {
                                @Override
                                public void run() {
                                    handleDeleteChange(wc);
                                }
                            });
                            break;
                    }
                }
            } catch (Exception e) {
                handleError(e.getMessage());
                Log.e(TAG, "Stack Trace: ", e);
            }
        }

        private void printWatchChange(WatchChange wc) {
            Log.i(TAG, "*** New Watch Change ***");
            Log.i(TAG, "- ChangeType: " + wc.getChangeType().toString());
            Log.i(TAG, "- RowName: " + wc.getRowName());
            Log.i(TAG, "- TableName: " + wc.getTableName());
            Log.i(TAG, "- VomValue: " + VomUtil.bytesToHexString(wc.getVomValue()));
            Log.i(TAG, "- isContinued: " + wc.isContinued());
            Log.i(TAG, "- isFromSync: " + wc.isFromSync());
            Log.i(TAG, "========================");
        }

        private void handlePutChange(WatchChange wc) {
            E item = null;

            try {
                item = (E) VomUtil.decode(wc.getVomValue(), mClass);
            } catch (VException e) {
                handleError("Could not decode the Vom: " + e.getMessage());
            }

            if (item == null) {
                return;
            }

            boolean handled = false;
            for (int i = 0; i < mItems.size(); ++i) {
                E e = mItems.get(i);

                if (wc.getRowName().equals(getId(e))) {
                    // Update the file record here.

                    mItems.remove(i);
                    mItems.add(i, item);

                    if (mListener != null) {
                        mListener.notifyItemChanged(i);
                    }

                    handled = true;
                }
            }

            if (handled) {
                return;
            }

            // This is a new row added in the table.
            mItems.add(item);

            if (mListener != null) {
                mListener.notifyItemInserted(mItems.size() - 1);
            }
        }

        private void handleDeleteChange(WatchChange wc) {
            boolean handled = false;
            for (int i = 0; i < mItems.size(); ++i) {
                E e = mItems.get(i);

                if (wc.getRowName().equals(getId(e))) {
                    mItems.remove(i);

                    if (mListener != null) {
                        mListener.notifyItemRemoved(i);
                    }

                    handled = true;
                }
            }

            if (!handled) {
                handleError("DELETE_CHANGE arrived but no matching item found in the table.");
            }
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
            for (E e : mItems) {
                if (getId(e).equals(id)) {
                    return e;
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
            Log.i(TAG, "Cancelling the watch stream.");
            mCancelableVContext.cancel();
        }
    }

    private static class SyncbaseHierarchy {
        public SyncbaseApp app;
        public Database db;
        public Table files;
        public Table devices;
        public Table deviceSets;
    }
}
