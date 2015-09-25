// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var VError = require('verror');

module.exports = {
  encode: encode,
  decode: decode
};

function encode(data, callback) {
  var string = '';

  try {
    string = JSON.stringify(data);
  } catch (e) {
    var err = new VError(e, 'Failed to encode %o', data);
    return callback(err);
  }

  callback(null, string);
}

function decode(string, callback) {
  var value;

  try {
     value = JSON.parse(string);
  } catch (e) {
    var err = new VError(e, 'Failed to decode "%s"', string);
    return callback(err);
  }

  callback(null, value);
}
