// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var event = require('synthetic-dom-events');
var query = require('./query');

module.exports = dispatch;

function dispatch(type, selector) {
  var nodes = query(selector);

  if (! (nodes instanceof Array)) {
    nodes = [ nodes ];
  }

  var length = nodes.length;
  for (var i = 0; i < length; i++) {
    nodes[i].dispatchEvent(event(type));
  }
}
