// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var assert = require('assert');
var ms = require('ms');
var through = require('through2');

module.exports = createStream;

// Returns a flowing glob stream that emits vanadium names. If options.name is
// present, the stream will recursively call glob until that name is discovered.
function createStream(options) {
  var found = false;
  var stream = through(write);

  assert.ok(options.name, 'options.name is required');

  glob(options, stream, done);

  return stream;

  function write(buffer, enc, callback) {
    if (options.name === buffer.toString()) {
      found = true;
    }

    callback(null, buffer);
  }

  function done(err) {
    if (err) {
      stream.emit('error', err);
      stream.end();
    }

    if (found) {
      stream.end();
    } else {
      glob(options, stream, done);
    }
  }
}

// This function will do a single run of namespace.glob and proxy data events to
// the passed in stream, the callback will be called when the stream has
// finished.
//
// NOTE: recursive polling of the mountable eats about 10% of my CPU on a
// macbook air.
function glob(options, stream, done) {
  assert.ok(options, 'options object is required');
  assert.ok(options.runtime, 'options.runtime is required');
  assert.ok(options.pattern, 'options.pattern is required');

  var runtime = options.runtime;
  var namespace = runtime.namespace();
  var context = runtime.getContext().withTimeout(options.timeout || ms('12s'));
  var promise = namespace.glob(context, options.pattern);

  promise.catch(function(err) {
    throw err;
  });

  // NOTE: The return value from .glob is a promise, to access the stream use
  // the .stream attribute.
  promise.stream.on('data', function onentry(entry) {
    stream.write(entry.name);
  });

  // NOTE: Piping namespace.glob streams causes all kinds of errors which do not
  // directly related to the stream being ended.
  // TODO(jasoncampbell): This thing leaks random errors like crazy, this should
  // get fixed so that errors are related and actionable and tools like
  // end-of-stream can be used.
  promise.stream.on('error', function onerror(err) {
    throw err;
    // maybe proxying errors wont be that bad if vanadium errors can be detected
    // and split out...
  });

  promise.stream.on('end', done);
}
