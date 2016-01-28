// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.android.apps.reader;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricGradleTestRunner;
import org.robolectric.annotation.Config;

import java.util.HashMap;

import io.v.android.apps.reader.model.IdFactory;
import io.v.android.apps.reader.vdl.DeviceMeta;
import io.v.android.apps.reader.vdl.DeviceSet;

import static org.junit.Assert.assertEquals;

@RunWith(RobolectricGradleTestRunner.class)
@Config(constants = BuildConfig.class, sdk=21)
public class PdfViewerActivityTest {

    @Test
    public void testDetermineInitialPage() {
        int actual;

        actual = PdfViewerActivity.determineInitialPage(createDeviceSetWithPages());
        assertEquals(1, actual);

        actual = PdfViewerActivity.determineInitialPage(createDeviceSetWithPages(1));
        assertEquals(2, actual);

        actual = PdfViewerActivity.determineInitialPage(createDeviceSetWithPages(1, 2));
        assertEquals(3, actual);

        actual = PdfViewerActivity.determineInitialPage(createDeviceSetWithPages(2, 1));
        assertEquals(3, actual);

        actual = PdfViewerActivity.determineInitialPage(createDeviceSetWithPages(3, 4));
        assertEquals(5, actual);

        actual = PdfViewerActivity.determineInitialPage(createDeviceSetWithPages(5, 2, 3));
        assertEquals(4, actual);

    }

    private DeviceSet createDeviceSetWithPages(int... pages) {
        DeviceSet ds = new DeviceSet(null, null, new HashMap<>());

        for (int page : pages) {
            DeviceMeta dm = new DeviceMeta(IdFactory.getRandomId(), page, 0, true);
            ds.getDevices().put(dm.getDeviceId(), dm);
        }

        return ds;
    }

}
