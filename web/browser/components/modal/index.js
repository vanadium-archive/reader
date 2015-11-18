// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var assert = require('assert');
var click = require('../../events/click');
var css = require('./modal.css');
var extend = require('xtend');
var h = require('mercury').h;
var hg = require('mercury');
var insert = require('insert-css');

module.exports = {
  state: state,
  render: render
};

var defaults = {
  active: false
};

function state(options) {
  options = extend(defaults, options);

  return hg.state({
    active: hg.value(!!options.active),
    channels: {
      show: show,
      hide: hide
    }
  });
}

function show(state, data) {
  state.active.set(true);
}

function hide(state, data) {
  state.active.set(false);
}

function render(state, vnode) {
  assert.equal(vnode.constructor.name,
    'VirtualNode',
    'The second argument must be a VirtualNode.');
  insert(css);

  return h('.modal', {
    className: state.active ? 'active' : 'hidden'
  }, [
    h('.modal-blocker', {
      'ev-click': click(state.channels.hide)
    }),
    h('.modal-dialog', vnode)
  ]);
}