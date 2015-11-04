// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package io.v.android.apps.reader.model;

import android.util.Log;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.UUID;

import io.v.v23.vom.VomUtil;

/**
 * Helper class for generating id strings to be used in Syncbase tables.
 *
 * The purpose of this class is to make it easier to change the id generation logic,
 * for example to make the ids consistent with the Web version Reader app.
 */
public class IdFactory {

    private static final String TAG = IdFactory.class.getSimpleName();

    /**
     * Gets a randomly generated id string.
     */
    public static String getRandomId() {
        return UUID.randomUUID().toString();
    }

    /**
     * Gets a file id string. Uses MD5 hash to generate the key of the file.
     * When the MD5 hashing fails, use a random id as a fallback.
     *
     * @param fileContents actual file contents as a byte array
     * @return
     */
    public static String getFileId(byte[] fileContents) {
        String result = getMD5HashString(fileContents);
        if (result == null) {
            result = getRandomId();
        }

        return result;
    }

    private static String getMD5HashString(byte[] bytes) {
        if (bytes == null) {
            return null;
        }

        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            md.update(bytes);
            return VomUtil.bytesToHexString(md.digest());
        } catch (NoSuchAlgorithmException e) {
            handleException(e);
        }

        return null;
    }

    private static void handleException(Exception e) {
        Log.e(TAG, e.getMessage(), e);
    }

}
