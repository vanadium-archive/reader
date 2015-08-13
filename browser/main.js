// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var window = require('global/window');
window.debug = require('debug');
var debug = require('debug')('reader:main');
var domready = require('domready');
var hg = require('mercury');
var h = require('mercury').h;
var router = require('./router');
var routes = require('./routes');
var insert = require('insert-css');
var css = require('./components/base/index.css');
var header = require('./components/header');
var footer = require('./components/footer');
var files = require('./components/files');
var pdf = require('./components/pdf');
var constellation = require('./components/constellation');
var vanadium = require('./vanadium');
var store = require('./pdf-store');

domready(function ondomready() {
  debug('domready');

  // Top level state.
  var state = hg.state({
    uuid: hg.value(null),
    pdf: pdf.state({}),
    files: files.state({
      store: store
    }),
    // pageControls: pageControls.state(),
    constellation: constellation.state(),
    error: hg.value(null)
  });

  state.error(function(err) {
    if (!err) {
      return;
    }

    console.error('TODO: add an error component');
    console.error(err.stack);
  });

  router(state, routes).on('notfound', notfound);

  // TODO(jasoncampbell): add an error component for aggregating, logging, and
  // displaying errors in the UI.
  state.constellation.error(function(err) {
    state.error.set(err);
  });

  // The vanadium client is coupled to the application state here so that async
  // code paths in the ./vanadium modules can be isolated to the application
  // initialization. This allows components to be separately tested/interacted
  // with as mappings between data and UI without being tangled into the
  // local vanadium discovery process.
  vanadium(state.constellation);

  hg.app(document.body, state, render);
});

function render(state) {
  insert(css);

  return h('.reader-app', [
    hg.partial(header.render, state),
    hg.partial(content, state),
    hg.partial(footer.render, state, state.files.channels.add)
  ]);
}

function content(state) {
  debug('render content: %o', state);

  var partial;

  if (state.uuid) {
    partial = hg.partial(pdf.render, state.pdf, state.pdf.channels);
  } else {
    partial = hg.partial(files.render, state.files, state.files.channels);
  }

  return h('main', [ partial ]);
}

function notfound(href) {
  console.error('TODO: not found error - %s', href);
}
