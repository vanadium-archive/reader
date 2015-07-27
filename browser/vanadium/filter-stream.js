// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var through = require('through2');

module.exports = filter;

// Creates a filter stream for name or prexisting names in peers
function filter(peers) {
  return through(function write(data, enc, callback) {
    var name = data.toString();

    if (!! peers[name]) {
      return callback();
    } else {
      return callback(null, data);
    }
  });
}
