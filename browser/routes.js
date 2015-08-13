// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var debug = require('debug')('reader:routes');
var store = require('./pdf-store');
var file = require('./components/files/file');

module.exports = {
  '/#!/': index,
  '/#!/:uuid': show
};

function index(state, params, route) {
  debug('index');
  state.uuid.set(null);

  // TODO(jasoncampbell): The records stream from the source using an iterator
  // stream and are concatenated to form the records array below. To remove the
  // loop below use the stream directly and append to the collection instead of
  // the current concat and loop.
  store.all(function(err, records) {
    if (err) {
      return state.error.set(err);
    }

    var length = records.length;
    for (var i = 0; i < length; i++) {
      var record = records[i];
      state.files.collection.put(record.key, record.value);
    }
  });
}

function show(state, params, route) {
  debug('route "show" uuid: %s', params.uuid);
  state.uuid.set(params.uuid);

  // TODO(jasoncampbell): Show loader.
  store.get(params.uuid, function(err, blob) {
    if (err) {
      state.uuid.set(null);
      state.error.set(err);
      return;
    }

    var update = file.state(blob, params.uuid);
    debug('updating pdf file: %o', update);
    state.pdf.file.set(update);
  });
}
