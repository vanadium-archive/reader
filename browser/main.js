// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var window = require('global/window');
var document = require('global/document');
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
    hash: hg.value(null),
    pdf: pdf.state({}),
    files: files.state({
      store: store
    }),
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
  var client = vanadium(state.constellation);

  // Anytime a PDF file is saved locally share it with any connected peers.
  store.on('put', function onput(hash, file) {
    client.sendPDF(hash, file, function(err) {
      if (err) {
        state.error.set(err);
      }
    });
  });

  // Anytime a PDF file is saved via Vanadium RPC update the pdf-store and
  // state.
  client.on('service:pdf', function onremotepdf(meta, blob) {
    // Optimistically update the state.
    state.files.collection.put(meta.hash, {
      hash: meta.hash,
      title: meta.name,
      blob: blob,
    });

    // Use options.silent to prevent any put listeners from being fired and
    // sending the file back to it's source peer.
    store.put(blob, { silent: true }, function onput(err) {
      if (err) {
        state.error.set(err);
        state.files.collection.delete(meta.hash);
      }
    });
  });

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
  var partial;

  if (state.hash) {
    partial = hg.partial(pdf.render, state.pdf, state.pdf.channels);
  } else {
    partial = hg.partial(files.render, state.files, state.files.channels);
  }

  return h('main', [ partial ]);
}

function notfound(href) {
  console.error('TODO: not found error - %s', href);
}
