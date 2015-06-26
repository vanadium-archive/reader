// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.
module.exports = PDFWidget

// TODO(jasoncampebll): add verification for pdf object
function PDFWidget(pdf) {
  if (!(this instanceof PDFWidget)) {
    return new PDFWidget(pdf);
  }

  this.pdf = pdf
}

PDFWidget.prototype.type = 'Widget';

PDFWidget.prototype.init = function init() {
  var widget = this
  var element = document.createElement('canvas')

  widget.update(null, element)
  return element;
}

PDFWidget.prototype.update = function update(previous, element) {
  var widget = this
  var pdf = widget.pdf

  if (!pdf) {
    return
  }

  console.log('pdf', pdf)

  pdf.getPage(1).then(function(page) {
    var scale = 1.5
    var viewport = page.getViewport(scale)
    var context = element.getContext('2d')

    element.height = viewport.height
    element.width = viewport.width

    page.render({
      canvasContext: context,
      viewport: viewport
    })
  })
}
