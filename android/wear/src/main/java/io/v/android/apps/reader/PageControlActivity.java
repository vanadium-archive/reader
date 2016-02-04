// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.android.apps.reader;

import android.app.Activity;
import android.os.Bundle;
import android.support.wearable.view.WatchViewStub;
import android.util.Log;
import android.widget.Button;

import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.api.GoogleApiClient;
import com.google.android.gms.common.api.PendingResult;
import com.google.android.gms.wearable.Node;
import com.google.android.gms.wearable.NodeApi;
import com.google.android.gms.wearable.Wearable;

import java.nio.charset.StandardCharsets;

public class PageControlActivity extends Activity implements GoogleApiClient.ConnectionCallbacks,
        GoogleApiClient.OnConnectionFailedListener {

    private static final String TAG = PageControlActivity.class.getSimpleName();

    private GoogleApiClient mGoogleApiClient;

    private Button mButtonToggle;
    private Button mButtonPrev;
    private Button mButtonNext;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_page_control);

        final WatchViewStub stub = (WatchViewStub) findViewById(R.id.watch_view_stub);
        stub.setOnLayoutInflatedListener(s -> {
            mButtonToggle = (Button) s.findViewById(R.id.button_toggle_link);
            mButtonToggle.setOnClickListener(
                    v -> sendMessageToAllNodes(PageControlMessage.TOGGLE_LINK));

            mButtonPrev = (Button) s.findViewById(R.id.button_prev);
            mButtonPrev.setOnClickListener(
                    v -> sendMessageToAllNodes(PageControlMessage.PREV_PAGE));

            mButtonNext = (Button) s.findViewById(R.id.button_next);
            mButtonNext.setOnClickListener(
                    v -> sendMessageToAllNodes(PageControlMessage.NEXT_PAGE));
        });

        mGoogleApiClient = new GoogleApiClient.Builder(this)
                .addApi(Wearable.API)
                .addConnectionCallbacks(this)
                .addOnConnectionFailedListener(this)
                .build();
    }

    @Override
    protected void onResume() {
        super.onResume();
        mGoogleApiClient.connect();
    }

    @Override
    protected void onPause() {
        super.onPause();
        mGoogleApiClient.disconnect();
    }

    @Override
    public void onConnected(Bundle connectionHint) {
        Log.i(TAG, "onConnected(): Successfully connected to Google API client");
    }

    @Override
    public void onConnectionSuspended(int cause) {
        Log.i(TAG, "onConnectionSuspended(): Connection to Google API client was suspended");
    }

    @Override
    public void onConnectionFailed(ConnectionResult result) {
        Log.i(TAG, "onConnectionFailed(): Failed to connect, with result: " + result);
    }

    private boolean sendMessageToAllNodes(final String message) {
        PendingResult<NodeApi.GetConnectedNodesResult> pendingResult =
                Wearable.NodeApi.getConnectedNodes(mGoogleApiClient);

        pendingResult.setResultCallback(result -> {
            for (Node node : result.getNodes()) {
                Wearable.MessageApi.sendMessage(
                        mGoogleApiClient,
                        node.getId(),
                        PageControlMessage.PATH,
                        message.getBytes(StandardCharsets.UTF_8));
            }
        });

        return true;
    }
}
