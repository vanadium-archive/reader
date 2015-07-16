// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var window = require('global/window');
var debug = require('debug')('reader:vanadium-wrapper');
var vanadium = require('vanadium');
var inherits = require('inherits');
var prr = require('prr');
var EventEmitter = require('events').EventEmitter;
var Service = require('./service');
var uuid = require('uuid');
var extend = require('xtend');
var assert = require('assert');
var through = require('through2').obj;
var defaults = {
  app: 'reader-example',
  id: uuid.v4()
};

var glob = require('./glob-stream');

module.exports = mount;

function mount(options) {
  var wrapper = new VanadiumWrapper(options);

  // Kicks off the async Vanadium init, serve, and glob.
  wrapper.mount();

  return wrapper;
}

function VanadiumWrapper(options) {
  if (!(this instanceof VanadiumWrapper)) {
    return new VanadiumWrapper(options);
  }

  var wrapper = this;

  wrapper.options = extend(defaults, options);
  wrapper.runtime = {};
  wrapper.service = {};
  wrapper.prefix = '';

  prr(wrapper, 'status', 'new', { enumerable: true });
  prr(wrapper, 'peers', {}, { enumerable: true });

  EventEmitter.call(wrapper);

  wrapper.on('status', onstatus);
}

inherits(VanadiumWrapper, EventEmitter);

VanadiumWrapper.prototype.mount = function() {
  var wrapper = this;

  vanadium.init(onruntime);

  function onruntime(err, runtime){
    if (err) {
      return wrapper.emit('error', err);
    }

    runtime.on('crash', wrapper.emit.bind(wrapper, 'error'));

    wrapper.runtime = runtime;
    wrapper.prefix = prefix(runtime);

    wrapper.emit('name', wrapper.name());
    wrapper.emit('runtime', runtime);
    wrapper.emit('status', 'initialized');

    if (window.addEventListener) {
      window.addEventListener('beforeunload', beforeunload);
    }

    var server = runtime.newServer();
    var name = wrapper.name();
    var service = new Service(name, wrapper);
    var options = {};

    wrapper.server = server;

    debug('serving: %s', name);

    server.serve(name, service, options, onserve);
  }

  function beforeunload() {
    debug('closing Vanadium runtime');

    // JShint has a hard time knowing the scope of this function.
    var namespace = runtime.namespace(); // jshint ignore:line
    var context = runtime.getContext(); // jshint ignore:line

    namespace.delete(context, wrapper.name(), true, noop);
    wrapper.server.stop(noop);
  }

  function onserve(err) {
    if (err) {
      return wrapper.emit('error', err);
    }

    wrapper.emit('status', 'served');

    debug('about to glob');

    glob({
      name: wrapper.name(),
      runtime: wrapper.runtime,
      // NOTE: The pattern * only works at a single depth
      pattern: wrapper.prefix + '/*/*'
    })
    .on('error', function(err) {
      wrapper.emit('error', err);
    })
    .pipe(through(function(name, enc, callback) {
      if (name === wrapper.name()) {
        wrapper.emit('status', 'mounted');
        wrapper.emit('mounted');
        return callback();
      } else {
        return callback(null, name);
      }
    }))
    // maybe filter and emit mount before passing to connect stream, getting the
    // first mount is slow
    .pipe(through(function(name, enc, callback) {
      wrapper.connect(name, callback);
    }));
  }
};

// TODO(jasoncampbell): Do a write up about error propagation problems with glob
// streams and the way the promises wrapping hides basic syntax/runtime errors
VanadiumWrapper.prototype.connect = function(name, callback) {
  var wrapper = this;
  var runtime = wrapper.runtime;
  var client = runtime.newClient();
  var context = runtime.getContext();

  callback = callback || function(err) {
    if (err) {
      return wrapper.emit('error', err);
    }
  };

  // TODO(jasoncampbell): it might be a good to actually connect everytime this
  // is called so that it can be used to refresh any caches, this filter logic
  // should get moved somewhere else.
  if (wrapper.peers[name] === 'ignore' || wrapper.peers[name] === 'connected') {
    return callback();
  }

  debug('connecting to %s', name);

  client.bindTo(context, name, onremote);

  function onremote(err, remote) {
    if (err) {
      // It could be a stale entry, if so keep track of it.
      // TODO(jasoncampbell): find the code check this programatically
      if (err.id === 'v.io/v23/verror.NoServers') {
        wrapper.peers[name] = 'ignore';
        return callback();
      } else {
        return callback(err);
      }
    }

    wrapper.peers[name] = 'connected';
    wrapper.emit('connect', name, remote);

    debug('remote connected, announcing %s', name);

    remote.announce(context, wrapper.name(), function(err, response) {
      if (err) {
        return callback(err);
      }

      debug('announced to %s', name);
      debug('response: "%s"', response);
      callback();
    });
  }
};

VanadiumWrapper.prototype.name = function() {
  var wrapper = this;

  assert.ok(wrapper.prefix,
    'wrapper.name() can\'t be called before the Vanadium runtime is available');

  return [
    wrapper.prefix,
    wrapper.options.app,
    wrapper.options.id
  ].join('/');
};

function onstatus(status) {
  debug('status: %s', status);
  this.status = status;
}

// Helper function to return a mountable prefix name from a runtime
function prefix(runtime) {
  return runtime.accountName.replace(/^dev.v.io\/u\//, 'users/');
}

function noop() {}
