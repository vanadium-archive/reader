// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var assert = require('assert');
var BlobReader = require('readable-blob-stream');
var db = require('./db');
var debug = require('debug')('reader:syncbase');
var dz = require('dezalgo');
var eos = require('end-of-stream');
var error = require('../error');
var EventEmitter = require('events').EventEmitter;
var extend = require('xtend');
var format = require('util').format;
var get = require('./get');
var inherits = require('inherits');
var ms = require('ms');
var once = require('once');
var parse = require('./parse');
var prr = require('prr');
var put = require('./put');
var syncbase = require('syncbase');
var table = require('./table');
var through = require('through2');
var util = require('../util');
var vanadium = require('vanadium');
var verror = vanadium.verror;
var window = require('global/window');

module.exports = Store;

// Naming for the Syncbase setup looks like <app-name>/<db>/<table>, these
// values are hard-coded in ./db.js and result in serices being mounted with the
// following structure:
//
//    <name>/reader/db/<table>
//
// The app, database, table setup is lazily evaluated and will create missing
// components in the corresponding syncbase if they are missing.
function Store(options) {
  if (!(this instanceof Store)) {
    return new Store(options);
  }
  debug('initializing syncbase: %o', options);
  assert.ok(options.runtime, 'options.runtime required');
  assert.ok(options.name, 'options.name required');

  EventEmitter.call(this);

  var store = this;

  prr(store, 'runtime', options.runtime);
  prr(store, 'name', options.name, 'e');
  prr(store, '_tables', {});
  prr(store, '_db', {}, 'c');

  store._status = 'new';
  store.on('status', onstatus);

  function onstatus(status) {
    debug('status: %s', status);
    store._status = status;
  }
}

inherits(Store, EventEmitter);

Store.prototype.status = function(status) {
  var store = this;
  return store._status === status;
};

Store.prototype.db = function(callback) {
  callback = dz(callback);

  var store = this;

  if (store.status('ready')) {
    callback(null, store._db);
    return;
  }

  // In case a previous call is in process it's callback will handle the error
  // case, but current calls will need to be queued. If the in-process call is
  // successful queued callbacks can be called via the "db" event.
  if (store.status('initializing')) {
    store.once('db', callback.bind(null, null));
    return;
  }

  store.emit('status', 'initializing');

  var context = store.runtime.getContext();
  var name = store.name;
  db(context, name, ondb);

  function ondb(err, db) {
    if (err) {
      callback(err);
      return;
    }

    prr(store, '_db', db);
    store.emit('db', db);
    store.emit('status', 'ready');
    callback(null, db);
  }
};

Store.prototype.table = function(keyspace, callback) {
  callback = dz(callback);

  var store = this;
  var cached = store._tables[keyspace];

  if (cached) {
    callback(null, cached);
    return;
  }

  store.db(ondb);

  function ondb(err, db) {
    if (err) {
      callback(err);
      return;
    }

    var context = store.runtime.getContext();
    table(context, db, keyspace, ontable);
  }

  function ontable(err, table) {
    if (err) {
      callback(err);
      return;
    }

    store._tables[keyspace] = table;
    callback(null, table);
  }
};

Store.prototype.get = function(keyspace, key, callback) {
  var store = this;

  store.table(keyspace, ontable);

  function ontable(err, table) {
    if (err) {
      callback(err);
      return;
    }

    var context = store.runtime.getContext();
    get(context, table, key, onget);
  }

  function onget(err, data) {
    if (err) {
      var template = 'syncbase #get("%s", "%s", callback) failed';
      var message = format(template, keyspace, key);
      error(err, message, callback);
      return;
    }

    callback(null, data);
  }
};

Store.prototype.put = function(keyspace, data, callback) {
  assert.ok(data.id, 'data.id is required.');

  var store = this;
  var context = store.runtime.getContext();

  store.table(keyspace, ontable);

  function ontable(err, table) {
    if (err) {
      return callback(err);
    }

    if (keyspace === 'files' && !data.ref) {
      store.putBlob(data.blob, onref);
    } else {
      put(context, table, data, callback);
    }

    return;

    function onref(err, ref) {
      if (err) {
        return callback(err);
      }

      data.ref = ref;
      put(context, table, data, callback);
    }
  }
};

Store.prototype.del = function(keyspace, key, callback) {
  var store = this;

  store.table(keyspace, ontable);

  function ontable(err, table) {
    var context = store.runtime.getContext();
    var ctx = context.withTimeout(ms('5s'));

    table.delete(ctx, key, callback);
  }
};

Store.prototype.putBlob = function(blob, callback) {
  assert.ok(blob instanceof window.Blob, 'Must use a Blob object.');

  var store = this;

  store.db(ondb);

  function ondb(err, db) {
    if (err) {
      return callback(err);
    }

    var context = store.runtime.getContext();
    var ctx = context.withTimeout(ms('5s'));
    db.createBlob(ctx, onblob);
  }

  function onblob(err, vblob) {
    if (err) {
      callback(err);
      return;
    }

    var reader = new BlobReader(blob);
    var context = store.runtime.getContext();
    var ctx = context.withTimeout(ms('5s'));
    var done = once(onput);
    var writer = vblob.put(ctx, done);

    eos(reader, done);
    eos(writer, { readable: false }, done);

    reader.pipe(writer);

    function onput(err) {
      if (err) {
        callback(err);
        return;
      }

      var context = store.runtime.getContext();
      var ctx = context.withTimeout(ms('5s'));
      vblob.commit(ctx, function oncommit(err) {
        if (err) {
          callback(err);
          return;
        }

        callback(null, vblob.ref);
      });
    }
  }
};

Store.prototype.createReadStream = function(keyspace, options) {
  options = extend({
    start: '',
    limit: ''
  }, options);

  var store = this;
  var stream = through.obj(write);

  store.table(keyspace, ontable);

  return stream;

  function ontable(err, table) {
    if (err) {
      stream.emit('error', err);
      return;
    }

    var range = syncbase.nosql.rowrange.range(options.start, options.limit);
    var done = once(end);
    var context = store.runtime.getContext();
    var ctx = context.withTimeout(ms('5s'));
    var reader = table.scan(ctx, range, done);

    eos(reader, done);
    reader.pipe(stream);
  }

  // Data chunks are `syncbase/nosql.KeyValue` objects.
  function write(chunk, enc, callback) {
    var item = {
      key: chunk.key
    };

    parse(chunk.value, onparse);

    function onparse(err, data) {
      if (err) {
        callback(err);
        return;
      }

      item.value = data;
      callback(null, item);
    }
  }

  function end(err) {
    if (err) {
      stream.emit('error', err);
      return;
    }
  }
};

Store.prototype.createWatchStream = function(keyspace) {
  var store = this;
  var stream = through.obj(write);

  store.db(ondb);

  return stream;

  function ondb(err, db) {
    if (err) {
      stream.emit('error', err);
      return;
    }

    var context = store.runtime.getContext();
    var ctx = context.withTimeout(ms('5s'));
    db.getResumeMarker(ctx, onmarker);

    function onmarker(err, marker) {
      if (err) {
        stream.emit('error', err);
        return;
      }

      var prefix = '';
      var done = once(end);
      var context = store.runtime.getContext();
      var ctx = context.withCancel();
      var reader = db.watch(ctx, keyspace, prefix, marker, done);

      eos(reader, reader);
      reader.pipe(stream);
    }
  }

  function write(chunk, enc, callback) {
    // Ignore local changes and only write changes from sync updates.
    if (!chunk.fromSync) {
      callback(null);
      return;
    }

    debug('change: %o', chunk);

    var change = {
      type: chunk.changeType,
      key: chunk.rowName,
      keyspace: chunk.tableName,
    };

    switch (change.type) {
      case 'put':
        store.get(change.keyspace, change.key, onget);
        break;
      case 'delete':
        callback(null, change);
        break;
    }

    function onget(err, value) {
      if (err) {
        callback(err);
        return;
      }

      debug('get success: %o', value);
      change.value = value;
      callback(null, change);
    }
  }

  function end(err) {
    if (err) {
      stream.emit('error', err);
      return;
    }
  }
};

Store.prototype.sync = function(callback) {
  var _db;

  var store = this;
  var username = util.parseName(store.name).username;
  var context = store.runtime.getContext();
  // The Vanadium name of the running syncbase instance that hosts the sync
  // group.
  var name = 'users/' + username + '/reader/cloudsync';
  var syncname = [
    name,
    '%%sync', // Syncbase naming scheme.
    'cloudsync' // Suffix.
  ].join('/');
  // TODO(jasoncampbell): Find docs or something about what this is and what it
  // does.
  var info = new syncbase.nosql.SyncgroupMemberInfo({
    syncPriority: 8
  });

  db(context, name, ondb);

  function ondb(err, db) {
    if (err) {
      callback(err);
      return;
    }

    _db = db;
    table(context, db, 'files', ontable);
  }

  function ontable(err, table) {
    if (err) {
      callback(err);
      return;
    }

    var permissions = new window.Map([
          [ 'Admin',   { 'in': [ '...' ] } ],
          [ 'Read',    { 'in': [ '...' ] } ],
          [ 'Write',   { 'in': [ '...' ] } ],
          [ 'Resolve', { 'in': [ '...' ] } ],
          [ 'Debug',   { 'in': [ '...' ] } ]
        ]);

    var spec = new syncbase.nosql.SyncgroupSpec({
      description: 'reader syncgroup ',
      perms: permissions,
      // Prefixes are structured as {<tableName>, <keyPrefix>} where <keyPrefix>
      // matches row keys. Rows have Vanadium object names of the form
      // <syncbaseName>/reader/db/<table>/<rowKey>, so a syncgroup prefix can be
      // thought of as a vanadium namespace glob over rows.
      prefixes: [new syncbase.nosql.SyncgroupPrefix({
        tableName: 'files',
        rowPrefix: 'c'
      })],
      // mountTables: [ ... ] - actually a rendezvous point that is
      // permissable to mount to by the syncbase instance hosting the sync
      // group.
      //
      // Note this name NEEDS to be rooted.
      mountTables: [
        '/ns.dev.v.io:8101/users/' + username + '/reader/rendezvous'
      ]
    });

    var ctx = context.withTimeout(ms('5s'));
    var group = _db.syncgroup(syncname);
    group.create(ctx, spec, info, oncreate);
  }

  function oncreate(err) {
    if (err && !(err instanceof verror.ExistError)) {
      return callback(err);
    }

    debug('remote syncbase configured!');

    // Now setup local syncbase to join the remote syncgroup.
    store.db(function(err, db) {
      if (err) {
        return callback(err);
      }

      var ctx = context.withTimeout(ms('5s'));
      var group = db.syncgroup(syncname);

      debug('joining syncgroup: %s', syncname);
      group.join(ctx, info, onjoin);
    });

    function onjoin(err) {
      if (err && !(err instanceof verror.ExistError)) {
        return callback(err);
      }

      callback(null);
    }
  }
};
