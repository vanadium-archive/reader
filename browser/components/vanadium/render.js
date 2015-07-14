// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var h = require('mercury').h;
var format = require('format');

module.exports = render;

function render(state, channels) {
  return h('ul.vanadium', [
    h('li', format('id: %s', state.id)),
    h('li', format('status: %s', state.status)),
    h('li', format('error: %s', state.error ? state.error.message : 'none')),
    h('ul.peers', Object.keys(state.peers).map(function(key) {
      return h('li', format('peer: %s', key));
    }))
  ]);
}
