// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var leveljs = require('level-js');
var debug = require('debug')('reader:pdf-store');
var db = leveljs('pdf-store');
var series = require('run-series');
var IteratorStream = require('level-iterator-stream');
var eos = require('end-of-stream');

module.exports = {
  all: all,
  get: get,
  put: put,
  del: del
};

// TODO(jasoncampbell): It might be better to stream the records in and take
// cursor options so the UI can update quicker and provide controls for
// pagination.
function all(callback) {
  db.open(onopen);

  function onopen(err) {
    if (err) {
      debug('open error: %s\ns', err.message, err.stack);
      return callback(err);
    }

    var records = [];
    var stream = new IteratorStream(db.iterator());

    stream.on('data', function push(data) {
      records.push(data);
    });

    eos(stream, function done(err) {
      if (err) {
        debug('iterator stream error: %s\ns', err.message, err.stack);
        return callback(err);
      }

      callback(null, records);
    });
  }
}

function get(key, callback) {
  debug('get: %s', key);

  var options = { raw: true };
  var tasks = [
    db.open.bind(db),
    db.get.bind(db, key, options)
  ];

  series(tasks, function done(err, results) {
    if (err) {
      debug('put error: %s\ns', err.message, err.stack);
      return callback(err);
    }

    // The value is the result of the last task.
    var last = results.length - 1;
    var value = results[last];
    debug('get success: %o', value);

    callback(null, value);
  });
}

function put(key, value, callback) {
  var options = { raw: true };
  var tasks = [
    db.open.bind(db),
    db.put.bind(db, key, value, options),
    db.get.bind(db, key, options)
  ];

  series(tasks, function done(err, results){
    if (err) {
      debug('put error: %s\ns', err.message, err.stack);
      return callback(err);
    }

    var last = results.length - 1;
    var value = results[last];

    debug('get success: %o', value);
    callback(null, { key: key, value: value });
  });
}

function del() {
  throw new Error('Not implemented.');
}
