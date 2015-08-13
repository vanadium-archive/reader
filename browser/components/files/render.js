// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var hg = require('mercury');
var h = require('mercury').h;
var toArray = require('../../util').toArray;
var insert = require('insert-css');
var css = require('./index.css');
var file = require('./file');

module.exports = render;

function render(state, channels) {
  insert(css);

  var children = toArray(state.collection).map(file.render);

  if (children.length === 0) {
    children = [ hg.partial(blank) ];
  }

  return h('.files', children);
}

function blank() {
  return h('.blank-slate', 'Add a new PDF file below to get started.');
}
