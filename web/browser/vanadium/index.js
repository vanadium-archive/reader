// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var assert = require('assert');
var debug = require('debug')('reader:vanadium');
var eos = require('end-of-stream');
var EventEmitter = require('events').EventEmitter;
var glob = require('./glob-stream');
var inherits = require('inherits');
var ms = require('ms');
var once = require('once');
var prr = require('prr');
var service = require('./service');
var syncbase = require('./syncbase');
var vanadium = require('vanadium');
var waterfall = require('run-waterfall');
var window = require('global/window');

module.exports = connect;

function connect(options) {
  var client = new Client(options);

  client.mount(function onmount(err) {
    if (err) {
      client.emit('error', err);
      return;
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
  client.service = service(client);

  // TODO(jasoncampbell): Come up with a better way to couple the bare service
  // instance with the client's methods.
  client.on('service:announce', client.connect.bind(client));

  client.once('runtime', function onruntime(runtime) {
    var options = {
      runtime: runtime,
      name: client.name.replace(/\/app$/, '/syncbase')
    };

    var store = syncbase(options);
    prr(client, 'syncbase', store);
    client.emit('syncbase', store);
    debug('runtime is available');
  });
}

inherits(Client, EventEmitter);

Client.prototype.mount = function(callback) {
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

    client.name = name;

    client.emit('runtime', runtime);

    return callback(null, runtime);
  }
};

Client.prototype.serve = function(runtime, callback) {
  var client = this;
  var service = client.service;

  debug('serve: %s', client.name);
  runtime.newServer(client.name, service, onserve);

  function onserve(err, server) {
    if (err) {
      return callback(err);
    }

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

// Globs until mounted.
Client.prototype.glob = function(runtime, callback) {
  callback = once(callback);

  var client = this;
  // Glob pattern based on "<prefix>/reader/:id/app"
  var pattern = prefix(runtime).replace('/chrome', '') + '/reader/*/app';
  var stream = glob({
    name: client.name,
    runtime: runtime,
    pattern: pattern,
    timeout: ms('12s')
  });

  // Glob stream ends once the mounted client.name has been discovered or there
  // is an error.
  //
  // NOTE: Streaming names through service connection has been commented out,
  // this will will be addressed later as the previous client/service model is
  // unessecary given the way syncbase is being leveraged.
  //
  // TODO(jasoncampbell): Hook up a simple discovery mechanism to detect new
  // peers and share information about constellation state like disconnects.
  eos(stream, { readable: false }, callback);


  // stream
  // .pipe(filter(peers))
  // .pipe(through(write))
  // .on('error', function(err) {
  //   debug('peer-stream error: %s', err.stack);
  //   client.emit('error', err);
  // });
  //
  // function write(buffer, enc, cb) {
  //   var name = buffer.toString();
  //
  //   client.connect(name);
  //
  //   if (name === client.name) {
  //     onmount();
  //   }
  //
  //   cb(null, buffer);
  // }
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
