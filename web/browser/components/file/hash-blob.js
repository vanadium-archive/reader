// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var assert = require('assert');
var BlobReader = require('readable-blob-stream');
var crypto = require('crypto');
var once = require('once');
var pump = require('pump');
var through = require('through2');
var window = require('global/window');

module.exports = hash;

function hash(blob, callback) {
  callback = once(callback);
  assert.ok(blob instanceof window.Blob, 'Must use a Blob object.');

  var md5 = crypto.createHash('md5');
  var writer = through(update);
  var reader = new BlobReader(blob);

  pump(reader, writer, finish);

  function update(buffer, enc, callback) {
    md5.update(buffer, enc);
    callback();
  }

  function finish(err) {
    if (err) {
      return callback(err);
    }

    callback(null, md5.digest('hex'));
  }
}
