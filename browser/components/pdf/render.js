// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var h = require('mercury').h;
var PDFWidget = require('../../widgets/pdf-widget');

module.exports = render;

function render(state, channels) {
  return h('.pdf', [
    new PDFWidget(state.pdf, state.pageNum)
  ]);
}
