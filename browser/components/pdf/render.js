// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var hg = require('mercury');
var h = require('mercury').h;
var PDFWidget = require('../../widgets/pdf-widget');
var format = require('format');

module.exports = render;

function render(state, channels) {
  return h('.pdf', [
    hg.partial(controls, state, channels),
    new PDFWidget(state)
  ]);
}

function controls(state, channels) {
  var current = state.pages.current;
  var total = state.pages.total;
  var message = format('Page %s of %s', current, total);

  return h('.controls', [
    h('button.prev', {
      disabled: (current === 1),
      'ev-click': hg.send(channels.previous)
    }, 'Prev'),
    h('span.pagecount', message),
    h('button.next', {
      disabled: (current === total),
      'ev-click': hg.send(channels.next)
    }, 'Next')
  ]);
}
