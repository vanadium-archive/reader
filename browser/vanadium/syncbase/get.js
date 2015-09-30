// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var ms = require('ms');
var parse = require('./parse');
var pass = require('./pass');
var waterfall = require('run-waterfall');

module.exports = getData;

function getData(context, table, key, callback) {
  var tasks = [
    pass(context, table, key),
    get,
    parse
  ];

  waterfall(tasks, callback);
}

function get(context, table, key, callback) {
  var ctx = context.withTimeout(ms('5s'));

  table.get(ctx, key, onGet);

  function onGet(err, string) {
    if (err) {
      callback(err);
      return;
    }

    callback(null, string);
  }
}
