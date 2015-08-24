// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var hg = require('mercury');
var h = require('mercury').h;
var PDFWidget = require('../../widgets/pdf-widget');
var format = require('format');
var insert = require('insert-css');
var anchor = require('../../router/anchor');
var css = require('./index.css');

module.exports = render;

function render(state, channels) {
  insert(css);

  return h('.pdfviewer', [
    hg.partial(controls, state, channels),
    h('.pdf', new PDFWidget(state))
  ]);
}

function controls(state, channels) {
  var current = state.pages.current;
  var total = state.pages.total;
  var linked = state.pages.linked;
  var message = format('Page %s of %s', current, total);

  return h('.controls', [
    h('.left-controls', [
      anchor({
        href: '/'
      }, [
        h('span.controls-open', 'Open')
      ])
    ]),
    h('.center-controls', [
      h('button.prev', {
        disabled: (current === 1),
        'ev-click': hg.send(channels.previous)
      }, 'Prev'),
      h('span.pagecount', message),
      h('button.next', {
        disabled: (current === total),
        'ev-click': hg.send(channels.next)
      }, 'Next'),
      h('button.link', {
        'ev-click': hg.send(channels.link)
      }, linked ? 'Unlink' : 'Link')
    ]),
    h('.right-controls', []),
    h('.clear-controls', [])
  ]);
}
