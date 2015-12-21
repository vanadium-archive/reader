// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var configure = require('./configure');

module.exports = setup;

function setup(fn) {
  // debug('initializing');

  return test;

  function test(t) {
    // debug('running');

    configure(function(err, config) {
      if (err) {
        t.error(err);
        t.end();
        return;
      }

      // debug('config %o', config);
    });
  }
}
