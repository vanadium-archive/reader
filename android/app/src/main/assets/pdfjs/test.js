// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

"use strict";

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

window.onload = function() {
    var xhr = new XMLHttpRequest();
    xhr.responseType = "arraybuffer";

    var filePath = getParameterByName("file");
    console.log("file path: " + filePath);
    xhr.open("GET", filePath);

    xhr.onload = function() {
        // response should be an ArrayBuffer object.
        var response = xhr.response;
        console.log("arraybuffer received of length: " + response.byteLength);
    };

    xhr.send();
};
