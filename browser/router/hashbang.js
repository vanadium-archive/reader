// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

module.exports = hashbang;

// # hashbang(href)
//
// Convert an href to a hashbang url.
//
//     var href = hashbang('/foo')
//     //=> href === '/#!/foo'
//
// Returns a "/#!" prefixed href.
function hashbang(string) {
  string = string || '';

  // trim leading slash
  var href = string.replace(/^\//, '');

  if (! href.match(/^\#\!/)) {
    // add the hashbang
    href = '#!/' + href;
  }

  // add leading slash
  href = '/' + href;

  return href;
}
