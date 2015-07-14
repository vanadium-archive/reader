// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var hg = require('mercury');

module.exports = state;

function state(options) {
  return hg.state({
    pdf: hg.value(null),
    pageNum: hg.value(1),
    channels: {
      set: set
    }
  });
}

function set(state, data) {
  if (!data.file) {
    return;
  }

  var file = data.file;
  var transport = new PDFJS.PDFDataRangeTransport();
  var source = {
    length: file.size
  };

  // SEE: https://jsfiddle.net/6wxnd9uu/6/
  transport.count = 0;
  transport.file = file;
  transport.length = file.size;
  transport.requestDataRange = requestDataRange;

  function requestDataRange(begin, end) {
    var blob = this.file.slice(begin, end);
    var fileReader = new FileReader();

    fileReader.onload = function onload() {
      transport.count += end - begin;
      transport.onDataRange(begin, new Uint8Array(this.result));
    };

    fileReader.readAsArrayBuffer(blob);
  }

  PDFJS
  .getDocument(source, transport, password, progress)
  .then(success, error);

  function password() {
    throw new Error('Password required');
  }

  function progress() {
  }

  function success(pdf) {
    state.pdf.set(pdf);
    state.pageNum.set(1);
  }

  function error(err) {
    throw err;
  }
}
