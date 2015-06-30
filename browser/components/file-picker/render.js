// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var hg = require('mercury')
var h = require('mercury').h
var sendFile = require('../../events/send-file')

module.exports = render

function render(state, channels) {
  return h('.file-picker', [
    h('input', {
      type: 'file',
      'ev-event': sendFile(channels.set)
    })
  ])
}
