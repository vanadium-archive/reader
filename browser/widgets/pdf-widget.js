// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

module.exports = PDFWidget;

// TODO(jasoncampebll): add verification for pdf object
function PDFWidget(state) {
  if (!(this instanceof PDFWidget)) {
    return new PDFWidget(state);
  }

  this.state = state;
}

PDFWidget.prototype.type = 'Widget';

PDFWidget.prototype.init = function init() {
  var widget = this;
  var element = document.createElement('canvas');

  widget.update(null, element);
  return element;
};

PDFWidget.prototype.update = function update(previous, element) {
  var widget = this;
  var state = widget.state;
  var pdf = state.pdf;

  if (!pdf) {
    return;
  }

  // TODO(jasoncampbell): It would be better to have this operation in a
  // different place and only have this widget handle the render aspect of the
  // page.
  pdf.getPage(state.pages.current).then(success, error);

  function success(page) {
    var viewport = page.getViewport(state.scale);
    var context = element.getContext('2d');

    element.height = viewport.height;
    element.width = viewport.width;

    page.render({
      canvasContext: context,
      viewport: viewport
    });
  }

  function error(err) {
    process.nextTick(function() {
      throw err;
    });
  }
};
