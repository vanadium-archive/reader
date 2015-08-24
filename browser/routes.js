// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var debug = require('debug')('reader:routes');
var store = require('./pdf-store');
var file = require('./components/files/file');
var eos = require('end-of-stream');

module.exports = {
  '/#!/': index,
  '/#!/:hash': show
};

function index(state, params, route) {
  debug('index');
  state.hash.set(null);

  var stream = store.createReadStream();

  eos(stream, function done(err) {
    if (err) {
      state.error.set(err);
    }
  });

  stream.on('data', function onrecord(record) {
    state.files.collection.put(record.key, {
      hash: record.key,
      blob: record.value
    });
  });
}

function show(state, params, route) {
  var hash = params.hash;

  debug('route "show" file: %s', hash);
  state.hash.set(hash);

  // TODO(jasoncampbell): Show loader.
  // TODO(jasoncampbell): Check if this hash is already in the files collection
  // before looking in the local store.
  store.get(params.hash, function(err, blob) {
    if (err) {
      state.hash.set(null);
      state.error.set(err);
      return;
    }

    // Create a new value for the PDF viewer
    var update = file.state({
      hash: hash,
      blob: blob
    });

    debug('updating pdf file: %o', update);
    state.pdf.file.set(update);
  });
}
