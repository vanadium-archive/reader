// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var debug = require('debug')('reader:device-sets');
var device = require('../device');
var deviceSet = require('../device-set');
var format = require('format');
var hg = require('mercury');
var window = require('global/window');

module.exports = {
  render: require('./render'),
  state: state
};

function state(options) {
  options = options || {};

  debug('init: %o', options);

  var atom = hg.state({
    error: hg.value(null),
    current: hg.value(null),
    collection: hg.varhash(options.collection || {}, deviceSet.state),
    channels: {
      add: add,
      remove: remove
    }
  });

  return atom;
}

function add(state, data) {
  if (! data.blob) {
    return;
  }

  var blob = data.blob;

  debug('adding new device set for file: %o', blob);

  if (blob.type !== 'application/pdf') {
    var message = format('The file "%s" is not a PDF.', blob.name);
    var err = new Error(message);
    return state.error.set(err);
  }

  var ds = deviceSet.state({
    file: { blob: data.blob }
  });

  var d = device.state({
    type: 'Browser',
    current: true,
    arch: window.navigator.platform,
    screen: {
      width: window.innerWidth,
      height: window.innerHeight,
    }
  });

  ds.devices.put(d.id(), d);
  state.collection.put(ds.id(), ds);
}

function remove(state, data) {
  state.collection.delete(data.id);
}
