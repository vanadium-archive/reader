// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var click = require('../../events/click');
var css = require('./list-item.css');
var debug = require('debug')('reader:device-sets');
var format = require('format');
var h = require('mercury').h;
var hg = require('mercury');
var insert = require('insert-css');
var map = require('../../util').map;
var properties = require('../properties');

module.exports = render;

function render(state, channels) {
  debug('render list-item: %o', state);
  insert(css);

  return h('.device-set', [
    h('.header', [
      h('.title', state.file.title),
      h('.subhead', format('file-hash: %s', state.file.hash))
    ]),
    h('.support', [
      h('.devices', [
        h('.title', 'Devices'),
        map(state.devices, properties.render)
      ])
    ]),
    h('.actions', [
      h('a.delete', {
        href: '#',
        'ev-click': click(channels.remove, { id: state.id })
      }, 'Delete'),
      h('a.read', {
        href: '/#!/' + state.id,
        // NOTE: The channels argument above are passed in by and belong to a
        // parent component. This enables actions to be triggered from this view
        // which can control interactions with the parent list. In the case of
        // clicking the "Read" button here the load channel
        // (state.channels.load) owned by the device-set/list item component
        // needs to be called.
        'ev-click': hg.send(state.channels.load)
      }, 'Read')
    ])
  ]);
}
