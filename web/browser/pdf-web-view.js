// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var assert = require('assert');
var canvas = require('./widgets/canvas-widget');
var document = require('global/document');
var domready = require('domready');
var format = require('format');
var h = require('mercury').h;
var hg = require('mercury');
var window = require('global/window');

// Allow debugging in a normal browser.
window.android = window.android || {
  setPageCount: noop
};

domready(function ondomready() {
  debug('domready');

  var atom = state({});

  // Watch for the total page number changes and give the new value to the
  // Android client.
  atom.pages.total(function totalchange(current) {
    window.android.setPageCount(current);
  });

  window.atom = atom;
  window.client = {
    open: function openPDF(href) {
      open(atom, { href: href });
    },
    page: function pagePDF(number) {
      page(atom, { number: number });
    }
  };

  hg.app(document.body, atom, render);

  return;
});

function state(options) {
  var atom = hg.state({
    debug: hg.value(options.debug || true),
    progress: hg.value(0),
    pdf: hg.struct({
      document: hg.value(null),
      page: hg.value(null),
    }),
    pages: hg.struct({
      current: hg.value(1),
      total: hg.value(0),
    }),
    scale: hg.value(1),
    ratio: hg.value(window.devicePixelRatio || 1),
    width: hg.value(window.innerWidth),
    height: hg.value(window.innerHeight),
    channels: {
      open: open,
      page: page
    }
  });

  return atom;
}

function open(state, data) {
  assert.ok(data.href, 'data.href required');
  debug('opening PDF file: %s', data.href);

  var promise = PDFJS.getDocument(data.href, null, password, progress);
  promise.then(success, error);

  function password() {
    var message = format('Password required to open: "%s"', data.href);
    var err = new Error(message);
    error(err);
  }

  function progress(update) {
    // Some servers or situations might not return the content-length header
    // which is proxied to update.total. Skip updating the progress if this
    // value is not set.
    if (!update.total) {
      return;
    }

    var float = (update.loaded/update.total) * 100;
    var value = Math.floor(float);

    // For some reason the update.loaded value above can be higher than the
    // update.total value, in that case we can assume the progress is 100%.
    if (value > 100) {
      value = 100;
    }

    state.progress.set(value);
  }

  function success(pdf) {
    state.pdf.document.set(pdf);
    state.pages.total.set(pdf.numPages);
    page(state, { number: 1 });
  }
}

function page(state, data) {
  assert.ok(data.number, 'data.number required');

  var pdf = state.pdf.document();
  var total = state.pages.total();
  var number = data.number;

  // Skip invalid operations.
  if (number === 0 || !pdf || number > total) {
    return;
  }

  debug('loading page "%s"', number);

  pdf.getPage(number).then(success, error);

  function success(page) {
    debug('loaded page "%s"', number);
    var width = page.getViewport(1).width;
    var scale = state.width() / width;
    var viewport = page.getViewport(scale);

    // Reset the scroll position on page change.
    window.scroll(0, 0) ;

    // Update the state.
    state.pdf.page.set(page);
    state.scale.set(scale);
    state.height.set(viewport.height);
    state.pages.current.set(number);
  }
}

function render(state) {
  return h('.pdf-viewer', [
    canvas(draw, state)
  ]);
}


function draw(context, state, done) {
  // Skip render if missing the PDFJS page object.
  if (!state.pdf.page) {
    done();
    return;
  }

  state.pdf.page.render({
    canvasContext: context,
    viewport: state.pdf.page.getViewport(state.scale)
  }).promise.then(done, error);
}

// TODO(jasoncampbell): Add better error reporting and exception capturing.
function error(err) {
  throw err;
}

function noop() {}

function debug(template, value) {
  // Noop if debugging is disabled.
  if (typeof window.atom === 'undefined' || !window.atom.debug()) {
    return;
  }

  // The logging in Android Studio only shows the template string when calling
  // console.log directly, pre-fromatting allows the logs to show the correct
  // information.
  template = 'pdf-viewer: ' + template;
  var message = format.apply(null, arguments);
  console.log(message);
}
