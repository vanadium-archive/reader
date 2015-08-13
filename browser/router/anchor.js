// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var hg = require('mercury');
var h = require('mercury').h;
var options = { preventDefault: true };
var href = require('./index').href;
var hashbang = require('./hashbang');

// Create a handle for dom-delegation. This step treats the generated `handle`
// the same as a mercury channel.
var handle = hg.Delegator.allocateHandle(click);

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
  // Ensure that the href has the hashbang boilerplate, this makes ctrl+click
  // open the right url for loading the app in the correct state.
  attributes.href = hashbang(attributes.href);

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
  href.set(data.href);
}
