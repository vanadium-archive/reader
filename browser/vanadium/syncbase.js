// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var syncbase = require('syncbase');
var SyncGroupSpec = require('syncbase').nosql.SyncGroupSpec;
var SyncGroupMemberInfo = require('syncbase').nosql.SyncGroupMemberInfo;
var vanadium = require('vanadium');
var verror = vanadium.verror;
var ms = require('ms');
var timeout = require('./util').timeout;
var prr = require('prr');
var assert = require('assert');
var debug = require('debug')('reader:syncbase');
var extend = require('xtend');
var inherits = require('inherits');
var EventEmitter = require('events').EventEmitter;
var waterfall = require('run-waterfall');
var window = require('global/window');
var defaults = {
};

// <app-name>/<db-name>/<table-name>
// reader/db/device-sets/
module.exports = function setup(options, callback) {
  var store = new Store(options);

  store.setup(callback);

  return store;
};


function Store(options) {
  if (!(this instanceof Store)) {
    return new Store(options);
  }

  EventEmitter.call(this);

  options = extend(defaults, options);

  debug('new %o', options);

  assert.ok(options.runtime, 'options.runtime required');

  debug('initializing syncbase: %o', options);
  var store = this;

  prr(store, 'runtime', options.runtime);
  prr(store, 'name', options.name);
  // reader-example/db/device-sets
  // <app-name>/<db-name>/<table-name>
  prr(store, 'appName', 'reader');
  prr(store, 'dbName', 'db');
  prr(store, 'tableName', 'device-sets');

  // 'reader/@@sync/reader/db/device-sets'
  var syncname = options.prefix + '/' + 'reader/@@sync/reader/db/device-sets';
  prr(store, 'syncname', syncname);

  // Keep track of the setup state, maybe make it lazy...
}

inherits(Store, EventEmitter);

// Async setup and bootstrapping for Syncbase.
Store.prototype.setup = function(callback) {
  var store = this;
  var tasks = [
    // <app-name>/<data-base>/<table-name>/:key
    store.createApp.bind(store),
    store.createDB.bind(store),
    store.createTable.bind(store),
    store.createSyncGroup.bind(store),
    store.joinSyncGroup.bind(store),
    store.watch.bind(store),
  ];

  waterfall(tasks, function done(err, db) {
    if (err) {
      callback(err);
      return;
    }

    debug('ready: %s/%s/%s', store.appName, store.dbName, store.tableName);
    prr(store, 'db', db);
    store.emit('ready');
    callback(null, store);
  });
};

Store.prototype.createApp = function(callback) {
  debug('#createApp(%o)', arguments);
  var store = this;
  var runtime = store.runtime;
  var service = syncbase.newService(store.name);
  var app = service.app(store.appName);
  var context = timeout(runtime, ms('5s'));
  var permissions = {};

  app.create(context, permissions, function onapp(err) {
    if (err && !(err instanceof verror.ExistError)) {
      callback(err);
      return;
    }

    callback(null, app);
  });
};

Store.prototype.createDB = function(app, callback) {
  debug('#createDB(%o)', arguments);
  var store = this;
  var runtime = store.runtime;
  var db = app.noSqlDatabase(store.dbName);
  var context = timeout(runtime, ms('5s'));
  var permissions = {};

  db.create(context, permissions, ondb);

  function ondb(err, res) {
    if (err && !(err instanceof verror.ExistError)) {
      callback(err);
      return;
    }

    callback(null, db);
  }
};

Store.prototype.createTable = function(db, callback) {
  debug('#createTable(%o)', arguments);
  var store = this;
  var runtime = store.runtime;
  var permissions = {};
  var context = timeout(runtime, ms('5s'));
  var table = db.table(store.tableName);

  table.create(context, permissions, ontable);

  function ontable(err) {
    if (err && !(err instanceof verror.ExistError)) {
      callback(err);
      return;
    }

    callback(null, db);
  }
};

var MEMBER_INFO = new SyncGroupMemberInfo({
  syncPriority: 8
});

// Currently, SG names must be of the form <syncbaseName>/@@sync/<suffix>.
// We use <app>/<db>/<table> for the suffix part.
Store.prototype.createSyncGroup = function(db, callback) {
  debug('#createSyncGroup(%o)', arguments);

  var store = this;
  var runtime = store.runtime;
  var context = runtime.getContext();
  // [ 'dev.v.io/u/<email>' ]
  var blessings = [ runtime.accountName.replace('/chrome', '') ];
  var syncGroup = db.syncGroup(store.syncname);
  var spec = new SyncGroupSpec({
    perms: new window.Map([
      [ 'Admin',   { 'in': blessings } ],
      [ 'Read',    { 'in': blessings } ],
      [ 'Write',   { 'in': blessings } ],
      [ 'Resolve', { 'in': blessings } ],
      [ 'Debug',   { 'in': blessings } ]
    ]),
    // <table-name>:<actual-prefix>
    prefixes: [ 'device-sets:' ],
    mountTables: [ '/ns.dev.v.io:8101' ]
  });

  debug('blessings %o', blessings);

  syncGroup.create(context, spec, MEMBER_INFO, function oncreate(err) {
    debug('#createSyncGroup => callback(%o)', arguments);
    if (err && !(err instanceof verror.ExistError)) {
      return callback(err);
    }

    callback(null, db);
  });
};

Store.prototype.joinSyncGroup = function(db, callback) {
  debug('#joinSyncGroup(%o)', arguments);
  var store = this;
  var runtime = store.runtime;
  var context = runtime.getContext();
  var syncGroup = db.syncGroup(store.syncname);

  syncGroup.join(context, MEMBER_INFO, function onjoin(err, res) {
    debug('#joinSyncGroup => callback(%o)', arguments);

    callback(err, db);
  });
};

Store.prototype.watch = function(db, callback) {
  debug('#watch(%o)', arguments);
  var store = this;
  var runtime = store.runtime;
  var context = timeout(runtime, ms('5s'));

  db.getResumeMarker(context, function onmarker(err, marker) {
    if (err) {
      return callback(err);
    }

    var context = cancel(runtime);
    var prefix = '';

    var stream = db.watch(context, store.tableName, prefix, marker, idk);

    function idk(err) {
      debug('db.watch cb: %o', arguments);
      // * @param {function} [cb] Optional callback that will be called after
      // watch RPC finishes.
    }

    stream.on('error', function onerror(err) {
      // Read on what this error is and what it means
      debug('watch stream error: \n%s', err.stack);
    });

    stream.on('data', function onchange(change) {
      debug('change detected: %o', arguments);
      var key = change.rowName;

      switch (change.changeType) {
        case 'put':
          store.get(key, function onget(err, value) {
            // TODO: error
            store.emit('put', key, value);
          });
          break;
        case 'delete':
          store.emit('delete', key);
          break;
      }
    });

    callback(null, db);
  });
};

// Add gaurds for setup on get,put,del

// TODO: hash the values so it's possible to detect updates that origniated in
// this instance to detect local changes from remote ones.
Store.prototype.put = function(key, value, callback) {
  debug('#put(%o)', arguments);

  var store = this;
  var table = store.db.table(store.tableName);
  var runtime = store.runtime;
  var context = runtime.getContext();
  var data = '';
  // var context = name(runtime, 'name of context');

  try {
    data = JSON.stringify(value);
  } catch (e) {
    return callback(e);
  }

  table.put(context, key, data, function onput(err, res) {
    debug('#put => callback(%o)', arguments);

    if (err) {
      return callback(err);
    }

    callback();
  });
};

Store.prototype.get = function(key, callback) {
  debug('#get(%o)', arguments);

  var store = this;
  var table = store.db.table(store.tableName);
  var runtime = store.runtime;
  var context = runtime.getContext();

  table.get(context, key, function onget(err, data) {
    debug('#get => callback(%o)', arguments);

    if (err) {
      return callback(err);
    }

    var value = {};

    try {
      value = JSON.parse(data);
    } catch (e) {
      return callback(e);
    }

    callback(null, value);
  });
};

function cancel(runtime) {
  var context = runtime.getContext();
  return context.withCancel();
}
