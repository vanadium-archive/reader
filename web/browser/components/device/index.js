// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var debug = require('debug')('reader:device');
var event = require('synthetic-dom-events');
var extend = require('xtend');
var hg = require('mercury');
var raf = require('raf');
var uuid = require('uuid').v4;
var window = require('global/window');

module.exports = {
  state: state
};

function state(options, key) {
  options = extend({
    id: key || uuid(),
    linked: true,
    screen: {},
    index: 0
  }, options);

  debug('init: %o', options);

  var atom = hg.state({
    id: hg.value(options.id),
    linked: hg.value(options.linked),
    index: hg.value(options.index),
    current: hg.value(options.current || false),
    type: hg.value(options.type),
    alias: hg.value(options.alias),
    arch: hg.value(options.arch),
    screen: hg.struct({
      width: hg.value(options.screen.width),
      height: hg.value(options.screen.height)
    })
  });

  if (atom.current()) {
    // Fire the resize event just in case the size has changed since a previous
    // value was stashed.
    window.addEventListener('resize', resize(atom));
    window.dispatchEvent(event('resize'));
  }

  return atom;
}

// HACK(jasoncampbell): I couldn't get this event plumbed into to
// state.channels.resize handler. This is a quick way to get an
// optimized resize listener around window resize events.
// SEE: https://developer.mozilla.org/en-US/docs/Web/Events/resize
//
// TODO(jasoncampbell): Make it so only the last resize event trigers the state
// update.
function resize(state) {
  var running = false;

  return function listener(event) {
    if (! running) {
      running = true;
      raf(update);
    }
  };

  function update() {
    var width = window.innerWidth;
    var height = window.innerHeight;

    if (state.screen.width() !== width) {
      state.screen.width.set(width);
    }

    if (state.screen.height() !== height) {
      state.screen.height.set(height);
    }

    running = false;
  }
}
