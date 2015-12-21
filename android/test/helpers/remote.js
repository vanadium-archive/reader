// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var wd = require('wd');
var debug = require('debug')('driver');

module.exports = remote;

// Wraps the Web Driver module's `remote(...)` method for logging purposes.
function remote() {
  debug('creating driver');

  var driver = wd.remote({
    host: 'localhost',
    port: 4723
  });

  driver.on('status', function(status) {
    debug('status: %s', status.trim());
  });
  driver.on('command', debug.bind(debug, 'command: %s "%s" => %o'));
  driver.on('http', debug.bind(debug, 'http: %s "%s" => %o'));

  return driver;
}
