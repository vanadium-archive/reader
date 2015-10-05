// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var error = require('../error');
var format = require('util').format;

module.exports = parse;

function parse(string, callback) {
  var value;

  try {
     value = JSON.parse(string);
  } catch (e) {
    var message = format('Failed to decode "%s"', string);
    error(e, message, callback);
    return;
  }

  callback(null, value);
}
