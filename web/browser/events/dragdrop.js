// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var hg = require('mercury');
var BaseEvent = require('mercury').BaseEvent;

module.exports = BaseEvent(dragHandler); // jshint ignore:line

function dragHandler(ev, broadcast) {
  var delegator = hg.Delegator();
  var events = ['dragstart', 'dragenter', 'dragover', 'drop',
                'dragend', 'dragleave'];

  function onstart(ev2) {
    // get the dataTransfer object out of the underlying event
    var dt = ev2._rawEvent.dataTransfer;

    // Set the data type to something unique to ensure our device cannot
    // be dragged to anything else.  Despite the name, no real data is
    // being transferred here.
    dt.setData('application/vnd.vanadium.device', 'vanadium device');

    // Set the drag effect
    dt.effectAllowed = 'move';

    // Remove the drag start listener
    delegator.removeGlobalEventListener('dragstart', onstart);
  }

  function oncomplete(ev2) {
    // Merges passed in data and broadcasts
    broadcast(this.data);

    events.forEach(function(arg) { delegator.unlistenTo(arg); });
    delegator.removeGlobalEventListener('mouseup', oncomplete);
    delegator.removeGlobalEventListener('dragend', oncomplete);
    delegator.removeGlobalEventListener('dragstart', onstart);
  }

  events.forEach(function(arg) { delegator.listenTo(arg); });
  delegator.addGlobalEventListener('dragstart', onstart);
  delegator.addGlobalEventListener('mouseup', oncomplete);
  delegator.addGlobalEventListener('dragend', oncomplete);
}
