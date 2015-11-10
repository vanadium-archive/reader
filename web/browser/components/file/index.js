// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var cuid = require('cuid');
var db = require('../../dom/blob-store');
var debug = require('debug')('reader:file');
var extend = require('xtend');
var hash = require('./hash-blob');
var hg = require('mercury');
var window = require('global/window');

module.exports = {
  state: state
};

function state(options, key) {
  options = extend({
    id: key || cuid()
  }, options);

  debug('init: %o', options);

  // If the blob was created in this application instance it will be a File
  // object and have a name attribute. If it was created by a peer it will
  // manifest locally as a Blob object (Files can't be directly constructed).
  //
  // SEE: https://developer.mozilla.org/en-US/docs/Web/API/File
  var blob = options.blob || {};

  var atom = hg.state({
    id: hg.value(options.id),
    ref: hg.value(options.ref || ''),
    title: hg.value(options.title || blob.name || ''),
    size: hg.value(options.size || blob.size),
    type: hg.value(options.type || blob.type),
    blob: hg.value(blob || null),
    hash: hg.value(options.hash || ''),
    error: hg.value(null),
  });

  // If this file's blob is set, hash it's contents and save it in the local db
  // for later. This makes reloading the page easier as the blob data will be
  // available for quick retreival later.
  if (blob instanceof window.Blob) {
    save(atom, { blob: atom.blob() });
  } else if (atom.hash()) {
    load(atom, { hash: atom.hash() });
  }

  return atom;
}

function save(state, data) {
  if (! data.blob) {
    return;
  }

  hash(data.blob, onhash);

  function onhash(err, digest) {
    if (err) {
      return done(err);
    }

    state.hash.set(digest);
    db.put(digest, data.blob, done);
  }

  function done(err) {
    if (err) {
      return state.error.set(err);
    }
  }
}

function load(state, data) {
  if (! data.hash) {
    return;
  }

  db.get(data.hash, onget);

  function onget(err, blob) {
    if (err) {
      return state.error.set(err);
    }

    state.blob.set(blob);
  }
}
