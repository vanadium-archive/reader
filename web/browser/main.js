// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var css = require('./components/base/index.css');
var debug = require('debug')('reader:main');
var deviceSet = require('./components/device-set');
var deviceSets = require('./components/device-sets');
var document = require('global/document');
var domready = require('domready');
var format = require('format');
var h = require('mercury').h;
var header = require('./components/header');
var hg = require('mercury');
var insert = require('insert-css');
var router = require('./components/router');
var stash = require('./dom/local-stash');
var window = require('global/window');


// Expose globals for debugging.
window.debug = require('debug');
window.require = require;
global.require = require;

var routes = {
  INDEX: '#!/',
  SHOW: '#!/:id',
  NOT_FOUND: '*',
};

// Returns the application's global state atom based on previously stored state.
function state(dehydrated) {
  dehydrated = dehydrated || {};
  debug('reyhdrating from %o', dehydrated);
  return hg.state({
    // Router options are never rehydrated from stored state, the router will
    // only pay attention to default values and what is in the window.location
    // APIs. This prevents user confusion when the stored route doesn't match
    // location.href.
    router: router.state({ routes: routes }),
    deviceSets: deviceSets.state(dehydrated.deviceSets),
  });
}

domready(function ondomready() {
  debug('domready');

  var stored = stash('state');
  var atom = state(stored);

  // HACK(jasoncampbell): When the initial route is for a device-set it's PDF
  // file should be shown. Loading a PDF file into the PDF.js renderer is a
  // mutlistep process and to make matters more complicated, due to thier size
  // PDF blobs are stored via a different mechanism than the simple state stash
  // (SEE: ./dom/blob-store.js).
  //
  // Check if the current route is routes.SHOW.
  if (atom.router.route() === routes.SHOW) {
    // Retrieve the current device-set.
    var params = atom.router.params();
    var ds = atom.deviceSets.collection.get(params.id);
    // Listen for changes to the underlying Blob. At some point after
    // initialization it might be retreived from either a local store or
    // Syncbase and set, the watch function below will change anytime the value
    // is updated.
    var remove = ds.file.blob(function blobchange(blob) {
      // If the Blob object is set then load it so that it can be rendered.
      if (blob instanceof window.Blob) {
        deviceSet.channels.load(ds);
        // The initial work is done, this listener can be removed.
        remove();
      }
    });
  }

  // TODO(jasoncampbell): Can there be a dynamic error listener which maps
  // errors to the top error component?

  hg.app(document.body, atom, render);
});

function render(state) {
  // Save the state for later, this is a quick way to limit localStorage writes
  // to the same RAF as the main render function.
  stash('state', state);
  debug('render: %o', state);
  insert(css);

  var children = [];

  switch (state.router.route) {
    case routes.INDEX:
      children = [
        hg.partial(header.render, state),
        hg.partial(deviceSets.render,
          state.deviceSets,
          state.deviceSets.channels)
      ];
      break;
    case routes.SHOW:
      var key = state.router.params.id;
      var value = state.deviceSets.collection[key];
      children = [
        hg.partial(deviceSet.render, value, value.channels)
      ];
      break;
    case routes.NOT_FOUND:
      children = [
        hg.partial(notfound, state)
      ];
      break;
  }

  return h('.reader-app', children);
}

function notfound(state) {
  var href = state.router.href;
  console.error('TODO: not found error - %s', href);

  return h('.notfound', [
    h('h1', 'Not Found.'),
    h('p', format('The page "%s" does not exisit.', state.router.href))
  ]);
}
