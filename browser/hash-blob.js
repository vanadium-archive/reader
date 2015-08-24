// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var assert = require('assert');
var BlobReader = require('readable-blob-stream');
var once = require('once');
var sha256d = require('sha256d');
var through = require('through2');
var window = require('global/window');

module.exports = hash;

function hash(blob, callback) {
  callback = once(callback);
  assert.ok(blob instanceof window.Blob, 'Must use a Blob object.');

  var h = sha256d();
  var stream = through(write, flush);
  var rs = new BlobReader(blob);

  rs
  .on('error', callback)
  .pipe(stream)
  .on('error', callback);

  function write(buffer, enc, cb) {
    h.update(buffer);
    cb();
  }

  function flush(cb) {
    callback(null, h.digest('hex'));
    cb();
  }
}
