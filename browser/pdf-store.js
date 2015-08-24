// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var assert = require('assert');
var debug = require('debug')('reader:pdf-store');
var EventEmitter = require('events').EventEmitter;
var extend = require('xtend');
var format = require('format');
var hash = require('./hash-blob');
var IteratorStream = require('level-iterator-stream');
var leveljs = require('level-js');
var series = require('run-series');
var through = require('through2');
var thunky = require('thunky');
var window = require('global/window');

// Create a singleton instance of a database for this application.
var db = leveljs('pdf-store');

// Use the thunky module to lazily evaluate the async db.open() and cache the
// result for subsequent calls. Any of the exported methods could be the first
// database call and need to start with a call to open in thier series chain of
// async function calls.
var open = thunky(function opening(callback) {
  debug('initializing database');
  db.open(callback);
});

// Create a singleton EventEmitter instance so that other parts of the
// application can react to emitted database updates (puts, deletes, etc).
// NOTE: There might be a better way to do this...
var ee = new EventEmitter();

var defaults = {
  raw: true,
  silent: false
};

module.exports = {
  get: get,
  put: put,
  del: del,
  has: has,
  createReadStream: createReadStream,
  on: ee.on.bind(ee)
};

function createReadStream() {
  var stream = through.obj();

  open(function onopen(err) {
    if (err) {
      stream.emit('error', err);
      return;
    }

    var iterator = new IteratorStream(db.iterator());

    iterator.pipe(stream);
  });

  return stream;
}

function get(key, options, callback) {
  callback = typeof options === 'function' ? options : callback;
  options = extend(defaults, (typeof options === 'object' ? options : {}));

  var tasks = [
    open,
    db.get.bind(db, key, options)
  ];

  series(tasks, function done(err, results) {
    if (err) {
      debug('get error: %s\ns', err.message, err.stack);
      return callback(err);
    }

    // The value is the result of the last task.
    var last = results.length - 1;
    var value = results[last];

    if (value.size === 0) {
      // TODO(jasoncampbell): figure out why blobs from indexedDB will randomly
      // have a size === 0
      var message = format('PDF: %s has a zero size', key);
      return callback(new Error(message));
    }

    callback(null, value);
  });
}

function has(key, callback) {
  var tasks = [
    open,
    get.bind(null, key)
  ];

  series(tasks, function done(err, results) {
    if (err && err.message !== 'NotFound') {
      callback(err);
    } else {
      callback(null, !err);
    }
  });
}

function put(file, options, callback) {
  callback = typeof options === 'function' ? options : callback;
  options = extend(defaults, (typeof options === 'object' ? options : {}));

  assert.ok(file instanceof window.Blob, 'Must use a Blob object.');

  hash(file, onhash);

  return;

  function onhash(err, key) {
    if (err) {
      debug('hash error: %s\ns', err.message, err.stack);
      return callback(err);
    }

    var tasks = [
      open,
      db.put.bind(db, key, file, options),
    ];

    series(tasks, function done(err, results){
      if (err) {
        debug('put error: %s\ns', err.message, err.stack);
        return callback(err);
      }

      callback(null, key, file);

      if (!options.silent) {
        ee.emit('put', key, file);
      }
    });
  }
}

function del(key, options, callback) {
  callback = typeof options === 'function' ? options : callback;
  options = extend(defaults, (typeof options === 'object' ? options : {}));

  var tasks = [
    open,
    db.del.bind(db, key, options, callback),
  ];

  series(tasks, function done(err, results) {
    if (err) {
      debug('del error: %s\n%s', err.message, err.stack);
      callback(err);
    } else {
      callback();
    }
  });
}
