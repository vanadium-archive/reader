// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var sha256d = require('sha256d');

module.exports = hash;

function hash(data) {
  var h = sha256d();
  var string = JSON.stringify(data);

  h.update(string);

  return h.digest('hex');
}
