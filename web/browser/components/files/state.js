// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var hg = require('mercury');
var debug = require('debug')('reader:files');
var assert = require('assert');
var cuid = require('cuid');

module.exports = function create(options) {
  options = options || {};

  var state = hg.state({
    error: hg.value(null),
    store: hg.value(null),
    collection: hg.varhash({}, createFile),
    channels: {
      add: add,
      remove: remove
    }
  });

  return state;
};

function add(state, data) {
  if (!data.file) {
    return;
  }

  debug('adding file: %o', data.file);
  // TODO(jasoncampbell): Add validation for blob.type === "application/pdf"
  var key = cuid();

  state.collection.put(key, {
    blob: data.file
  });
}

function remove(state, data) {
  assert.ok(data.id, 'data.id required');
  state.collection.delete(data.id);
}

function createFile(options, key) {
  key = key || cuid();

  // If the blob was created in this application instance it will be a File
  // object and have a name attribute. If it was created by a peer it will
  // manifest locally as a Blob object (Files can't be directly constructed).
  //
  // SEE: https://developer.mozilla.org/en-US/docs/Web/API/File
  var blob = options.blob;

  return hg.struct({
    id: hg.value(key),
    ref: hg.value(options.ref || ''),
    title: hg.value(options.title || blob.name || ''),
    size: hg.value(options.size || blob.size),
    type: hg.value(options.type || blob.type),
    blob: hg.value(blob || null)
  });
}
