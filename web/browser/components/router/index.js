// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var debug = require('debug')('reader:router');
var document = require('global/document');
var extend = require('xtend');
var format = require('format');
var hashbang = require('./hashbang');
var hg = require('mercury');
var parse = require('url').parse;
var pathToRegexp = require('path-to-regexp');
var qs = require('qs');
var source = require('geval/source');
var window = require('global/window');

module.exports = {
  state: state
};

function state(options) {
  options = extend({ routes: {} }, options);
  debug('init: %o', options);

  var atom = hg.state({
    routes: hg.varhash({}),
    href: hg.value(options.href || ''),
    query: hg.value(null),
    params: hg.value({}),
    route: hg.value(null)
  });

  // Map keys in options.routes and map to regular expresions which can be
  // matched against later.
  for (var key in options.routes) { // jshint ignore: line
    var pattern = options.routes[key];
    var keys = [];

    // The pattern "*" should be greedy.
    var path = (pattern === '*') ? '(.*)' : pattern;

    atom.routes.put(key, {
      pattern: pattern,
      keys: keys,
      re: pathToRegexp(path, keys)
    });
  }

  // Treat changes to window.location as a user event which should trigger the
  // match channel.
  popstate(function onpopstate(href) {
    match(atom, { href: href });
  });

  debug('firing initial route');
  match(atom, {
    href: String(document.location.href)
  });

  return atom;
}

function match(state, data) {
  if (state.href() === data.href) {
    debug('no update to href, skipping');
    return;
  }

  var url = parse(data.href);
  var hash = (url.hash) ? url.hash : hashbang(url.pathname);

  var href = require('url').format({
    protocol: url.protocol,
    host: url.host,
    pathname: '/',
    hash: hash
  });

  state.href.set(href);

  var routes = state.routes();
  var keys = Object.keys(routes);
  var length = keys.length;
  var _match;

  for (var i = 0; i < length; i++) {
    var key = keys[i];
    var route = state.routes.get(key);
    _match = hash.match(route.re);

    if (!_match) {
      continue;
    }

    state.query.set(qs.parse(url.query));
    state.route.set(route.pattern);

    var params = {};
    var ki = route.keys.length;
    while (ki--) {
      var param = route.keys[ki].name;
      var value = _match[ki+1];
      params[param] = value;
    }

    state.params.set(params);

    break;
  }

  if (! _match) {
    var template = 'No route defined for "%s". To prevent this error add a' +
      'route for "*" .';
    throw new Error(format(template, data.href));
  }
}

function popstate(listener) {
  var event = source(lambda);

  event(listener);

  function lambda(broadcast) {
    window.addEventListener('popstate', function(event) {
      var href = String(document.location.href);
      broadcast(href);
    });
  }
}
