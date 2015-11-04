// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.android.apps.reader;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.support.v7.widget.LinearLayoutManager;
import android.support.v7.widget.RecyclerView;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;

import io.v.android.apps.reader.db.DB;

/**
 * Activity that displays all the active device sets of this user.
 *
 * When the user clicks on one of the device sets, it starts the PdfViewerActivity with the file
 * associated with the device set.
 */
public class DeviceSetChooserActivity extends Activity {

    private RecyclerView mRecyclerView;
    private DeviceSetListAdapter mAdapter;
    private DB mDB;

    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Initialize the DB
        mDB = DB.Singleton.get(this);
        mDB.init(this);

        setContentView(R.layout.activity_device_set_chooser);

        mRecyclerView = (RecyclerView) findViewById(R.id.device_set_list);
        mRecyclerView.setHasFixedSize(true);

        // Use the linear layout manager for the recycler view
        RecyclerView.LayoutManager layoutManager= new LinearLayoutManager(this);
        mRecyclerView.setLayoutManager(layoutManager);
    }

    @Override
    protected void onStart() {
        super.onStart();

        // The adapter for the recycler view
        mAdapter = new DeviceSetListAdapter(this);

        // When a file is clicked from the list, start the PdfViewerActivity.
        mAdapter.setOnDeviceSetClickListener(new DeviceSetListAdapter.OnDeviceSetClickListener() {
            @Override
            public void onDeviceSetClick(DeviceSetListAdapter adapter, View v, int position) {
                Intent intent = PdfViewerActivity.createIntent(
                        getApplicationContext(),
                        adapter.getItemTitle(position));
                startActivity(intent);
            }
        });

        mRecyclerView.setAdapter(mAdapter);
    }

    @Override
    protected void onStop() {
        super.onStop();

        if (mAdapter != null) {
            mAdapter.stop();
        }
        mAdapter = null;
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
        if (mDB.onActivityResult(requestCode, resultCode, data)) {
            return;
        }
        // Any other activity results would be handled here.
    }
}