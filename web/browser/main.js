// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var css = require('./components/base/index.css');
var debug = require('debug')('reader:main');
var document = require('global/document');
var domready = require('domready');
var files = require('./components/files');
var footer = require('./components/footer');
var format = require('format');
var h = require('mercury').h;
var header = require('./components/header');
var hg = require('mercury');
var insert = require('insert-css');
var mover = require('./components/mover');
var router = require('./components/router');
var window = require('global/window');

// Expose globals for debugging.
window.debug = require('debug');
window.require = require;
global.require = require;

domready(function ondomready() {
  debug('domready');

  // Top level state.
  var state = hg.state({
    store: hg.value(null),
    files: files.state(),
    mover: mover.state({}),
    router: router.state({
      '#!/': index,
      '#!/mover': showMover,
      '#!/:id': show,
      '*': notfound
    })
  });

  hg.app(document.body, state, render);
});

function render(state) {
  debug('render: %o', state);
  insert(css);

  return h('.reader-app', [
    hg.partial(header.render, state),
    hg.partial(router.render, state.router, state),
    hg.partial(footer.render, state, state.files.channels.add)
  ]);
}

function index(state, params, route) {
  return h('main', [
    hg.partial(files.render, state.files, state.files.channels)
  ]);
}

function show(state, params, route) {
  debug('show: %s', params.id);

  return h('main', [

  ]);
}

function showMover(state, params, route) {
  debug('show mover');
  return h('main', [
    hg.partial(mover.render, state.mover, state.mover.channels),
  ]);
}

function notfound(state) {
  var href = state.router.href;
  console.error('TODO: not found error - %s', href);

  return h('.notfound', [
    h('Not Found.'),
    h('p', format('The page "%s" does not exisit.', state.router.href))
  ]);
}
