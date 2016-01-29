// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.android.apps.reader;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.support.design.widget.FloatingActionButton;
import android.support.v7.widget.LinearLayoutManager;
import android.support.v7.widget.RecyclerView;
import android.support.v7.widget.helper.ItemTouchHelper;
import android.util.Log;
import android.view.Menu;
import android.view.MenuItem;

import com.google.common.util.concurrent.FutureCallback;
import com.google.common.util.concurrent.Futures;

/**
 * Activity that displays all the active device sets of this user.
 * <p/>
 * When the user clicks on one of the device sets, it starts the PdfViewerActivity with the file
 * associated with the device set.
 */
public class DeviceSetChooserActivity extends BaseReaderActivity {

    private static final String TAG = DeviceSetChooserActivity.class.getSimpleName();

    private static final int CHOOSE_PDF_FILE_REQUEST = 300;

    private RecyclerView mRecyclerView;
    private DeviceSetListAdapter mAdapter;
    private FloatingActionButton mButtonAddDeviceSet;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.activity_device_set_chooser);

        mRecyclerView = (RecyclerView) findViewById(R.id.device_set_list);
        mRecyclerView.setHasFixedSize(true);

        // Use the linear layout manager for the recycler view
        RecyclerView.LayoutManager layoutManager = new LinearLayoutManager(this);
        mRecyclerView.setLayoutManager(layoutManager);

        // Add device set FAB initialization
        mButtonAddDeviceSet = (FloatingActionButton) findViewById(R.id.button_add_device_set);
        mButtonAddDeviceSet.setOnClickListener(view -> {
            Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
            intent.setType(Constants.PDF_MIME_TYPE);
            if (intent.resolveActivity(getPackageManager()) != null) {
                startActivityForResult(intent, CHOOSE_PDF_FILE_REQUEST);
            }
        });
    }

    @Override
    protected void onStart() {
        super.onStart();

        // Set the adapter only after the DB is initialized.
        Futures.addCallback(getDB().onInitialized(), new FutureCallback<Void>() {

            @Override
            public void onSuccess(Void result) {
                // The adapter for the recycler view
                mAdapter = new DeviceSetListAdapter(DeviceSetChooserActivity.this);

                // When a file is clicked from the list, start the PdfViewerActivity.
                mAdapter.setOnDeviceSetClickListener((adapter, v, position) -> {
                    Intent intent = PdfViewerActivity.createIntent(
                            getApplicationContext(),
                            adapter.getDeviceSetId(position));
                    startActivity(intent);
                });

                mRecyclerView.setAdapter(mAdapter);
            }

            @Override
            public void onFailure(Throwable t) {
                Log.e(TAG, "Could not initialize the database.", t);
            }

        }, Utils.mainThreadExecutor());

        // ItemTouchHelper for handling the swipe action.
        ItemTouchHelper.SimpleCallback touchCallback;
        touchCallback = new ItemTouchHelper.SimpleCallback(0, ItemTouchHelper.LEFT) {
            @Override
            public boolean onMove(RecyclerView recyclerView,
                                  RecyclerView.ViewHolder viewHolder,
                                  RecyclerView.ViewHolder target) {
                return false;
            }

            @Override
            public void onSwiped(RecyclerView.ViewHolder viewHolder, int direction) {
                // Delete the device set on left swipe.
                if (direction == ItemTouchHelper.LEFT) {
                    getDB().deleteDeviceSet(
                            mAdapter.getDeviceSetId(viewHolder.getLayoutPosition()));
                }
            }
        };
        new ItemTouchHelper(touchCallback).attachToRecyclerView(mRecyclerView);
    }

    @Override
    protected void onStop() {
        super.onStop();

        if (mAdapter != null) {
            mAdapter.stop();
        }
        mAdapter = null;

        if (mRecyclerView != null) {
            mRecyclerView.setAdapter(null);
        }
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        // Inflate the menu; this adds items to the action bar if it is present.
        getMenuInflater().inflate(R.menu.menu_device_set_chooser, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        // Handle action bar item clicks here. The action bar will
        // automatically handle clicks on the Home/Up button, so long
        // as you specify a parent activity in AndroidManifest.xml.
        int id = item.getItemId();

        //noinspection SimplifiableIfStatement
        if (id == R.id.action_settings) {
            return true;
        }

        return super.onOptionsItemSelected(item);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        Log.i(TAG, String.format("onActivityResult(%d, %d, data) called", requestCode, resultCode));

        // Any other activity results would be handled here.
        if (requestCode == CHOOSE_PDF_FILE_REQUEST) {
            if (resultCode == RESULT_OK) {
                Uri fullPdfUri = data.getData();
                Log.i(TAG, "Uri of the provided PDF: " + fullPdfUri);

                Intent intent = PdfViewerActivity.createIntent(this, fullPdfUri);
                startActivity(intent);
            }
        } else {
            Log.w(TAG, String.format(
                    "Unhandled activity result. (requestCode: %d, resultCode: %d)",
                    requestCode, resultCode));
        }
    }
}
