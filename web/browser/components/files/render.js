// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var anchor = require('../router/anchor');
var click = require('../../events/click');
var css = require('./index.css');
var format = require('format');
var h = require('mercury').h;
var hg = require('mercury');
var insert = require('insert-css');
var toArray = require('../../util').toArray;

module.exports = render;

function render(state, channels) {
  insert(css);

  var children = toArray(state.collection).map(file, channels);

  if (children.length === 0) {
    children = [ hg.partial(blank) ];
  }

  return h('.files', children);
}

// Called as an array iterator with the this argument set to the component's
// state.channels attribute.
// SEE: https://goo.gl/tu7srT
function file(state, index, collection) {
  var channels = this;
  var ref = (state.ref || 'pending save');

  return h('.file', [
    h('h2.type-title', [
      anchor({
        href: format('/%s', state.id)
      }, state.title)
    ]),
    h('p.type-caption', [
      h('span', format('%s - %s - %s -', state.type, state.id, ref)),
      h('a.delete', {
        href: '#',
        'ev-click': click(channels.remove, { id: state.id })
      }, 'DELETE')
    ])
  ]);
}

function blank() {
  return h('.blank-slate', 'Add a new PDF file below to get started.');
}
