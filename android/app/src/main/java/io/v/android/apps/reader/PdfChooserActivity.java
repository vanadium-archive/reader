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

/**
 * Activity that displays all the available pdf files in a list.
 *
 * When the user clicks on one of the pdf files, it starts the PdfViewerActivity with the
 * corresponding file.
 */
public class PdfChooserActivity extends Activity {

    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_pdf_chooser);

        RecyclerView recyclerView = (RecyclerView) findViewById(R.id.pdf_list);
        recyclerView.setHasFixedSize(true);

        // Use the linear layout manager for the recycler view
        RecyclerView.LayoutManager layoutManager= new LinearLayoutManager(this);
        recyclerView.setLayoutManager(layoutManager);

        // The adapter for the recycler view
        PdfListAdapter adapter = new PdfListAdapter();

        // When a file is clicked from the list, start the PdfViewerActivity.
        adapter.setOnPdfFileClickListener(new PdfListAdapter.OnPdfFileClickListener() {
            @Override
            public void onPdfFileClick(PdfListAdapter adapter, View v, int position) {
                Intent intent = PdfViewerActivity.createIntent(
                        getApplicationContext(),
                        adapter.getItem(position));
                startActivity(intent);
            }
        });

        recyclerView.setAdapter(adapter);
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        // Inflate the menu; this adds items to the action bar if it is present.
        getMenuInflater().inflate(R.menu.menu_pdf_chooser, menu);
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
}
