// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var window = require('global/window');
window.debug = require('debug');
var debug = require('debug')('reader:index');
var domready = require('domready');
var hg = require('mercury');
var h = require('mercury').h;
var filePicker = require('./components/file-picker');
var pageControls = require('./components/page-control');
var pdf = require('./components/pdf');
var constellation = require('./components/constellation');
var vanadium = require('./vanadium');

domready(function ondomready() {
  debug('domready');

  // Top level state.
  var state = hg.state({
    pdf: pdf.state(),
    pageControls: pageControls.state(),
    constellation: constellation.state(),
    error: hg.value(null)
  });

  // TODO(jasoncampbell): add an error component for aggregating, logging, and
  // displaying errors in the UI.
  state.constellation.error(function(err) {
    throw err;
  });

  // Connect component states together
  state.pdf.pdf(function (newPDF) {
    if (newPDF !== null) {
      state.pageControls.numPages.set(newPDF.numPages);
      state.pageControls.pageNum.set(1);
    } else {
      state.pageControls.numPages.set(0);
    }
  });

  state.pageControls.pageNum(function (newPageNum) {
    if (state.pdf.pdf !== null) {
      state.pdf.pageNum.set(newPageNum);
    }
  });

  // The vanadium client is coupled to the application state here so that async
  // code paths in the ./vanadium modules can be isolated to the application
  // initialization. This allows components to be separately tested/interacted
  // with as mappings between data and UI without being tangled into the
  // local vanadium discovery process.
  vanadium(state.constellation);

  hg.app(document.body, state, render);
});

function render(state) {
  if (state.pdf.pdf === null) {
    return h('div', [
      hg.partial(filePicker.render, state.pdf, state.pdf.channels),
      hg.partial(constellation.render, state.constellation)
    ]);
  } else {
    return h('div', [
      // hg.partial(filePicker.render, state.pdf, state.pdf.channels),
      hg.partial(pageControls.render,
          state.pageControls,
          state.pageControls.channels),
      hg.partial(pdf.render, state.pdf, state.pdf.channels),
      hg.partial(constellation.render, state.constellation)
    ]);
  }
}
