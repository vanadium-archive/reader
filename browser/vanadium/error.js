// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

module.exports = error;

function error(err, message, callback) {
  var werr = new Error(message);
  werr.cause = err;

  if (callback) {
    callback(werr);
    return;
  }

  return werr;
}
