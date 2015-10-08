// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.android.apps.reader;

import android.support.v7.widget.CardView;
import android.support.v7.widget.RecyclerView;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

/**
 * Adapter that binds the list of pdf files to the corresponding card views.
 */
public class PdfListAdapter extends RecyclerView.Adapter<PdfListAdapter.ViewHolder> {

    private OnPdfFileClickListener mListener;

    // TODO(youngseokyoon): Replace this temporary list with real data coming from the syncbase.
    private static final String[] SAMPLE_PDF_LIST = {
            "Foo.pdf",
            "Bar.pdf",
    };

    public class ViewHolder extends RecyclerView.ViewHolder {
        public CardView mCardView;
        public TextView mTextView;

        public ViewHolder(CardView v) {
            super(v);
            mCardView = v;
            mTextView = (TextView) mCardView.findViewById(R.id.pdf_list_item_text);

            mCardView.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    if (mListener != null) {
                        mListener.onPdfFileClick(PdfListAdapter.this, v, getPosition());
                    }
                }
            });
        }
    }

    public PdfListAdapter() {
        mListener = null;
    }

    @Override
    public ViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        // Create a new view here.
        CardView v = (CardView) LayoutInflater.from(parent.getContext())
                .inflate(R.layout.pdf_list_item, parent, false);

        return new ViewHolder(v);
    }

    @Override
    public void onBindViewHolder(ViewHolder holder, int position) {
        holder.mTextView.setText(getItem(position));
    }

    public String getItem(int position) {
        return SAMPLE_PDF_LIST[position];
    }

    @Override
    public int getItemCount() {
        return SAMPLE_PDF_LIST.length;
    }

    public void setOnPdfFileClickListener(OnPdfFileClickListener listener) {
        mListener = listener;
    }

    /**
     * Interface used for handling click events of the pdf files in the list.
     */
    public interface OnPdfFileClickListener {
        void onPdfFileClick(PdfListAdapter adapter, View v, int position);
    }

}
