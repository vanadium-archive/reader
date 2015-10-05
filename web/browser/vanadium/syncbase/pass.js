// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

module.exports = pass;

// Creates a worker that simply passes arguments to the next worker in a
// waterfall series. This helps avoid anti-patterns like creating multiple
// functions within the calling  closure/scope or excessive use of
// `fn.bind(...)`.
//
// The worker's callback is fired with the error argument set to null.
//
// This helper function is meant to be used with the run-waterfall module as the
// first task.
//
// SEE: https://goo.gl/pOSb30
function pass() {
  var args = Array.prototype.slice.call(arguments);
  args.unshift(null);
  return worker;

  function worker(callback) {
    callback.apply(null, args);
  }
}
