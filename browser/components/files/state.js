// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var hg = require('mercury');
var debug = require('debug')('reader:files');
var file = require('./file');
var uuid = require('uuid');
var assert = require('assert');

module.exports = function create(options) {
  assert.ok(options, 'files.state(options) - options required');
  assert.ok(options.store, 'files.state(options) - options.store required');

  var store = options.store;
  var state = hg.state({
    error: hg.value(null),
    collection: hg.varhash({}, file.state),
    channels: {
      // Scope options.store to this state instance's channel.add.
      add: add.bind(null, store),
      open: open
    }
  });

  return state;
};

function add(store, state, data) {
  assert.ok(data.file, 'A File object must be passed into channel');

  var key = uuid.v4();
  state.collection.put(key, data.file);

  debug('file %o', data.file);

  store.put(key, data.file, function onput(err) {
    if (err) {
      state.error.set(err);
      state.collection.delete(key);
      return;
    }

    debug('put success!');
  });
}
