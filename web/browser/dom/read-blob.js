// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var once = require('once');
var window = require('global/window');

module.exports = read;

// A simplified API for window.FileReader.
//
//     read(blob, function onread(err, result) {
//       if (err) {
//         console.error(err);
//         return;
//       }
//
//       console.log('result', result)
//     })
//
// The callback will be triggered with err being an error object and result
// being an array buffer.
//
// SEE: https://developer.mozilla.org/en-US/docs/Web/API/FileReader
function read(blob, callback) {
  var reader = new window.FileReader();

  // Add listeners to all events, using the once module ensures the callback
  // will only be called for the first handler to encounter a state error, or
  // success update.
  callback = once(callback);
  reader.onabort = onabort.bind(reader, callback);
  reader.onerror = onerror.bind(reader, callback);
  reader.onload = onload.bind(reader, callback);
  reader.onloadstart = noop;
  reader.onloadend = onloadend.bind(reader, callback);
  reader.onprogress = noop;

  reader.readAsArrayBuffer(blob);
}

function onabort(callback) {
  var err = new Error('Read aborted.');
  callback(err);
}

// Error only handler.
function onerror(callback) {
  callback(this.error);
}

// The success only hanlder.
function onload(callback) {
  callback(null, this.result);
}

// The success and error handler.
function onloadend(callback) {
  callback(this.error, this.result);
}

function noop() {}
