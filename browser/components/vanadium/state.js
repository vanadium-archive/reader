// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var vanadium = require('../../vanadium')
var debug = require('debug')('reader:vanadium:state')
var hg = require('mercury')
var uuid = require('uuid')
var format = require('format')

module.exports = create

// Create state for the Vanadium component
function create(options) {
  debug('initialize state')

  var state = hg.state({
    error: hg.value(null),
    id: hg.value(null),
    status: hg.value(''),
    peers: hg.varhash({}),
    channels: {
    }
  })

  var config = {
    app: 'reader-example',
    id: uuid.v4()
  }

  vanadium(config)
  .on('error', function(err) {
    state.error.set(err)
  })
  .on('status', function(status) {
    state.status.set(status)
  })
  .on('name', function(name) {
    state.id.set(name)
  })
  .on('connect', function(name, service) {
    debug('connect :D %s %o', name, service)
    // NOTE: objects in the varhash might be better off as components depending
    // on how they need to be interacted with...
    state.peers.put(name, service)
  })

  return state
}
