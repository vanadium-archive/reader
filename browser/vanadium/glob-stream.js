// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var debug = require('debug')('reader:wrapper:glob-stream')
var assert = require('assert')
var extend = require('extend')
var ms = require('ms')
var through = require('through2')

module.exports = createStream

// Returns a flowing glob stream that emits vanadium names. If options.name is
// present, the stream will recursively call glob until that name is discovered.
function createStream(options) {
  var found = false
  var stream = through.obj(write)

  glob(options, stream, done)

  return stream

  function write(entry, enc, callback) {
    if (options.name && options.name === entry.name) {
      found = true
    }

    callback(null, entry.name)
  }

  function done(err, results) {
    // If a name was passed in, recusively glob until it is found.
    if (options.name && found === false) {
      glob(options, stream, done)
    } else {
      stream.end()
    }
  }
}

// This function will do a single run of namespace.glob and proxy data events to
// the passed in stream, the callback will be called when the stream has
// finished.
function glob(options, stream, done) {
  assert.ok(options, 'options object is required')
  assert.ok(options.runtime, 'options.runtime is required')
  assert.ok(options.pattern, 'options.pattern is required')

  options = extend({
    timeout: ms('12s')
  }, options)

  var found = false
  var runtime = options.runtime
  var namespace = runtime.namespace()
  var context = runtime.getContext().withTimeout(options.timeout)
  var promise = namespace.glob(context, options.pattern)

  promise.catch(function(err) {
    throw err
  })

  // NOTE: The return value from .glob is a promise, to access the stream use
  // the .stream attribute.
  promise.stream.on('data', function onentry(entry) {
    stream.write(entry)
  })

  // NOTE: Piping namespace.glob streams causes all kinds of errors which do not
  // directly related to the stream being ended.
  // TODO(jasoncampbell): This thing leaks random errors like crazy, this should
  // get fixed so that errors are related and actionable and tools like
  // end-of-stream can be used.
  // // errors should get proxied to the output stream... or since this thing spwes
  // // errors like crazy we just ignore them?
  promise.stream.on('error', function onerror(err) {
    throw err
    // maybe proxying errors wont be that bad if vanadium errors can be detected
    // and split out...
  })

  promise.stream.on('end', done)
}
