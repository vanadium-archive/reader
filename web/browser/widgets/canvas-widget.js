// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var assert = require('assert');
var document = require('global/document');
var queue = require('../dom/raf-queue');

module.exports = CanvasWidget;

// # var widget = CanvasWidget(<draw function>, <state object>)
//
// A virtual-dom widget for creating and managing a canvas element which is
// optimized for high density displays. The constructor takes two arguments:
//
// * draw: Function - called every update/render, the function will be called
// with the arguments `context`, `state`, and `done`.
// * state: Object - the
// state object passed in during virtual-dom creation
//
// This widget is optimized for usage with PDF.js which has an async render
// method. Render updates can happen at about 60 fps so some book keeping needs
// to be done to queue PDF.js render calls to prevent multiple renders from
// happening simultaneously (triggering weird pdf render bugs like upside down
// text etc.). The queueing mechanism is simple but requires the `draw` function
// to fire a callback when it's work is done.
//
// Example:
//
//     var state = {
//       width: window.innerWidth,
//       height: window.innerHeight,
//       ratio: window.devicePixelRatio
//     }
//
//     h('.pdf-viewer', [
//       canvas(draw, state)
//     ]);
//
//     function draw(context, state, done) {
//       // Simulated async method which draws to the canvas context.
//       setTimeout(function(){
//         ctx.fillStyle = 'rgb(200,0,0)'
//         ctx.fillRect(10, 10, 55, 50)
//         done()
//       }, 120)
//     }
//
function CanvasWidget(draw, state) {
  if (!(this instanceof CanvasWidget)) {
    return new CanvasWidget(draw, state);
  }

  assert.ok(state.ratio, 'state.ratio is required');
  assert.ok(state.width, 'state.width is required');
  assert.ok(state.height, 'state.height is required');

  this.draw = draw;
  this.state = state;
}

CanvasWidget.prototype.type = 'Widget';

CanvasWidget.prototype.init = function() {
  var widget = this;
  var canvas = document.createElement('canvas');
  widget.update(null, canvas);
  return canvas;
};

CanvasWidget.prototype.update = function(previous, element) {
  var widget = this;
  var state = widget.state;
  var context = element.getContext('2d');

  // In order to render appropriately on retina devices it is important to
  // increase the size the the canvas element by the `window.devicePixelRatio`
  // and then shrink the element back down to normal size with CSS. This will
  // sharpen the image rendered by the canvas but decrease the rendered size. To
  // get the size of the image back up to where it needs to be the canvas
  // context needs to be scaled up by the `window.devicePixelRatio`. Simple.
  //
  // SEE: http://www.html5rocks.com/en/tutorials/canvas/hidpi/
  //
  // NOTE: This is done on update, which fires for every render call instead of
  // in widget.init(), which will fire only when the element is first created
  // and inserted into the DOM. Allowing this resizing to happen in the render
  // loop makes it possible to handle resize events and update anytime the state
  // values are updated.
  element.width = Math.floor(state.width * state.ratio);
  element.height = Math.floor(state.height * state.ratio);
  element.style.width = Math.floor(state.width) + 'px';
  element.style.height = Math.floor(state.height) + 'px';

  // Scale the canvas to the the correct ratio. This must directly follow
  // resizing.
  context.scale(state.ratio, state.ratio);

  // Queue the widget.draw function into the next available animation frame.
  queue(function worker(done) {
    widget.draw(context, widget.state, done);
  });
};
