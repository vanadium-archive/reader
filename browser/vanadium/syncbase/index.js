// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var assert = require('assert');
var BlobReader = require('readable-blob-stream');
var debug = require('debug')('reader:syncbase');
var eos = require('end-of-stream');
var EventEmitter = require('events').EventEmitter;
var extend = require('xtend');
var inherits = require('inherits');
var json = require('./json');
var ms = require('ms');
var once = require('once');
var prr = require('prr');
var setup = require('./setup-db');
var syncbase = require('syncbase');
var through = require('through2');
var util = require('../util');
var vanadium = require('vanadium');
var verror = vanadium.verror;
var window = require('global/window');

module.exports = Store;

// Naming for the DB setup looks like <app-name>/<db-name>/<table-name> and
// <db-name> is hard coded to "db".
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
  prr(store, 'tables', {}, 'e');
}

inherits(Store, EventEmitter);

Store.prototype.db = function(callback) {
  var store = this;
  var runtime = store.runtime;
  var name = store.name;

  if (store._db) {
    return process.nextTick(function next() {
      callback(null, store._db);
    });
  }

  setup(runtime, name, function onsetup(err, db) {
    if (err) {
      callback(err);
      return;
    }

    // NOTE: It's possible for this async call to happen in paralell and a
    // previos callback to have fired already. If that is the case do not re-set
    // `store._db`.
    // TODO: Wrap calls with some logic where pending callbacks can
    // be triggered without making multiple `setup` calls.
    if (! store._db) {
      prr(store, '_db', db);
    }

    callback(null, db);
  });
};

Store.prototype.table = function(name, callback) {
  var store = this;

  if (!!store.tables[name]) {
    return process.nextTick(function next() {
      callback(null, store.tables[name]);
    });
  }

  store.db(function ondb(err, db) {
    if (err) {
      callback(err);
      return;
    }

    var table = db.table(name);
    var runtime = store.runtime;
    var context = util.timeout(runtime, ms('5s'));
    var permissions = {};

    table.create(context, permissions, function ontable(err) {
      if (err && !(err instanceof verror.ExistError)) {
        callback(err);
        return;
      }

      store.tables[name] = table;

      callback(null, table);
    });
  });
};

Store.prototype.get = function(keyspace, key, callback) {
  debug('#get("%s", "%s", callback)', keyspace, key);
  var store = this;

  store.table(keyspace, ontable);

  function ontable(err, table) {
    if (err) {
      callback(err);
      return;
    }

    var runtime = store.runtime;
    var context = util.timeout(runtime, ms('5s'));

    table.get(context, key, onget);
  }

  function onget(err, string) {
    if (err) {
      callback(err);
      return;
    }

    json.decode(string, callback);
  }
};

Store.prototype.put = function(keyspace, value, callback) {
  debug('#put("%s", %o, callback)', keyspace, value);
  var store = this;

  assert.ok(value.id, 'item.id is required.');

  store.table(keyspace, ontable);

  function ontable(err, table) {
    if (err) {
      return callback(err);
    }

    if (keyspace === 'files' && !value.ref) {
      assert.ok(value.blob, 'item.blob is required.');
      store.putBlob(value.blob, onref);
    } else {
      put(table, value, callback);
    }

    function onref(err, ref) {
      if (err) {
        return callback(err);
      }

      value.ref = ref;
      put(table, value, callback);
    }

    function put(table, value) {
      var key = value.id;
      var runtime = store.runtime;
      var context = util.timeout(runtime, ms('5s'));

      json.encode(value, function onjson(err, string){
        table.put(context, key, string, onput);
      });

      function onput(err) {
        if (err) {
          return callback(err);
        }

        callback(null, value);
      }
    }
  }
};

Store.prototype.del = function(keyspace, key, callback) {
  debug('#del("%s", "%s", callback)', keyspace, key);
  var store = this;

  store.table(keyspace, ontable);

  function ontable(err, table) {
    var runtime = store.runtime;
    var context = util.timeout(runtime, ms('5s'));

    table.delete(context, key, callback);
  }
};

Store.prototype.putBlob = function(blob, callback) {
  debug('#putBlob(%o, callback)', blob);
  assert.ok(blob instanceof window.Blob, 'Must use a Blob object.');

  var store = this;

  store.db(ondb);

  function ondb(err, db) {
    if (err) {
      return callback(err);
    }

    var runtime = store.runtime;
    var context = util.timeout(runtime, ms('5s'));

    db.createBlob(context, onblob);
  }

  function onblob(err, vblob) {
    if (err) {
      callback(err);
      return;
    }

    var reader = new BlobReader(blob);
    var runtime = store.runtime;
    var context = util.timeout(runtime, ms('5s'));
    var done = once(onput);
    var writer = vblob.put(context, done);

    eos(reader, done);
    eos(writer, { readable: false }, done);

    reader.pipe(writer);

    function onput(err) {
      if (err) {
        callback(err);
        return;
      }

      var runtime = store.runtime;
      var context = util.timeout(runtime, ms('5s'));

      vblob.commit(context, function oncommit(err) {
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

    var runtime = store.runtime;
    var context = util.timeout(runtime, ms('5s'));
    var range = syncbase.nosql.rowrange.range(options.start, options.limit);
    var done = once(end);
    var reader = table.scan(context, range, done);

    eos(reader, done);
    reader.pipe(stream);
  }

  // Data chunks are `syncbase/nosql.KeyValue` objects.
  function write(chunk, enc, callback) {
    var item = {
      key: chunk.key
    };

    json.decode(chunk.value, function onvalue(err, value) {
      if (err) {
        callback(err);
        return;
      }

      item.value = value;
      callback(null, item);
    });
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

    var runtime = store.runtime;
    var context = util.timeout(runtime, ms('5s'));

    db.getResumeMarker(context, onmarker);

    function onmarker(err, marker) {
      if (err) {
        stream.emit('error', err);
        return;
      }

      var runtime = store.runtime;
      var context = util.cancel(runtime);
      var prefix = '';
      var done = once(end);
      var reader = db.watch(context, keyspace, prefix, marker, done);

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

      change.value = value;
      callback(null, value);
    }
  }

  function end(err) {
    if (err) {
      stream.emit('error', err);
      return;
    }
  }
};
