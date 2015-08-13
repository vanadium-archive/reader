// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var debug = require('debug')('router');
var EE = require('events').EventEmitter;
var inherits = require('util').inherits;
var spa = require('single-page');
var routes = require('routes');
var hg = require('mercury');
var hashbang = require('./hashbang');
var window = require('global/window');

// The block of code here creates an observable for the current href
//
// NOTE: The check for `window.location` allows tests to run in node. Since
// this code is executing when `require(...)` is called on this module it will
// be executed at startup, the check prevents errors with accessing undefined
// properties on `window.location`.
var pathname = window.location ? window.location.pathname : '';
var current = hashbang(pathname);
var atom = hg.value(current);

module.exports = Router;
module.exports.href = atom;

// The single-page module does not natively support hashbang urls (only
// window.location.pathname) so there are some work arounds to make sure
// everything works as expected:
//
// * `window.addEventListener('hashchange', router);` - For back button support.
// * String routes are prefixed with "/#!"
// * The single-page callback, `router.update(href)` takes special care to
// consider the hashbang prefix.

// The routes module provides a simple way to define patterns that match to
// functions.
//
// SEE: https://www.npmjs.com/package/routes
function Router(state, hash) {
  if (!(this instanceof Router)) {
    return new Router(state, hash);
  }

  var router = this;

  router.state = state;
  router.routes = routes();

  for (var key in hash) { // jshint ignore: line
    router.routes.addRoute(key, hash[key]);
  }

  router.sp = spa(router.update.bind(router));

  // SEE: Router.prototype.handleEvent
  window.addEventListener('hashchange', router);

  atom(function onhref(href) {
    debug('atom update: %s', href);
    href = hashbang(href);
    router.sp.show(href);
  });

  EE.call(router);
}

inherits(Router, EE);

// # router.update(href)
//
// Fired anytime the href is updated (via single-page). This method handles
// href normalizing and route matching based on the hash of functions passed
// in on initialization.
Router.prototype.update = function(href) {
  debug('dom href update: %s', href);

  var router = this;
  var hash = window.location.hash;

  // force initial hashbang in case href is missing it.
  if (href === '/' && ! href.match(hash)) {
    debug('hash mismatch: %s', hash);
    href += hash;
  } else if (href === '/') {
    // At this point it's possible that the `href` is missing the /#!/ and the
    // original `window.location.hash` is empty. In this case update the
    // `href` so that it will match '/#!/' and use `router.sp.push` to update
    // the url without triggering any callbacks.
    href = hashbang(href);
    router.sp.push(href);
  }

  var route = router.routes.match(href);

  if (route) {
    route.fn.call(router, router.state, route.params, route);
  } else {
    router.emit('notfound', href);
  }
};

// # router.handleEvent(event)
//
// Implments the `EventListener` API so that the "hashchange" event can be
// listened to in order to enable the back button with hashbang urls.
//
// SEE: https://mdn.io/EventListener
// SEE: https://mdn.io/WindowEventHandlers/onhashchange
Router.prototype.handleEvent = function(event) {
  if (event.type !== 'hashchange') {
    return;
  }

  var router = this;
  var hash = String(window.location.hash);
  var current = hashbang(hash);

  router.update(current);
};
