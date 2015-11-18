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

module.exports = BaseEvent(handleDragover); // jshint ignore:line

function handleDragover(ev, broadcast) {
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

  broadcast(extend(data, {
    dragging: true
  }));

  return;

  // Attached to the dragover event, this handler fires every few hundred ms.
  // SEE: https://developer.mozilla.org/en-US/docs/Web/Events/dragover
  function dragover(event) {
    // Prevent default in order to allow/enable the drop event to fire.
    event.preventDefault();
  }

  function dragleave(event) {
    delegator.unlistenTo('dragleave');
    delegator.removeEventListener(element, 'dragover', dragover);
    delegator.removeEventListener(element, 'dragleave', dragleave);
    delegator.removeEventListener(element, 'drop', drop);

    broadcast(extend(data, {
      dragging: false
    }));
  }

  function drop(event) {
    dragleave(event);
  }
}

