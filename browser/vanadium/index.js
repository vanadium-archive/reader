// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var debug = require('debug')('reader:vanadium');
var window = require('global/window');
var uuid = require('uuid');
var waterfall = require('run-waterfall');
var vanadium = require('vanadium');
var EventEmitter = require('events').EventEmitter;
var service = require('./service');
var glob = require('./glob-stream');
var filter = require('./filter-stream');
var inherits = require('inherits');
var through = require('through2');
var ms = require('ms');
var once = require('once');
var assert = require('assert');

module.exports = connect;

function connect(state) {
  var client = new Client({ state: state });

  client.discover(function (err, stream) {
    if (err) {
      return state.error.set(err);
    }

    debug('discovery is setup');
  });

  return client;
}

function Client(options) {
  if (!(this instanceof Client)) {
    return new Client(options);
  }

  var client = this;

  client.name = '';
  client.mounted = false;
  client.runtime = {};
  client.peers = options.state.peers;
  client.service = service(client);

  // TODO(jasoncampbell): Come up with a better way to couple the bare service
  // instance with the client's methods.
  client.on('service:announce', client.connect.bind(client));

  EventEmitter.call(client);
}

inherits(Client, EventEmitter);

Client.prototype.discover = function(callback) {
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

  vanadium.init(onruntime);

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

    return callback(null, runtime);
  }
};

Client.prototype.serve = function(runtime, callback) {
  var client = this;
  var service = client.service;
  var server = runtime.newServer();
  var name = getName(runtime);

  client.name = name;

  server.serve(name, service, onserve);

  function onserve(err) {
    if (err) {
      return callback(err);
    }

    window.addEventListener = window.addEventListener || noop;
    window.addEventListener('beforeunload', beforeunload);

    callback(null, runtime);
  }

  function beforeunload() {
    debug('closing Vanadium runtime');
    var namespace = runtime.namespace();
    var context = runtime.getContext();

    // TODO(jasoncampbell): Inspect wether or not these methods actually have
    // time to finish executing, possibly run them in parallel with a callback
    // that fires an alert to test...
    namespace.delete(context, name, true, noop);
    server.stop(noop);
  }
};

Client.prototype.glob = function(runtime, onmount) {
  onmount = once(onmount);

  var client = this;
  var peers = client.peers;
  // Glob pattern based on "<prefix>/reader-example/:uuid"
  var pattern = prefix(runtime) + '/*/*';
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
  var client = this;
  var peers = client.peers;

  assert.ok(name, 'name is required');

  // No need to connect to the local service.
  if (!peers.get(name) && name === client.name) {
    peers.put(name, {
      status: 'self'
    });
  }

  // No need to connect if the peer is known.
  if (peers.get(name)) {
    return;
  }

  peers.put(name, {
    status: 'connecting'
  });

  var runtime = client.runtime;
  var vclient = runtime.newClient();
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
        runtime.namespace().delete(context, name, true, noop);

        // Remove the local stale refernce if the client is mounted. This
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
        status: 'connected'
      });
    });
  });
};

// TODO(jasoncampbell): Move naming related code into a sepatate module.
function getName(runtime) {
  return [
    prefix(runtime),
    'reader-example',
    uuid.v4()
  ].join('/');
}

// Helper function to return a mountable prefix name from a runtime
function prefix(runtime) {
  return runtime.accountName.replace(/^dev.v.io\/u\//, 'users/');
}

function noop() {}
