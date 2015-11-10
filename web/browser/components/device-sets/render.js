// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var css = require('./device-sets.css');
var debug = require('debug')('reader:device-sets');
var file = require('../../events/file');
var h = require('mercury').h;
var hg = require('mercury');
var hg = require('mercury');
var insert = require('insert-css');
var map = require('../../util').map;
var renderListItem = require('../device-set/render-list-item');
var show = require('../device-set/render');

module.exports = render;

function render(state, channels) {
  insert(css);

  if (state.current) {
    debug('=== SHOW %s ===', state.current);
    var current = state.collection[state.current];
    return show(current, current.channels);
  } else {
    debug('=== LIST ===');
    return list(state, channels);
  }
}

function list(state, channels) {
  var children = map(state.collection, renderListItem, channels);
  if (children.length === 0) {
    children = [ hg.partial(blank) ];
  }

  var footer = h('footer', [
    h('.spacer'),
    h('label.fab', [
      h('i.material-icons', 'add'),
      h('input.hidden', {
        type: 'file',
        'ev-event': file(channels.add)
      })
    ])
  ]);

  children.push(footer);

  return h('.device-sets', children);
}

function blank() {
  return h('.blank-slate', 'Add a new PDF file below to get started.');
}


