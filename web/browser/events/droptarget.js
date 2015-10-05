// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var BaseEvent = require('mercury').BaseEvent;

module.exports = BaseEvent(dropTargetHandler); // jshint ignore:line

function dropTargetHandler(ev, broadcast) {
  // Get the dataTransfer object out of the underlying event
  var dt = ev._rawEvent.dataTransfer;

  // Only fire this event if a Vanadium device is being dragged
  if (dt.types.indexOf('application/vnd.vanadium.device') >= 0) {
    ev.preventDefault();
    broadcast(this.data);
  }
}
