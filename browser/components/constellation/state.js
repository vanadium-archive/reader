// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var debug = require('debug')('reader:constellation:state');
var hg = require('mercury');

// Create state for the constellation component
module.exports = function create(options) {
  debug('initialize state');

  var state = hg.state({
    peers: hg.varhash({}, peer),
    error: hg.value(null),
  });

  return state;
};

function peer(object, key) {
  return hg.struct({
    id: key,
    status: object.status || 'unkown',
  });
}
