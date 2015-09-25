// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var waterfall = require('run-waterfall');
var vanadium = require('vanadium');
var verror = vanadium.verror;
var util = require('../util');
var syncbase = require('syncbase');
var util = require('../util');
var ms = require('ms');

module.exports = setup;

function setup(runtime, name, done) {
  var tasks = [
    createApp,
    createDB
  ];

  waterfall(tasks, done);

  function createApp(callback) {
    var service = syncbase.newService(name);
    var appName = util.parseName(name).app;
    var app = service.app(appName);
    var context = util.timeout(runtime, ms('5s'));
    var permissions = {};

    app.create(context, permissions, function onapp(err) {
      if (err && !(err instanceof verror.ExistError)) {
        callback(err);
      } else {
        callback(null, app);
      }
    });
  }

  function createDB(app, callback) {
    var db = app.noSqlDatabase('db');
    var context = util.timeout(runtime, ms('5s'));
    var permissions = {};

    db.create(context, permissions, function ondb(err) {
      if (err && !(err instanceof verror.ExistError)) {
        callback(err);
      } else {
        callback(null, db);
      }
    });
  }
}
