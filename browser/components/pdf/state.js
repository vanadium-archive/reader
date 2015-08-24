// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var hg = require('mercury');
var debug = require('debug')('reader:pdf');

module.exports = create;

function create(options) {
  debug('creating state: %o', options);

  var state = hg.state({
    error: hg.value(null),
    pdf: hg.value(null),
    pages: hg.varhash({
      total: 1,
      current: 1,
    }),
    progress: hg.value(0),
    scale: hg.value(1.5),
    linked: hg.value(false),
    file: hg.struct(options.file || {}),
    channels: {
      previous: previous,
      next: next,
      link: link
    }
  });

  state.file(function update(file) {
    debug('file update');
    load(state, file.blob);
  });

  state.error(function(err) {
    if (!err) {
      return;
    }

    console.error('TODO: add an error component');
    console.error(err.stack);
  });

  // Initialize the async PDFJS file loading.
  load(state, options.file && options.file.blob);

  return state;
}

function next(state, data) {
  // Only advance if it's not the last page.
  var current = state.pages.get('current');
  var total = state.pages.get('total');
  if (current < total) {
    state.pages.put('current', current + 1);
  }
}

function previous(state, data) {
  // Only advance if it's not the first page.
  var current = state.pages.get('current');
  if (current > 1) {
    state.pages.put('current', current - 1);
  }
}

function link(state, data) {
  state.pages.put('linked', !state.pages.get('linked'));
}

function load(state, file) {
  if (!file) {
    return;
  }

  if (file.size === 0) {
    var message = 'TODO: figure out why blobs from indexedDB' +
        'will randomly have a size === 0';
    var err = new Error(message);
    state.error.set(err);
    return;
  }

  debug('loading file into PDFJS: %o', file);

  var transport = new PDFJS.PDFDataRangeTransport();
  var source = {};

  // SEE: https://jsfiddle.net/6wxnd9uu/6/
  transport.count = 0;
  transport.file = file;
  transport.length = file.size;
  source.length = file.size;
  transport.requestDataRange = requestDataRange;

  function requestDataRange(begin, end) {
    var blob = this.file.slice(begin, end);
    var fileReader = new FileReader();

    fileReader.onload = function onload() {
      transport.count += end - begin;
      transport.onDataRange(begin, new Uint8Array(this.result));
    };

    fileReader.readAsArrayBuffer(blob);
  }

  PDFJS
  .getDocument(source, transport, password, progress)
  .then(success, error);

  function password() {
    var err = new Error('Password required');
    state.error.set(err);
  }

  // TODO: Add a progress loader to the UI.
  function progress(update) {
  }

  function success(pdf) {
    debug('PDF loaded: %o', pdf);
    state.pdf.set(pdf);
    state.pages.put('current', 1);
    state.pages.put('total', pdf.numPages);
  }

  function error(err) {
    debug('error file loading into PDFJS: %o', err);
    state.error.set(err);
  }
}
