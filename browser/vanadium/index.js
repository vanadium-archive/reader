// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var assert = require('assert');
var BlobReader = require('readable-blob-stream');
var debug = require('debug')('reader:vanadium');
var EventEmitter = require('events').EventEmitter;
var filter = require('./filter-stream');
var glob = require('./glob-stream');
var inherits = require('inherits');
var ms = require('ms');
var once = require('once');
var parallel = require('run-parallel');
var service = require('./service');
var through = require('through2');
var vanadium = require('vanadium');
var waterfall = require('run-waterfall');
var window = require('global/window');
var syncbase = require('./syncbase');
var prr = require('prr');

module.exports = connect;

function connect(options) {
  var client = new Client(options);

  client.discover(function onmount(err, stream) {
    if (err) {
      return options.error.set(err);
    }

    debug('discovery is setup');
  });

  return client;
}

function Client(options) {
  if (!(this instanceof Client)) {
    return new Client(options);
  }

  debug('instantiating: %o', options);

  var client = this;

  EventEmitter.call(client);

  client.id = options.id;
  client.name = '';
  client.mounted = false;
  client.runtime = {};
  client.peers = options.state.peers;
  client.service = service(client);

  // TODO(jasoncampbell): Come up with a better way to couple the bare service
  // instance with the client's methods.
  client.on('service:announce', client.connect.bind(client));

  client.once('runtime', function onruntime(runtime) {
    var options = {
      client: client,
      runtime: runtime,
      name: client.name.replace('app', 'syncbase'),
      prefix: prefix(runtime).replace('/chrome', '') + '/reader'
    };

    syncbase(options, function syncbaseready(err, store) {
      prr(client, 'syncbase', store);
      client.emit('syncbase', store);
    });
  });
}

inherits(Client, EventEmitter);

Client.prototype.discover = function(callback) {
  debug('initializing discovery');

  var client = this;
  var workers = [
    client.init.bind(client),
    client.serve.bind(client),
    client.glob.bind(client)
  ];

  waterfall(workers, function done(err, params) {
    if (err) {
      return callback(err);
    }

    client.mounted = true;
    callback();
  });
};

Client.prototype.init = function(callback) {
  var client = this;

  vanadium.init({
    appName: 'reader',
    namespaceRoots: [ '/ns.dev.v.io:8101' ],
  }, onruntime);

  function onruntime(err, runtime) {
    if (err) {
      return callback(err);
    }

    debug('runtime is ready');

    // TODO(jasoncampbell): When this happens the window really, really needs to
    // be reloaded. In order to safely reload the page state should be stored or
    // serialized in a way that makes it recoverable for this error case.
    runtime.on('crash', function oncrash(err) {
      debug('runtime crash: %s', err.stack);
      client.emit('error', err);
    });

    client.runtime = runtime;

    // <prefix>/reader/:id
    // <prefix>/reader/:id/syncbase
    // <prefix>/reader/syncgroup
    var name = getName(runtime, client.id);

    debug('name: %s', name);

    client.name = name;

    client.emit('runtime', runtime);

    return callback(null, runtime);
  }
};

Client.prototype.serve = function(runtime, callback) {
  var client = this;
  var service = client.service;

  runtime.newServer(client.name, service, onserve);

  function onserve(err, server) {
    if (err) {
      return callback(err);
    }

    debug('service is ready');

    window.addEventListener = window.addEventListener || noop;
    window.addEventListener('beforeunload', beforeunload);

    callback(null, runtime);

    function beforeunload() {
      debug('closing Vanadium runtime');
      var namespace = runtime.getNamespace();
      var context = runtime.getContext();

      // TODO(jasoncampbell): Inspect wether or not these methods actually have
      // time to finish executing, possibly run them in parallel with a callback
      // that fires an alert to test...
      namespace.delete(context, client.name, true, noop);
      server.stop(noop);
    }
  }
};

Client.prototype.glob = function(runtime, onmount) {
  onmount = once(onmount);

  var client = this;
  var peers = client.peers;
  // Glob pattern based on "<prefix>/reader/:id/app"
  var pattern = prefix(runtime).replace('/chrome', '') + '/reader/*/app';

  var stream = glob({
    name: client.name,
    runtime: runtime,
    pattern: pattern,
    timeout: ms('12s')
  });

  stream.on('error', function(err) {
    debug('glob-stream error: %s', err.stack);
    client.emit('error', err);
  });

  stream
  .pipe(filter(peers))
  .pipe(through(write))
  .on('error', function(err) {
    debug('peer-stream error: %s', err.stack);
    client.emit('error', err);
  });

  function write(buffer, enc, cb) {
    var name = buffer.toString();

    client.connect(name);

    if (name === client.name) {
      onmount();
    }

    cb(null, buffer);
  }
};

Client.prototype.connect = function(name) {
  assert.ok(name, 'name is required');

  var client = this;
  var peers = client.peers;
  var exists = peers.get(name);
  var isSelf = name === client.name;

  // No need to connect to the local service.
  if (!exists && isSelf) {
    peers.put(name, {
      status: 'self'
    });
  }

  // No need to connect if the peer is known.
  if (peers.get(name)) {
    return;
  }

  debug('connecting to peer: %s', name);

  peers.put(name, {
    status: 'connecting'
  });

  var runtime = client.runtime;
  var vclient = runtime.getClient();
  var context = runtime.getContext();

  vclient.bindTo(context, name, function onremote(err, remote) {
    if (err) {
      // NOTE: It is possible the name is a stale entry in the mount table, if
      // that is the case this error and the onremote callback will take a while
      // to complete (upwards of 45 seconds).
      //
      // It might be better for each peer to track this on thier own...
      if (err.id === 'v.io/v23/verror.NoServers') {
        debug('stale mounttable entry: %s', name);
        // TODO(jasoncampbell): Come up with a strategy to alert other peers
        // about stale state of this peer...
        peers.put(name, {
          status: 'stale'
        });

        // Do some cleanup and remove the stale entry so other peers don't have
        // to deal with this error case.
        runtime.getNamespace().delete(context, name, true, noop);

        // Remove the local stale reference if the client is mounted. This
        // prevents re-connect from being attempted when the glob stream is
        // active.
        if (client.mounted) {
          peers.delete(name);
        }

        return;
      } else {
        client.emit('error', err);
        return;
      }
    }

    // TODO(jasoncampbell): This should happen in an interval so that changes in
    // the remote's state can be detected early instead of assuming it will work
    // at a later time...
    remote.announce(context, client.name, function(err, response) {
      if (err) {
        debug('announce errored: %s', err.stack);
        // TODO(jasoncampbell): Come up with a strategy to alert other peers
        // about stale state of this peer...
        client.emit('error', err);
        return;
      }

      debug('announced to "%s" - %s', name, response);

      peers.put(name, {
        status: 'connected',
        remote: remote
      });
    });
  });
};

Client.prototype.remotes = function(status, mapper) {
  var client = this;
  var peers = client.peers();
  var keys = Object.keys(peers);
  var length = keys.length;
  var tasks = [];

  for (var i = 0; i < length; i++) {
    var peer = peers[keys[i]];

    if (peer.status === status) {
      var value = mapper ? mapper(peer) : peer;
      tasks.push(value);
    }
  }

  return tasks;
};

Client.prototype.sendPDF = function(key, file, callback) {
  var client = this;
  var runtime = client.runtime;
  var context = runtime.getContext();
  var tasks = client.remotes('connected', createWorker);
  var meta = {
    hash: key,
    name: file.name,
    size: file.size,
    type: file.type
  };

  // Execute tasks across peers in parallel.
  parallel(tasks, function done(err, results) {
    if (err) {
      callback(err);
      return;
    }

    callback(null, results);
  });

  function createWorker(peer) {
    debug('created worker for remote %s', peer.uuid);
    return worker;

    function worker(callback) {
      callback = once(callback);
      debug('sending PDF (%d bytes) to %s', file.size, peer.uuid);

      var promise = peer.remote.savePDF(context, meta, callback);
      var stream = promise.stream;
      var bs = new BlobReader(file);

      bs.on('error', callback);
      stream.on('end', callback);

      bs.pipe(stream);
    }
  }
};

// TODO(jasoncampbell): Move naming related code into a separate module.
function getName(runtime, id) {
  var p = prefix(runtime).replace('/chrome', '');
  return [
    p,
    'reader',
    id,
    'app'
  ].join('/');
}

// Helper function to return a mountable prefix name from a runtime
function prefix(runtime) {
  return runtime.accountName.replace(/^dev.v.io\/u\//, 'users/');
}

function noop() {}
