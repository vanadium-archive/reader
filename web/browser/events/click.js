// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.
var hg = require('mercury');
var options = { preventDefault: true };

module.exports = click;

function click(sink, data) {
  return hg.sendClick(sink, data, options);
}
