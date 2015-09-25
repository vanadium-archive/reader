// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var debug = require('debug')('reader:routes');

module.exports = {
  '/#!/': index,
  '/#!/:id': show
};

function index(state, params, route) {
  debug('index');
}

function show(state, params, route) {
  debug('show: %o', params);
}
