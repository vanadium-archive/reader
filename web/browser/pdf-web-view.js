// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var debug = require('debug')('pdf-viewer');
var document = require('global/document');
var domready = require('domready');
var struct = require('observ-struct');
var value = require('observ');
var window = require('global/window');

var atom = struct({
  debug: value(true),
  href: value(null),
  pdf: struct({
    document: value(null),
    page: value(null)
  }),
  pages: struct({
    current: value(1),
    total: value(0),
  }),
  scale: value(1),
  progress: value(0),
});

window.atom = atom;
window.debug = require('debug');

// When the state atom is updated to toggle debugging call the correct methods
// on the debug module.
atom.debug(function debugchange(value) {
  // TODO(jasoncampbell): reload page so changes are picked up.
  if (value) {
    window.debug.enable('pdf-*');
  } else {
    window.debug.disable();
  }
});

// Global cache of the canvas element.
var canvas = null;

domready(function ondomready() {
  debug('domready');

  // Initial DOM Node setup.
  canvas = document.createElement('canvas');
  canvas.setAttribute('class','pdf-canvas');
  document.body.style.margin = '0px';
  document.body.style.padding = '0px';
  document.body.appendChild(canvas);

  // Watch for changes on the atom.href value, when it updates load the PDF file
  // located at that location.
  // Trigger with: atom.href.set(value)
  atom.href(function hrefchange(href) {
    debug('loading pdf file: %s', href);
    PDFJS
      .getDocument(href, null, password, progress)
      .then(setPDF, error);
  });

  // Watch for page number changes and asyncronosly load the page from PDF.js
  // APIs.
  // Trigger with: atom.pages.current.set(value)
  atom.pages.current(function pagechange(current) {
    var total = atom.pages.total();

    // Skip invalid operations.
    if (current === 0 || !atom.pdf.document() || current > total) {
      return;
    }

    debug('loading page: %s of %s', current, total);

    var pdf = atom.pdf.document();
    var success = atom.pdf.page.set.bind(null);
    pdf.getPage(current).then(success, error);
  });

  // Watch for changes on the PDF.js page object. When it is updated trigger a
  // render.
  // TODO(jasoncampbell): To prevent rendering errors with frequent state
  // updates renders should be queued in a raf.
  atom.pdf.page(function pagechange(page) {
    debug('rendering page');
    // TODO(jasoncampbell): Use state set scale instead of defaulting to 1.0.
    var scale = window.innerWidth/page.getViewport(1.0).width;
    var viewport = page.getViewport(scale);

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    page.render({
      canvasContext: canvas.getContext('2d'),
      viewport: viewport
    }).promise.then(noop, error);
  });
});

function setPDF(pdf) {
  atom.pdf.document.set(pdf);
  atom.pages.total.set(pdf.numPages);
  atom.pages.current.set(1);
}

function progress(update) {
  var float = (update.loaded/update.total) * 100;
  var value = Math.floor(float);

  // For some reason the update.loaded value above can be higher than the
  // update.total value, in that case we can assume the progress is 100%.
  if (value > 100) {
    value = 100;
  }

  atom.progress.set(value);
}

function password() {
  debug('password required');
}

// TODO(jasoncampbell): Add better error reporting and exception capturing.
function error(err) {
  debug('error: %s', err.stack);
}

function noop() {}
