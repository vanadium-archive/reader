// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var domready = require('domready')
var hg = require('mercury')
var h = require('mercury').h
var filePicker = require('./components/file-picker')
var pageControls = require('./components/page-control')
var pdf = require('./components/pdf')

domready(function ondomready() {
  // Top level state.
  var state = hg.state({
    pdf: pdf.state(),
    pageControls: pageControls.state()
  })

  // Connect component states together
  state.pdf.pdf(function (newPDF) {
    if (newPDF != null) {
      state.pageControls.numPages.set(newPDF.numPages)
      state.pageControls.pageNum.set(1)
    } else {
      state.pageControls.numPages.set(0)
    }
  })

  state.pageControls.pageNum(function (newPageNum) {
    if (state.pdf.pdf != null) {
      state.pdf.pageNum.set(newPageNum)
    }
  })

  hg.app(document.body, state, render);
})

function render(state) {
  if (state.pdf.pdf == null) {
    return h('div', [
      hg.partial(filePicker.render, state.pdf, state.pdf.channels)
    ])
  } else {
    return h('div', [
      // hg.partial(filePicker.render, state.pdf, state.pdf.channels),
      hg.partial(pageControls.render, state.pageControls, state.pageControls.channels),
      hg.partial(pdf.render, state.pdf, state.pdf.channels)
    ])
  }
}
