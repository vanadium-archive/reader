// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.
var domready = require('domready')
var hg = require('mercury')
var h = require('mercury').h

domready(function ondomready() {
  // Temporary state until components are set up
  var state = hg.state({
    count: hg.value(0),
    channels: {
      click: increment
    }
  })

  hg.app(document.body, state, render);
})

function render(state) {
  return h('.count', {
    'ev-click': hg.send(state.channels.click),
  }, 'Count: ' + state.count)
}

function increment(state) {
  var current = state.count()
  state.count.set(current + 1)
}
