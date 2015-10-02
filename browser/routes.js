// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var debug = require('debug')('reader:routes');

module.exports = {
  '/#!/': index,
  '/#!/:id': show,
  // For testing purposes
  '/#!/moving': overlay
};

function index(state, params, route) {
  debug('index');
}

function show(state, params, route) {
  debug('show: %o', params);
}

// TODO(jwnichols): Remove once the device management UI is integrated
// into the UI.  Provides an entry point for testing.
function overlay(state, params, route) {
  state.mover.moving.set(true);
}
