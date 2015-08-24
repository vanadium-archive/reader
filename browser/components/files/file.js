// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var h = require('mercury').h;
var debug = require('debug')('reader:file');
var anchor = require('../../router/anchor');
var format = require('format');

module.exports = {
  state: state,
  render: render
};

function state(blob, key) {
  debug('creating file: %o', arguments);

  // NOTE: blob is a File object
  // SEE: https://developer.mozilla.org/en-US/docs/Web/API/File
  // NOTE: blob.lastModifiedDate will always be the last db access time, we will
  // need to track and modify update times manually.
  return {
    uuid: key,
    // TODO: Make title editable.
    title: blob.name,
    blob: blob
  };
}

function render(file) {
  return h('.file', [
    anchor({
      href: format('/%s', file.uuid)
    }, [
      h('h2.type-title', file.title),
      h('p.type-caption', format('%s - %s', file.blob.type, file.uuid))
    ])
  ]);
}
