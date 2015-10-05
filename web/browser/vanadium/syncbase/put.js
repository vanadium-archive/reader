// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var debug = require('debug')('reader:syncbase:put');
var equal = require('deep-equal');
var error = require('../error');
var format = require('util').format;
var get = require('./get');
var ms = require('ms');
var vanadium = require('vanadium');
var verror = vanadium.verror;

var options = { strict: true };

module.exports = put;

function put(context, table, data, callback) {
  get(context, table, data.id, onGet);

  function onGet(err, old) {
    if (err && !(err instanceof verror.NoExistError)) {
      callback(err);
      return;
    }

    // Skip put calls to syncbase if the content is the same as what exisits.
    // This prevents recursion on put, watch, state update cycles over p2p sync.
    if (equal(old, data, options)) {
      debug('skipping put, old value is the same');
      callback(null, data);
      return;
    }

    var string = '';

    try {
      string = JSON.stringify(data);
    } catch (e) {
      var message = format('Failed to encode "%s"', data);
      error(e, message, callback);
      return;
    }

    var ctx = context.withTimeout(ms('5s'));
    table.put(ctx, data.id, string, onPut);
  }

  function onPut(err) {
    if (err) {
      var template = 'table: "%s" .put(ctx, "%s", ...) failed';
      var message = format(template, table.name, data.id);
      error(err, message, callback);
      return;
    }

    callback(null, data);
  }
}
