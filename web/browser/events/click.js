// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var defaults = { preventDefault: true };
var extend = require('xtend');
var hg = require('mercury');

module.exports = click;

function click(sink, data, options) {
  options = extend(defaults, options);
  return hg.sendClick(sink, data, options);
}
