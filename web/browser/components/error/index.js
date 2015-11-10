// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var hg = require('mercury');

module.exports = {
  state: state,
  render: require('./render')
};

function state(options) {
  options = options || {};

  var atom = hg.state({

  });

  return atom;
}
