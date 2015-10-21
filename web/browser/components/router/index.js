// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var debug = require('debug')('reader:component:router');
var document = require('global/document');
var format = require('format');
var hashbang = require('./hashbang');
var hg = require('mercury');
var parse = require('url').parse;
var pathToRegexp = require('path-to-regexp');
var qs = require('qs');
var source = require('geval/source');
var window = require('global/window');

var href = hg.value('');

module.exports = {
  state: state,
  render: render,
  href: href
};

function state(map) {
  debug('initializing: %o', map);

  var atom = hg.state({
    href: hg.value(''),
    route: hg.struct({}),
    routes: [],
    channels: {
      match: match
    }
  });

  for (var key in map) { // jshint ignore: line
    var keys = [];

    atom.routes.push({
      pattern: (key === '*') ? '(.*)' : key, // "*" should be greedy.
      keys: keys,
      re: pathToRegexp(key, keys),
      fn: map[key]
    });
  }

  // Treat changes to window.location as a user event which should trigger the
  // match channel.
  popstate(function onpopstate(href) {
    match(atom, { href: href });
  });

  // Changes to atom.href should be reflected in the url bar.
  atom.href(function onhref(href) {
    window.history.pushState(null, document.title, href);
  });

  // Bind the shared href atom used in ./anchor to this component's match
  // channel.
  module.exports.href(function onhref(href) {
    match(atom, { href: href });
  });

  // Fire the initial route on initialization.
  debug('firing initial route');
  match(atom, {
    href: String(document.location.href)
  });

  return atom;
}

function render(state) {
  // Safely map arguments without deoptimizing the render function.
  // SEE: http://git.io/XTo7TQ
  var length = arguments.length - 1;
  var args = new Array(length);
  for (var i = 0; i < length; i++) {
    args[i] = arguments[i + 1];
  }

  var route = state.route;

  // Append params and route to the end of the arguments and call the current
  // route's render function.
  args.push(route.params);
  args.push(route);

  return route.fn.apply(null, args);
}

function match(state, data) {
  debug('channel: match %s', data.href);

  if (state.href() === data.href) {
    debug('no update to href, skipping');
    return;
  }

  var routes = state.routes;
  var url = parse(data.href);
  var hash = (url.hash) ? url.hash : hashbang(url.pathname);

  var href = require('url').format({
    protocol: url.protocol,
    host: url.host,
    pathname: '/',
    hash: hash
  });

  state.href.set(href);

  var length = routes.length;
  var _match;

  for (var i = 0; i < length; i++) {
    var route = routes[i];
    _match = hash.match(route.re);

    if (!_match) {
      continue;
    }

    var result = {
      route: route.pattern,
      fn: route.fn,
      query: qs.parse(url.query),
      params: {}
    };

    var ki = route.keys.length;
    while (ki--) {
      var key = route.keys[ki].name;
      var value = _match[ki+1];
      result.params[key] = value;
    }

    state.route.set(result);

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
