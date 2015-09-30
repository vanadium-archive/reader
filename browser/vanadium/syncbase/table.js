// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var error = require('../error');
var format = require('util').format;
var ms = require('ms');
var vanadium = require('vanadium');
var verror = vanadium.verror;

module.exports = createOrGetTable;

function createOrGetTable(context, db, keyspace, callback) {
  var table = db.table(keyspace);
  var ctx = context.withTimeout(ms('5s'));
  var permissions = {};

  table.create(ctx, permissions, onTableCreate);

  function onTableCreate(err) {
    if (err && !(err instanceof verror.ExistError)) {
      var template = 'syncbase - db.table("%s").create(...) failed';
      var message = format(template, keyspace);
      error(err, message, callback);
      return;
    }

    callback(null, table);
  }
}
