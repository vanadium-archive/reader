// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var domready = require('domready')
var hg = require('mercury')
var h = require('mercury').h
var pdf = require('./components/pdf')

domready(function ondomready() {
  // Top level state.
  var state = hg.state({
    pdf: pdf.state()
  })

  hg.app(document.body, state, render);
})

function render(state) {
  return h('div', [
    hg.partial(pdf.render, state.pdf, state.pdf.channels)
  ])
}
