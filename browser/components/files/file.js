// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var hg = require('mercury');
var h = require('mercury').h;
var debug = require('debug')('reader:file');
var anchor = require('../../router/anchor');
var format = require('format');
var click = require('../../events/click');
var assert = require('assert');

// TODO(jasoncampbell): break this into it's own module/component.
module.exports = {
  state: state,
  render: render
};

function state(options, key) {
  debug('creating new file state: %s - %o', key, options);

  // If the blob was created in this application instance it will be a File
  // object and have a name attribute. If it was created by a peer it will
  // manifest locally as a Blob object (Files can't be directly constructed).
  //
  // SEE: https://developer.mozilla.org/en-US/docs/Web/API/File
  assert.ok(options.blob, 'options.blob is required');

  return hg.struct({
    hash: options.hash || key,
    title: options.title || options.blob.name || '',
    blob: options.blob
  });
}

// Assumes it's being called as an array iterator with the thisArg set to this
// component's parent channels attribute.
// SEE: https://goo.gl/tu7srT
function render(file, index, collection) {
  var channels = this;

  return h('.file', [
    h('h2.type-title', [
      anchor({
        href: format('/%s', file.hash)
      }, file.title)
    ]),
    h('p.type-caption', [
      h('span', format('%s - %s ', file.blob.type, file.hash)),
      h('a.delete', {
        href: '#',
        'ev-click': click(channels.remove, { hash: file.hash })
      }, 'DELETE')
    ]),
  ]);
}
