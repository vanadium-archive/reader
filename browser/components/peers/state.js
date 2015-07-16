// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var debug = require('debug')('reader:vanadium:state');
var hg = require('mercury');
var uuid = require('uuid');

module.exports = create;

// Create state for the Vanadium component
function create(options) {
  debug('initialize state');

  var state = hg.state({
    error: hg.value(null),
    id: hg.value(uuid.v4()),
    status: hg.value('new'),
    peers: hg.varhash({}),
    channels: {
      add: add
    }
  });

  return state;
}

function add(state, data) {
  state.peers.put(data.id, data);
}
