// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var assert = require('assert');
var eos = require('end-of-stream');
var error = require('./error');
var format = require('util').format;
var ms = require('ms');
var once = require('once');
var through = require('through2');

module.exports = createStream;

// Returns a flowing glob stream that emits vanadium names, will recursively
// glob until options.name is discovered.
function createStream(options) {
  var found = false;
  var stream = through(write);
  var runtime = options.runtime;
  var pattern = options.pattern;

  assert.ok(options.name, 'options.name is required');

  _glob();

  return stream;

  function _glob() {
    var gs = glob(runtime, pattern);

    eos(gs, end);
    gs.pipe(stream);
  }

  // Track if options.name was found.
  function write(buffer, enc, callback) {
    if (options.name === buffer.toString()) {
      found = true;
    }

    callback(null, buffer);
  }

  function end(err) {
    if (err) {
      stream.emit('error', err);
      return;
    }

    if (found) {
      stream.end();
    } else {
      _glob(runtime, pattern);
    }
  }
}

function glob(runtime, pattern) {
  var namespace = runtime.getNamespace();
  var context = runtime.getContext();
  var ctx = context.withTimeout(ms('10s'));
  var done = once(end);
  var stream = through.obj(write);

  var gs = namespace.glob(ctx, pattern, done).stream;

  eos(gs, done);
  gs.pipe(stream);

  return stream;

  function end(err) {
    if (err) {
      var message = format('Globbing "%s" failed', pattern);
      stream.emit('error', error(err, message));
    }
  }

  // Transform Glob entries to single names.
  function write(entry, enc, cb) {
    cb(null, entry.name);
  }
}
