// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var click = require('../../events/click');
var css = require('./pdf-viewer.css');
var debug = require('debug')('reader:device-set');
var format = require('format');
var h = require('mercury').h;
var hg = require('mercury');
var insert = require('insert-css');
var PDFWidget = require('./pdf-widget');

module.exports = render;

function render(state, channels) {
  insert(css);

  return h('.pdf-viewer', [
    hg.partial(progress, state.progress),
    hg.partial(controls, state, channels),
    h('.pdf-widget', new PDFWidget(state))
  ]);
}

function progress(state) {
  debug('progress: %s', state);

  if (state >= 100) {
    return h('.progress.hidden');
  }

  return h('.progress', [
    h('.progress-bar', {
      style: { width: state + '%' }
    })
  ]);
}

function controls(state, channels) {
  if (state.progress < 100) {
    return h('.pdf-controls.hidden');
  }

  return h('.pdf-controls', [
    h('a.back', {
      href: '/#!/'
    }, [
      h('i.material-icons', 'arrow_back')
    ]),
    h('.title', state.file.title),
    h('.pager', [
      h('.meta', format('Page: %s of %s',
        state.pages.current,
        state.pages.total)),
      h('a.previous', {
        href: '#',
        'ev-click': click(channels.previous)
      }, [
        h('i.material-icons', 'chevron_left'),
      ]),
      h('a.next', {
        href: '#',
        'ev-click': click(channels.next)
      }, [
        h('i.material-icons', 'chevron_right'),
      ])
    ]),
    h('a.menu', {
      href: '#',
      'ev-click': click(channels.manage)
    },
    [
      h('i.material-icons', 'more_vert'),
    ])
  ]);
}

