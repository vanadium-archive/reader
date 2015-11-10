// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var document = require('global/document');
var raf = require('raf');

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
  element.setAttribute('class','pdf-canvas');
  widget.update(null, element);
  return element;
};

PDFWidget.prototype.update = function update(previous, element) {
  var widget = this;
  var state = widget.state;
  var pdf = state.pdf;

  if (!pdf || state.progress < 100) {
    return;
  }

  var device;
  var keys = Object.keys(state.devices);
  var length = keys.length;
  for (var i = 0; i < length; i++) {
    var key = keys[i];
    var value = state.devices[key];
    if (value.current) {
      device = value;
      break;
    }
  }

  // Set width to current device width.
  element.width = device ? device.screen.width : element.width;
  render(element, state);
};

var rendering = false;
function render(element, state) {
  if (rendering) {
    raf(render.bind(null, element, state));
    return;
  }

  rendering = true;
  state.pdf.getPage(state.pages.current).then(success, error);

  function success(page) {
    var scale = element.width/page.getViewport(1.0).width;
    var viewport = page.getViewport(scale);
    var context = element.getContext('2d');

    element.height = viewport.height;
    element.width = viewport.width;

    page.render({
      canvasContext: context,
      viewport: viewport
    }).promise.then(done, done);
  }

  function error(err) {
    process.nextTick(function() {
      throw err;
    });
  }
}

function done() {
  rendering = false;
}