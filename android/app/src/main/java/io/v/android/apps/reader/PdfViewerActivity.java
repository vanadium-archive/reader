// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.android.apps.reader;

import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.OpenableColumns;
import android.support.v4.view.GestureDetectorCompat;
import android.util.Log;
import android.view.Menu;
import android.view.MenuItem;
import android.view.MotionEvent;
import android.view.View;
import android.widget.ProgressBar;
import android.widget.TextView;

import com.google.android.gms.analytics.HitBuilders;
import com.google.common.util.concurrent.ListeningExecutorService;
import com.google.common.util.concurrent.MoreExecutors;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.Executors;

import io.v.android.apps.reader.db.DB;
import io.v.android.apps.reader.db.DB.DBList;
import io.v.android.apps.reader.model.IdFactory;
import io.v.android.apps.reader.model.Listener;
import io.v.android.apps.reader.vdl.DeviceMeta;
import io.v.android.apps.reader.vdl.DeviceSet;
import io.v.android.apps.reader.vdl.File;

/**
 * Activity that shows the contents of the selected pdf file.
 */
public class PdfViewerActivity extends BaseReaderActivity {

    private static final String TAG = PdfViewerActivity.class.getSimpleName();
    private static final int BLOCK_SIZE = 0x1000;   // 4K

    // Category string used for Google Analytics tracking.
    private static final String CATEGORY_PAGE_NAVIGATION = "Page Navigation";
    private static final String EXTRA_DEVICE_SET_ID = "device_set_id";

    private PdfViewWrapper mPdfView;
    private ProgressBar mProgressBar;
    private TextView mProgressText;
    private MenuItem mMenuItemLinkPage;

    private DBList<DeviceSet> mDeviceSets;
    private DeviceSet mCurrentDS;

    private ListeningExecutorService mThreadPool;
    private Handler mHandler;

    /**
     * Helper methods for creating an intent to start a PdfViewerActivity.
     */
    public static Intent createIntent(Context context, String deviceSetId) {
        Intent intent = new Intent(context, PdfViewerActivity.class);
        intent.putExtra(EXTRA_DEVICE_SET_ID, deviceSetId);
        return intent;
    }

    public static Intent createIntent(Context context, Uri uri) {
        Intent intent = new Intent(context, PdfViewerActivity.class);
        intent.setData(uri);
        return intent;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.activity_pdf_viewer);

        mThreadPool = MoreExecutors.listeningDecorator(Executors.newFixedThreadPool(1));
        mHandler = new Handler(Looper.getMainLooper());

        mPdfView = (PdfViewWrapper) findViewById(R.id.pdfview);
        mPdfView.init();

        mProgressBar = (ProgressBar) findViewById(R.id.pdf_progress_bar);
        mProgressText = (TextView) findViewById(R.id.pdf_progress_text);

        // Swipe gesture detection.
        final GestureDetectorCompat swipeDetector = SwipeGestureDetector.create(
                this,
                new SwipeGestureDetector.SimpleOnSwipeListener() {
                    @Override
                    public boolean onSwipeLeft() {
                        nextPage();
                        return true;
                    }

                    @Override
                    public boolean onSwipeRight() {
                        prevPage();
                        return true;
                    }
                });

        mPdfView.setOnTouchListener(new View.OnTouchListener() {
            @Override
            public boolean onTouch(View v, MotionEvent event) {
                return swipeDetector.onTouchEvent(event);
            }
        });
    }

    @Override
    protected void onStart() {
        super.onStart();

        /**
         * Suppress the start process until the DB initialization is completed.
         * onStart() method will be called again after the user selects her blessings.
         */
        if (!getDB().isInitialized()) {
            return;
        }

        mDeviceSets = getDB().getDeviceSetList();
        mDeviceSets.setListener(new Listener() {
            @Override
            public void notifyItemChanged(int position) {
                if (mCurrentDS == null) {
                    return;
                }

                DeviceSet changed = mDeviceSets.getItem(position);
                if (!changed.getId().equals(mCurrentDS.getId())) {
                    return;
                }

                int oldPage = getPage();
                mCurrentDS = cloneDeviceSet(changed);
                int newPage = getPage();

                DeviceMeta dm = getDeviceMeta();

                if (oldPage != newPage) {
                    mPdfView.setPage(dm.getPage());
                    writeNavigationAction("Page Changed", newPage);
                }

                if (mMenuItemLinkPage != null) {
                    mMenuItemLinkPage.setChecked(dm.getLinked());
                }
            }

            @Override
            public void notifyItemInserted(int position) {
                // Nothing to do
            }

            @Override
            public void notifyItemRemoved(int position) {
                // Nothing to do
            }
        });

        Intent intent = getIntent();

        if (intent.hasExtra(EXTRA_DEVICE_SET_ID)) {
            /**
             * Case #1.
             * The EXTRA_DEVICE_SET_ID value is set when this activity is started by touching one of
             * the existing device sets from the DeviceSetChooserActivity.
             */
            Log.i(TAG, "onStart: Case #1: started by selecting an existing device set.");

            // Get the device set from the DB and join it.
            DeviceSet ds = mDeviceSets.getItemById(intent.getStringExtra(EXTRA_DEVICE_SET_ID));
            joinDeviceSet(ds);
        } else if (intent.getData() != null) {
            /**
             * Case #2.
             * The intent.getData() is set as a content Uri when this activity is started by using
             * the floating action button from the DeviceSetChooserActivity and selecting one of the
             * local PDF files from the browser.
             */
            Log.i(TAG, "onStart: Case #2: started by using the floating action button.");

            Uri uri = intent.getData();
            createAndJoinDeviceSet(uri);
        } else if (intent.hasExtra(Intent.EXTRA_STREAM)) {
            /**
             * Case #3.
             * The EXTRA_STREAM value is set when this activity is started by receiving an implicit
             * intent from another app by sharing a PDF file to the reader app.
             */
            Log.i(TAG, "onStart: Case #3: started by an implicit intent from another app.");

            Uri uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            createAndJoinDeviceSet(uri);
        }
    }

    // TODO(youngseokyoon): generalize these clone methods
    private DeviceSet cloneDeviceSet(DeviceSet ds) {
        if (ds == null) {
            return null;
        }

        Map<String, DeviceMeta> devicesCopy = null;
        if (ds.getDevices() != null) {
            devicesCopy = new HashMap<>();
            for (Map.Entry<String, DeviceMeta> entry : ds.getDevices().entrySet()) {
                devicesCopy.put(entry.getKey(), cloneDeviceMeta(entry.getValue()));
            }
        }

        return new DeviceSet(ds.getId(), ds.getFileId(), devicesCopy);
    }

    // TODO(youngseokyoon): generalize these clone methods
    private DeviceMeta cloneDeviceMeta(DeviceMeta dm) {
        if (dm == null) {
            return null;
        }

        return new DeviceMeta(dm.getDeviceId(), dm.getPage(), dm.getZoom(), dm.getLinked());
    }

    private void createAndJoinDeviceSet(final Uri fileUri) {
        mThreadPool.submit(new Runnable() {
            @Override
            public void run() {
                try {
                    byte[] bytes = getBytesFromUri(fileUri);
                    File file = createFile(bytes, getTitleFromUri(fileUri));
                    final DeviceSet ds = createDeviceSet(file);

                    // Join the device set from the UI thread.
                    mHandler.post(new Runnable() {
                        @Override
                        public void run() {
                            joinDeviceSet(ds);
                        }
                    });
                } catch (Exception e) {
                    Log.e(TAG, "Could not create the device set: " + e.getMessage(), e);

                    // In case of an error, finish this activity and go back to the previous one.
                    mHandler.post(new Runnable() {
                        @Override
                        public void run() {
                            finish();
                        }
                    });
                }
            }
        });
    }

    private File createFile(final byte[] bytes, final String title) throws IOException {
        initProgress(R.string.progress_writing_pdf, bytes.length);

        // Create a vdl File object representing this pdf file and put it in the db.
        DB.FileBuilder builder;
        try {
            builder = getDB().getFileBuilder(title);
        } catch (RuntimeException e) {
            throw new IOException(e);
        }

        int cur = 0;
        int available = bytes.length;
        while (available > 0) {
            int numBytes = Math.min(BLOCK_SIZE, available);
            builder.write(bytes, cur, numBytes);
            cur += numBytes;
            available -= numBytes;

            updateProgress(cur);
        }

        initProgress(R.string.progress_finishing_up_writing, -1);
        File vFile = builder.build();

        Log.i(TAG, "vFile created: " + vFile);
        if (vFile == null) {
            throw new IOException("Could not store the file content: " + title);
        }
        getDB().addFile(vFile);

        return vFile;
    }

    @Override
    protected void onStop() {
        super.onStop();

        if (mDeviceSets != null) {
            mDeviceSets.discard();
        }

        leaveDeviceSet();
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        // Inflate the menu; this adds items to the action bar if it is present.
        getMenuInflater().inflate(R.menu.menu_pdf_viewer, menu);
        mMenuItemLinkPage = menu.findItem(R.id.action_link_page);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        switch (item.getItemId()) {
            case R.id.action_link_page:
                toggleLinkedState(item.isChecked());
                return true;

            default:
                return super.onOptionsItemSelected(item);
        }
    }

    private void toggleLinkedState(boolean checked) {
        writeNavigationAction(checked ? "Unlink Page" : "Link Page");

        DeviceMeta dm = getDeviceMeta();
        if (dm == null) {
            return;
        }

        dm.setLinked(!checked);
        getDB().updateDeviceSet(mCurrentDS);
    }

    private DeviceMeta createDeviceMeta() {
        int page = 1;
        int zoom = 1;
        boolean linked = true;

        return new DeviceMeta(getDeviceId(), page, zoom, linked);
    }

    private DeviceSet createDeviceSet(File vFile) {
        initProgress(R.string.progress_creating_device_set, 1);

        String id = IdFactory.getRandomId();
        String fileId = vFile.getId();
        Map<String, DeviceMeta> devices = new HashMap<>();

        DeviceSet ds = new DeviceSet(id, fileId, devices);
        getDB().addDeviceSet(ds);

        updateProgress(1);

        return ds;
    }

    private void joinDeviceSet(DeviceSet ds) {
        showProgressWidgets(false);

        mPdfView.loadPdfFile("/file_id/" + ds.getFileId());

        // Create a new device meta, and update the device set with it.
        Log.i(TAG, "Joining device set: " + ds.getId());
        DeviceMeta dm = createDeviceMeta();
        // TODO(youngseokyoon): don't wait till these operations are finished.
        ds.getDevices().put(dm.getDeviceId(), dm);
        getDB().updateDeviceSet(ds);

        mCurrentDS = ds;
    }

    private void leaveDeviceSet() {
        if (mCurrentDS == null) {
            return;
        }

        Log.i(TAG, "Leaving device set: " + mCurrentDS.getId());
        Map<String, DeviceMeta> devices = mCurrentDS.getDevices();
        devices.remove(getDeviceId());

        if (devices.isEmpty()) {
            Log.i(TAG, "Last one to leave the device set. Deleting " + mCurrentDS.getId());
            getDB().deleteDeviceSet(mCurrentDS.getId());
        } else {
            getDB().updateDeviceSet(mCurrentDS);
        }

        mCurrentDS = null;
    }

    private byte[] getBytesFromUri(final Uri uri) throws IOException {
        Log.i(TAG, "getBytesFromUri: " + uri.toString());

        InputStream in = getContentResolver().openInputStream(uri);
        int available = in.available();

        initProgress(R.string.progress_reading_source_pdf, available);

        byte[] result = new byte[available];
        int cur = 0;
        int bytesRead;

        while ((bytesRead = in.read(result, cur, Math.min(BLOCK_SIZE, available))) != -1 &&
                available > 0) {
            cur += bytesRead;
            available -= bytesRead;
            updateProgress(cur);
        }

        in.close();

        return result;
    }

    private String getTitleFromUri(Uri uri) {
        try {
            Cursor cursor = getContentResolver().query(uri, null, null, null, null);

            int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
            cursor.moveToFirst();
            return cursor.getString(nameIndex);
        } catch (Exception e) {
            handleException(e);

            if (uri != null) {
                return uri.getLastPathSegment();
            }
        }

        return null;
    }

    private DeviceMeta getDeviceMeta() {
        return getDeviceMeta(mCurrentDS);
    }

    private DeviceMeta getDeviceMeta(DeviceSet ds) {
        if (ds == null) {
            return null;
        }

        return ds.getDevices().get(getDeviceId());
    }

    private int getPage() {
        DeviceMeta dm = getDeviceMeta();
        if (dm == null) {
            return 0;
        }

        return dm.getPage();
    }

    /**
     * Move all the linked pages to their previous pages.
     */
    private void prevPage() {
        writeNavigationAction("Previous Page");

        if (mCurrentDS == null || mPdfView.getPageCount() <= 0) {
            return;
        }

        DeviceSet ds = cloneDeviceSet(mCurrentDS);

        // First, check if this device is linked or not.
        // If not, simply move the page of the current device.
        if (!getDeviceMeta(ds).getLinked()) {
            DeviceMeta dm = getDeviceMeta(ds);
            if (dm.getPage() > 1) {
                dm.setPage(dm.getPage() - 1);
            }

            getDB().updateDeviceSet(ds);
            return;
        }

        // Move all the linked pages
        Map<String, DeviceMeta> linkedDevices = getLinkedDevices(ds);
        int smallestPage = getSmallestPage(linkedDevices);

        if (smallestPage > 1) {
            for (String deviceId : linkedDevices.keySet()) {
                DeviceMeta dm = linkedDevices.get(deviceId);
                dm.setPage(dm.getPage() - 1);
            }

            getDB().updateDeviceSet(ds);
        }
    }

    /**
     * Move all the linked pages to their next pages.
     */
    private void nextPage() {
        writeNavigationAction("Next Page");

        if (mCurrentDS == null || mPdfView.getPageCount() <= 0) {
            return;
        }

        DeviceSet ds = cloneDeviceSet(mCurrentDS);

        // First, check if this device is linked or not.
        // If not, simply move the page of the current device.
        if (!getDeviceMeta(ds).getLinked()) {
            DeviceMeta dm = getDeviceMeta(ds);
            if (dm.getPage() < mPdfView.getPageCount()) {
                dm.setPage(dm.getPage() + 1);
            }

            getDB().updateDeviceSet(ds);
            return;
        }

        // Move all the linked pages
        Map<String, DeviceMeta> linkedDevices = getLinkedDevices(ds);
        int largestPage = getLargestPage(linkedDevices);

        if (largestPage < mPdfView.getPageCount()) {
            for (String deviceId : linkedDevices.keySet()) {
                DeviceMeta dm = linkedDevices.get(deviceId);
                dm.setPage(dm.getPage() + 1);
            }

            getDB().updateDeviceSet(ds);
        }
    }

    private Map<String, DeviceMeta> getLinkedDevices(DeviceSet ds) {
        if (ds == null) {
            return null;
        }

        Map<String, DeviceMeta> devices = ds.getDevices();
        Map<String, DeviceMeta> result = new HashMap<>();
        for (String deviceId : devices.keySet()) {
            DeviceMeta dm = devices.get(deviceId);
            if (dm.getLinked()) {
                result.put(deviceId, dm);
            }
        }

        return result;
    }

    private int getSmallestPage(Map<String, DeviceMeta> devices) {
        int result = -1;

        for (String deviceId : devices.keySet()) {
            DeviceMeta dm = devices.get(deviceId);
            if (result == -1 || dm.getPage() < result) {
                result = dm.getPage();
            }
        }

        return result;
    }

    private int getLargestPage(Map<String, DeviceMeta> devices) {
        int result = -1;

        for (String deviceId : devices.keySet()) {
            DeviceMeta dm = devices.get(deviceId);
            if (result == -1 || dm.getPage() > result) {
                result = dm.getPage();
            }
        }

        return result;
    }

    /**
     * Log a navigation event to the available trackers.
     */
    private void writeNavigationAction(String action) {
        writeNavigationAction(action, 0);
    }

    /**
     * Log a navigation event to the available trackers.
     */
    private void writeNavigationAction(String action, int value) {
        if (getTracker() != null) {
            getTracker().send(new HitBuilders.EventBuilder()
                    .setCustomDimension(1, Long.toString(System.currentTimeMillis()))
                    .setCustomDimension(2, Integer.toString(value))
                    .setCategory(CATEGORY_PAGE_NAVIGATION)
                    .setAction(action)
                    .setLabel(getDeviceId())
                    .build());
        }

        if (getLogger() != null) {
            getLogger().writeNavigationAction(action, value);
        }
    }

    private static void handleException(Throwable t) {
        Log.e(TAG, t.getMessage(), t);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        Log.i(TAG, String.format("onActivityResult(%d, %d, data) called", requestCode, resultCode));

        // Any other activity results would be handled here.
        Log.w(TAG, String.format(
                "Unhandled activity result. (requestCode: %d, resultCode: %d)",
                requestCode, resultCode));
    }

    private void initProgress(final int progressTextRes, final int maxProgress) {
        showProgressWidgets(true);
        mHandler.post(new Runnable() {
            @Override
            public void run() {
                mProgressText.setText(progressTextRes);

                if (maxProgress >= 0) {
                    mProgressBar.setIndeterminate(false);
                    mProgressBar.setMax(maxProgress);
                    mProgressBar.setProgress(0);
                } else {
                    mProgressBar.setIndeterminate(true);
                }
            }
        });
    }

    private void updateProgress(final int progress) {
        mHandler.post(new Runnable() {
            @Override
            public void run() {
                mProgressBar.setProgress(progress);
            }
        });
    }

    private void showProgressWidgets(final boolean showProgress) {
        mHandler.post(new Runnable() {
            @Override
            public void run() {
                if (showProgress) {
                    mProgressText.setVisibility(View.VISIBLE);
                    mProgressBar.setVisibility(View.VISIBLE);
                    mPdfView.setVisibility(View.INVISIBLE);
                } else {
                    mProgressText.setVisibility(View.INVISIBLE);
                    mProgressBar.setVisibility(View.INVISIBLE);
                    mPdfView.setVisibility(View.VISIBLE);
                }
            }
        });
    }

}
