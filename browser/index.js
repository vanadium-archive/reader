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
var peers = require('./components/peers');

domready(function ondomready() {
  debug('domready');

  // Top level state.
  var state = hg.state({
    pdf: pdf.state(),
    pageControls: pageControls.state(),
    peers: peers.create()
  });

  // TODO(jasoncampbell): add an error component for aggregating, logging, and
  // displaying errors in the UI.
  state.peers.error(function(err) {
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

  // TODO(jasoncampbell): Add/couple Vanadium functionality to the state here
  // instead of inside the peers component so that async paths which are hard to
  // test/stub can be isolated to the application initialization.

  hg.app(document.body, state, render);
});

function render(state) {
  if (state.pdf.pdf === null) {
    return h('div', [
      hg.partial(filePicker.render, state.pdf, state.pdf.channels),
      hg.partial(peers.render, state.peers, state.peers.channels)
    ]);
  } else {
    return h('div', [
      // hg.partial(filePicker.render, state.pdf, state.pdf.channels),
      hg.partial(pageControls.render,
          state.pageControls,
          state.pageControls.channels),
      hg.partial(pdf.render, state.pdf, state.pdf.channels),
      hg.partial(peers.render, state.peers, state.peers.channels)
    ]);
  }
}
