// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.android.apps.reader;

import android.content.Context;
import android.support.v7.widget.CardView;
import android.support.v7.widget.RecyclerView;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import com.google.common.base.Joiner;

import java.util.ArrayList;
import java.util.List;

import io.v.android.apps.reader.db.DB;
import io.v.android.apps.reader.db.DB.DBList;
import io.v.android.apps.reader.model.Listener;
import io.v.android.apps.reader.vdl.Device;
import io.v.android.apps.reader.vdl.DeviceSet;
import io.v.android.apps.reader.vdl.File;

/**
 * Adapter that binds the list of device sets to the corresponding card views.
 */
public class DeviceSetListAdapter extends RecyclerView.Adapter<DeviceSetListAdapter.ViewHolder>
        implements Listener {

    private OnDeviceSetClickListener mClickListener;
    private DB mDB;
    private DBList<File> mFiles;
    private DBList<Device> mDevices;
    private DBList<DeviceSet> mDeviceSets;

    public class ViewHolder extends RecyclerView.ViewHolder {
        public CardView mCardView;
        public TextView mTextViewTitle;
        public TextView mTextViewId;
        public TextView mTextViewDevices;

        public ViewHolder(CardView v) {
            super(v);
            mCardView = v;
            mTextViewTitle = (TextView) mCardView.findViewById(R.id.device_set_list_item_title);
            mTextViewId = (TextView) mCardView.findViewById(R.id.device_set_list_item_id);
            mTextViewDevices = (TextView) mCardView.findViewById(R.id.device_set_list_item_devices);

            mCardView.setOnClickListener(view -> {
                if (mClickListener != null) {
                    mClickListener.onDeviceSetClick(
                            DeviceSetListAdapter.this, view, getLayoutPosition());
                }
            });
        }
    }

    public DeviceSetListAdapter(Context context) {
        mClickListener = null;

        mDB = DB.Singleton.get(context);
        mFiles = mDB.getFileList();
        mDevices = mDB.getDeviceList();
        mDeviceSets = mDB.getDeviceSetList();
        mDeviceSets.setListener(this);
    }

    @Override
    public ViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        // Create a new view here.
        CardView v = (CardView) LayoutInflater.from(parent.getContext())
                .inflate(R.layout.device_set_list_item, parent, false);

        return new ViewHolder(v);
    }

    @Override
    public void onBindViewHolder(ViewHolder holder, int position) {
        DeviceSet ds = mDeviceSets.getItem(position);

        holder.mTextViewTitle.setText("Title: " + getItemTitle(ds));
        holder.mTextViewId.setText("Id: " + ds.getId());

        // Devices info
        List<String> deviceNames = new ArrayList<>();
        for (String deviceId : ds.getDevices().keySet()) {
            Device device = mDevices.getItemById(deviceId);
            deviceNames.add(device != null ? device.getName() : "Unknown Device");
        }
        holder.mTextViewDevices.setText("Devices: " + Joiner.on(", ").join(deviceNames));
    }

    public String getDeviceSetId(int position) {
        return mDeviceSets.getItem(position).getId();
    }

    public String getItemTitle(int position) {
        return getItemTitle(mDeviceSets.getItem(position));
    }

    public String getItemTitle(DeviceSet ds) {
        File file = mFiles.getItemById(ds.getFileId());

        if (file != null) {
            return file.getTitle();
        } else {
            return "*** Error retrieving the title";
        }
    }

    @Override
    public int getItemCount() {
        return mDeviceSets.getItemCount();
    }

    public void setOnDeviceSetClickListener(OnDeviceSetClickListener clickListener) {
        mClickListener = clickListener;
    }

    public void stop() {
        mFiles.discard();
        mFiles = null;
        mDeviceSets.discard();
        mDeviceSets = null;
    }

    /**
     * Interface used for handling click events of the pdf files in the list.
     */
    public interface OnDeviceSetClickListener {
        void onDeviceSetClick(DeviceSetListAdapter adapter, View v, int position);
    }

}
