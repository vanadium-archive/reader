// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var format = require('format');
var hg = require('mercury');
var h = require('mercury').h;

module.exports = render;

function render(state, channels) {
  // page message
  var pageNumMessage = format('Page %s of %s', state.pageNum, state.numPages);

  return h('.pagecontrols', [
    h('button.prev', {
      disabled: (state.pageNum <= 1),
      'ev-click': hg.send(channels.prev)
    }, 'Prev'),
    h('span.pagecount', pageNumMessage),
    h('button.next', {
      disabled: (state.pageNum >= state.numPages),
      'ev-click': hg.send(channels.next)
    }, 'Next')
  ]);
}
