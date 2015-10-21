// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var hg = require('mercury');
var h = require('mercury').h;
var href = require('./index').href;
var url = require('url');
var document = require('global/document');
// var hashbang = require('./hashbang');

// Create a handle for dom-delegation. This step treats the generated `handle`
// the same as a mercury channel.
var handle = hg.Delegator.allocateHandle(click);
var options = { preventDefault: true };

module.exports = anchor;

// # anchor(attributes, text)
//
// Helper for creating virtual-dom anchors that trigger route changes. All
// event/DOM delegation and router coupling are handled in this function
// so that any anchor tags can be simply created with:
//
//     h('p', [
//       anchor({ href: '/some-url' }, 'Click me!');
//     ]);
//
// Clicking the generated link will fire the callbacks in the router and have
// the application state update appropriately.
function anchor(attributes, text) {
  attributes['ev-click'] = hg.sendClick(handle, {
    href: attributes.href
  }, options);

  return h('a', attributes, text);
}

// # click(data)
//
// Used as a mercury channel to update the current route using the exported
// `router.href` observable.
function click(data) {
  var current = String(document.location.href);
  var destination = url.resolve(current, data.href);
  href.set(destination);
}
