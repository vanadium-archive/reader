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
var vanadium = require('./components/vanadium');

domready(function ondomready() {
  debug('domready');

  // Top level state.
  var state = hg.state({
    pdf: pdf.state(),
    pageControls: pageControls.state(),
    vanadium: vanadium.state()
  });

  // TODO(jasoncampbell): add an error component for aggregating, logging, and
  // displaying errors in the UI.
  state.vanadium.error(function(err) {
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

  hg.app(document.body, state, render);
});

function render(state) {
  if (state.pdf.pdf === null) {
    return h('div', [
      hg.partial(filePicker.render, state.pdf, state.pdf.channels),
      hg.partial(vanadium.render, state.vanadium, state.vanadium.channels)
    ]);
  } else {
    return h('div', [
      // hg.partial(filePicker.render, state.pdf, state.pdf.channels),
      hg.partial(pageControls.render,
          state.pageControls,
          state.pageControls.channels),
      hg.partial(pdf.render, state.pdf, state.pdf.channels),
      hg.partial(vanadium.render, state.vanadium, state.vanadium.channels)
    ]);
  }
}
