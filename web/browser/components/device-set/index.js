// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var debug = require('debug')('reader:device-set');
var device = require('../device');
var extend = require('xtend');
var file = require('../file');
var hg = require('mercury');
var modal = require('../modal');
var read = require('../../dom/read-blob');
var util = require('../../util');
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
    modal: modal.state(options.modal),

    file: file.state(options.file),
    pdf: hg.value(null),
    pages: hg.varhash({
      total: options.pages.total || 1,
      current: options.pages.current || 1,
    }),
    progress: hg.value(0),

    devices: hg.varhash(options.devices, device.state),

    manager: hg.struct({
      active: hg.value(true),
      dragID: hg.value(''),
      overID: hg.value(''),
    }),
    channels: {
      load: load,
      previous: previous,
      next: next,

      manage: manage,

      unlink: unlink,
      link: link,

      drag: drag,
      reorder: reorder,
      reset: reset
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
  state.modal.active.set(true);
}

function unlink(state, data) {
  var device = state.devices.get(data.id);
  device.linked.set(false);
  device.index.set(null);

  // TODO(jasoncampbell): Refactor so that re-indexing is not required.
  util
  .toArray(state.devices)
  .sort(function sortByIndex(a, b) {
    var value = 0;

    if (a.index > b.index) {
      value = 1;
    }

    if (a.index < b.index) {
      value = -1;
    }

    return value;
  }).filter(function filter(device) {
    return device.linked();
  }).forEach(function (device, index) {
    debug('reindexing: %s', device.id());
    device.index.set(index);
  });

  // Reset the manager.
  reset(state, data);
}

function link(state, data) {
  var device = state.devices.get(data.id);

  // This could go away once the drag handlers broadcast correctly.
  if (! data.id || !device || device.linked()) {
    return;
  }

  // TODO(jasoncampbell): Refactor so that re-indexing is not required.
  var linked = util.toArray(state.devices()).filter(function(device) {
    return device.linked;
  });

  device.linked.set(true);
  device.index.set(linked.length);
}

// Prevent circular references when serializing state.
function _PDFDocumentProxyToJSON() {
  return {};
}

function drag(state, data) {
  if (data.dragging) {
    state.manager.dragID.set(data.id);
  } else {
    state.manager.dragID.set('');
  }
}

function reorder(state, data) {
  if (!data.dragging) {
    return;
  }

  var droptarget = state.devices.get(data.droptarget);
  var dragtarget = state.devices.get(data.dragtarget);
  var index = droptarget.index();

  // Swap drag and drop target indexes.
  droptarget.index.set(dragtarget.index());
  dragtarget.index.set(index);
}

function reset(state, data) {
  state.manager.overID.set('');
  state.manager.dragID.set('');
}
