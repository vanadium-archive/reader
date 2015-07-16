// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var hg = require('mercury');
var h = require('mercury').h;
var format = require('format');
var uuid = require('uuid');

module.exports = render;

function render(state, channels) {
  return h('ul.vanadium', [
    h('li', format('id: %s', state.id)),
    h('li', format('status: %s', state.status)),
    h('li', format('error: %s', state.error ? state.error.message : 'none')),
    h('ul.peers', Object.keys(state.peers).map(function(key) {
      return h('li.peer', {
        'data-id': key
      }, format('peer: %s', key));
    })),
    h('li', [
      h('a.add-peer', {
        'ev-click': hg.send(channels.add, { id: uuid.v4() })
      }, 'Add peer')
    ])
  ]);
}
