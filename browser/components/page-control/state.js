// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var hg = require('mercury');

module.exports = state;

function state(options) {
  return hg.state({
    pageNum: hg.value(1),
    numPages: hg.value(0),
    channels: {
      next: next,
      prev: prev
    }
  });
}

function next(state, data) {
  if (state.numPages() <= state.pageNum()) {
    return;
  }

  state.pageNum.set(state.pageNum() + 1);
}

function prev(state, data) {
  if (state.pageNum() <= 1) {
    return;
  }

  state.pageNum.set(state.pageNum() - 1);
}
