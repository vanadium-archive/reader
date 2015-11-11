// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var debug = require('debug')('reader:device-set');
var device = require('../device');
var extend = require('xtend');
var file = require('../file');
var hg = require('mercury');
var read = require('../../dom/read-blob');
var uuid = require('uuid').v4;

module.exports = {
  render: require('./render'),
  state: state,
  channels: {
    load: load
  },
};

function state(options, key) {
  options = extend({
    id: key || uuid(),
    devices: {},
    pages: {}
  }, options);

  debug('init: %o', options);

  var atom = hg.state({
    id: hg.value(options.id),
    error: hg.value(null),
    file: file.state(options.file),
    pdf: hg.value(null),
    pages: hg.varhash({
      total: options.pages.total || 1,
      current: options.pages.current || 1,
    }),
    progress: hg.value(0),
    devices: hg.varhash(options.devices, device.state),
    channels: {
      load: load,
      previous: previous,
      next: next,
      manage: manage
    }
  });

  return atom;
}

// SEE: https://jsfiddle.net/6wxnd9uu/6/
function load(state, data) {
  var blob = state.file.blob();

  if (!blob) {
    return;
  }

  state.progress.set(0);

  debug('loading Blob into PDFJS: %o', blob);

  var source = { length: blob.size };
  var transport = new PDFJS.PDFDataRangeTransport();

  transport.count = 0;
  transport.file = blob;
  transport.length = blob.size;
  transport.requestDataRange = requestDataRange;

  function requestDataRange(begin, end) {
    var chunk = blob.slice(begin, end);

    read(chunk, function onread(err, result) {
      transport.count += end - begin;
      transport.onDataRange(begin, new Uint8Array(result));
    });
  }

  PDFJS
  .getDocument(source, transport, password, progress)
  .then(success, error);

  function password() {
    var err = new Error('Password required');
    state.error.set(err);
  }

  function progress(update) {
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
    pdf.toJSON = _PDFDocumentProxyToJSON;
    state.pdf.set(pdf);
    state.pages.put('current', state.pages.get('current'));
    state.pages.put('total', pdf.numPages);
  }

  function error(err) {
    state.error.set(err);
  }
}

function previous(state, data) {
  // Only advance if it's not the first page.
  var current = state.pages.get('current');
  if (current > 1) {
    state.pages.put('current', current - 1);
  }
}

function next(state, data) {
  // Only advance if it's not the last page.
  var current = state.pages.get('current');
  var total = state.pages.get('total');
  if (current < total) {
    state.pages.put('current', current + 1);
  }
}

function manage(state, data) {
  debug('manage device set: %s', state.id());
}

// Prevent circular references when serializing state.
function _PDFDocumentProxyToJSON() {
  return {};
}
