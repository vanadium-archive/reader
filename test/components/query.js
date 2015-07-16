// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var document = require('global/document');
var separators = [ '.', '#' ];

module.exports = query;

function query(selector) {
  if (typeof selector !== 'string') {
    throw new Error('selector must be a string');
  }

  // TODO(jasoncampbell): guard against selectors that go more than one depth.

  var separator;
  var length = separators.length;
  for (var i = 0; i < length; i++) {
    if (selector.indexOf(separators[i]) > -1) {
      separator = separators[i];
      break;
    }
  }

  var results;
  switch (separator) {
    case '.':
      var className = selector.replace(separator, '');
      results = document.getElementsByClassName(className);
      break;
    case '#':
      var id = selector.replace(separator, '');
      results = document.getElementById(id);
      break;
    default:
      results = document.getElementsByTagName(selector);
  }

  return results;
}
