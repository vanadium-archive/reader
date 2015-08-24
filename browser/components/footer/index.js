// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var h = require('mercury').h;
var file = require('../../events/file');
var insert = require('insert-css');
var css = require('./index.css');

module.exports = {
  render: render
};

function render(state, add) {
  insert(css);

  if (state.hash) {
    return h('div.hidden');
  }

  return h('footer', [
    h('label.add-file', [
      h('input.hidden', {
        type: 'file',
        'ev-event': file(add)
      })
    ])
  ]);
}
