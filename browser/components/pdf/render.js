// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var hg = require('mercury')
var h = require('mercury').h
var PDFWidget = require('../../widgets/pdf-widget')
var sendFile = require('../../events/send-file')

module.exports = render

function render(state, channels) {
  return h('.pdf', [
    hg.partial(controls, state, channels),
    PDFWidget(state.pdf)
  ])
}

// TODO(jasoncampebll): split this out into it's own component
function controls(state, channels) {
  return h('.controls', [
    h('input', {
      type: 'file',
      'ev-event': sendFile(channels.set)
    })
  ])
}
