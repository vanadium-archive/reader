// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var error = require('../error');
var format = require('util').format;
var ms = require('ms');
var pass = require('./pass');
var syncbase = require('syncbase');
var vanadium = require('vanadium');
var verror = vanadium.verror;
var waterfall = require('run-waterfall');

module.exports = create;

// Creates the syncbase structure up to the databse level. The database will be
// mounted as: <name>/reader/db.
function create(context, name, done) {
  var tasks = [
    pass(context, name),
    createApp,
    createDB
  ];

  waterfall(tasks, done);
}

function createApp(context, name, callback) {
  var service = syncbase.newService(name);
  var app = service.app('reader');
  var ctx = context.withTimeout(ms('5s'));
  var permissions = {};

  app.create(ctx, permissions, onapp);

  function onapp(err) {
    if (err && !(err instanceof verror.ExistError)) {
      var template = 'syncbase - app.create(...) failed\n * name: %s';
      var message = format(template, name);
      error(err, message, callback);
    } else {
      callback(null, context, app);
    }
  }
}

function createDB(context, app, callback) {
  var db = app.noSqlDatabase('db');
  var ctx = context.withTimeout(ms('5s'));
  var permissions = {};

  db.create(ctx, permissions, ondb);

  function ondb(err) {
    if (err && !(err instanceof verror.ExistError)) {
      var message = format('syncbase - db.create(...) failed');
      error(err, message, callback);
    } else {
      callback(null, db);
    }
  }
}
