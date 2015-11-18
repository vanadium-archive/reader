// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var BaseEvent = require('mercury').BaseEvent;
var extend = require('xtend');
var hg = require('mercury');

// Listen to the low frequency, drop related events.
var delegator = hg.Delegator();
delegator.listenTo('dragenter');
delegator.listenTo('dragleave');
delegator.listenTo('drop');

module.exports = BaseEvent(handleDrop); // jshint ignore:line

// # var drop = require('./events/drop')
//
// Use as a drop event handler in virtual-dom using ev-event or ev-dragenter.
//
//     h('.drop-here', {
//       'ev-event': drop(sink, data)
//     })
//
// The drop handler will only broadcast on a successful drop and will send a
// merged data object containing any dragged data added by any drag handlers.
function handleDrop(ev, broadcast) {
  // Only handle dragenter events, allows usage of ev-events for simplicity.
  if (ev.type !== 'dragenter') {
    return;
  }

  var element = ev.target;
  var data = this.data;

  delegator.listenTo('dragover');
  delegator.addEventListener(element, 'dragover', dragover);
  delegator.addEventListener(element, 'dragleave', dragleave);
  delegator.addEventListener(element, 'drop', drop);

  // Attached to the dragover event, this handler fires every few hundred ms.
  // SEE: https://developer.mozilla.org/en-US/docs/Web/Events/dragover
  function dragover(event) {
    // Prevent default in order to allow/enable the drop event to fire.
    event.preventDefault();
  }

  // Fires on on drop, will broadcast dropped data and detach all listeners.
  // SEE: https://developer.mozilla.org/en-US/docs/Web/Events/drop
  function drop(event) {
    var raw = event._rawEvent;
    var json = raw.dataTransfer.getData('application/json');
    var dropped;

    try {
      dropped = JSON.parse(json);
    } catch (e) {
      throw new Error('Error parsing JSON "' + json + '"');
    }

    // Since the passed data is derived from application state it is given
    // precedence over the dataTransfer.
    broadcast(extend(dropped, data));
    dragleave(event);
  }

  // Fired when dragging is no longer over the droptarget.
  // SEE: https://developer.mozilla.org/en-US/docs/Web/Events/dragleave
  function dragleave(event) {
    delegator.unlistenTo('dragover');
    delegator.removeEventListener(element, 'dragover', dragover);
    delegator.removeEventListener(element, 'dragleave', dragleave);
    delegator.removeEventListener(element, 'drop', drop);
  }
}

