// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var constellation = require('./components/constellation');
var css = require('./components/base/index.css');
var debug = require('debug')('reader:main');
var document = require('global/document');
var domready = require('domready');
var each = require('./util').each;
var eos = require('end-of-stream');
var files = require('./components/files');
var footer = require('./components/footer');
var h = require('mercury').h;
var header = require('./components/header');
var hg = require('mercury');
var insert = require('insert-css');
var pdf = require('./components/pdf');
var mover = require('./components/mover');
var removed = require('./util').removed;
var router = require('./router');
var routes = require('./routes');
var vanadium = require('./vanadium');
var window = require('global/window');
var qs = require('qs');
var url = require('url');

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
    pdf: pdf.state({}),
    mover: mover.state({}),
    constellation: constellation.state(),
    error: hg.value(null)
  });

  // TODO(jasoncampbell): add an error component for aggregating, logging, and
  // displaying errors in the UI.
  state.error(function onstateerror(err) {
    if (!err) {
      return;
    }

    console.error('TODO(jasoncampbell): add an error component');
    console.error(err.stack);

    for (var key in err) {
      if (err.hasOwnProperty(key)) {
        console.error('* %s => %o', key, err[key]);
      }
    }
  });

  router(state, routes).on('notfound', notfound);

  // Quick way to change the id of the running application using a query param.
  // TODO(jasoncampbell): Create a configuration screen/component.
  var query = url.parse(window.location.href).query;
  var id = qs.parse(query).id || process.env.ID;

  debug('##### %s #####', id);

  // The vanadium client is coupled to the application state here so that async
  // code paths in the ./vanadium modules can be isolated to the application
  // initialization. This allows components to be separately tested/interacted
  // with as mappings between data and UI without being tangled into the
  // local vanadium discovery process.
  var client = vanadium({ id: id });

  client.on('error', function onvanadiumerror(err) {
    state.error.set(err);
  });

  client.on('syncbase', function onsyncbase(store) {
    state.store.set(store);

    store.sync(function onsync(err) {
      if (err) {
        state.error.set(err);
        return;
      }

      debug('store.sync succeeded!');
    });

    // Setup watch.
    var ws = store.createWatchStream('files');

    eos(ws, function(err) {
      if (err) {
        state.error.set(err);
      }
    });

    ws.on('data', function onwatchchange(change) {
      debug('watch stream change: %o', change);
      // NOTE: this triggers a recursion between clients :(

      if (change.type === 'put') {
        state.files.collection.put(change.key, change.value);
      }

      if (change.type === 'delete') {
        state.files.collection.delete(change.key);
      }
    });

    // Scan all keys and populate state.
    var stream = store.createReadStream('files');

    stream.on('data', function onreadstreamdata(data) {
      state.files.collection.put(data.key, data.value);
    });

    eos(stream, function(err) {
      if (err) {
        state.error.set(err);
      }

      // Add the watcher here, after the collection has been populated to
      // prevent firing the listener and re-puting all the files again.
      state.files.collection(fileschange);
    });
  });

  function fileschange(collection) {
    debug('state.files.collection => change: %o', collection);
    var store = state.store();

    // TODO(jasoncampbell): make sure to try and sync this at some point or
    // block all UI until the runtime is ready.
    // SEE: http://git.io/vn5YV
    if (!store) {
      return;
    }

    removed(collection, function(key) {
      store.del('files', key, function(err) {
        if (err) {
          state.error.set(err);
        }
      });
    });

    each(collection, function(key, value) {
      store.put('files', value, function callback(err, file) {
        if (err) {
          state.error.set(err);
        }

        state.files.collection[file.id].ref.set(file.ref);
      });
    });
  }

  hg.app(document.body, state, render);
});

function render(state) {
  insert(css);

  return h('.reader-app', [
    hg.partial(header.render, state),
    hg.partial(content, state),
    hg.partial(mover.render, state.mover, state.mover.channels),
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
