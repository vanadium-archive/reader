// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var BaseEvent = require('mercury').BaseEvent;
var extend = require('xtend');
var hg = require('mercury');

var delegator = hg.Delegator();

// Listen to the low frequency, drag related events. The high frequency "data"
// event is managed directly during event registration and removal in the drag
// handler.
delegator.listenTo('dragstart');
delegator.listenTo('dragend');

module.exports = BaseEvent(handleDrag); // jshint ignore:line

// # var drag = require('./events/drag')
//
// Use as a drag handler in virtual-dom using either ev-event or ev-mousedown.
// NOTE: The `draggable` attribute must be set to true on the vnode.
//
//     h('.drag-me', {
//       draggable: true,
//       'ev-event': drag(sink, { foo: 'bar' })
//     })
//
// The `drag` handler will manage all event registration and listening across
// the lifespan of dragging on the target element. The broadcast to the `sink`
// will happen with an extra attribute merged into the passed in data:
//
// * dragstart: { dragging: true }
// * dragend: { dragging: false }
//
// Additionally, on the dragstart event any passed in data will be JSON encoded
// and attached to the native event's dataTransfer object. This enables it's
// retrieval from the drop DOM event (handled by `./events/drop`).
//
// NOTE: Currently this handle does not broadcast on high-frequency drag events,
// the necessary code has been stubbed out below for easy modification in the
// future.
function handleDrag(ev, broadcast) {
  // Only handle mousedown events, allows usage of ev-events for simplicity.
  if (ev.type !== 'mousedown') {
    return;
  }

  var data = this.data;
  var element = ev.target;

  delegator.listenTo('drag');
  delegator.addEventListener(element, 'dragstart', dragstart);
  delegator.addEventListener(element, 'drag', drag);
  delegator.addEventListener(element, 'dragend', dragend);

  // NOTE: Do not broadcast until the actual drag events have been fired.
  return;

  // Fired when the user starts dragging the target element.
  // SEE: https://developer.mozilla.org/en-US/docs/Web/Events/dragstart
  function dragstart(event) {
    // Using the raw DOM Event to access the DataTransfer object to set
    // draggable data and the drag effect. This makes it possible for drop
    // targets to access the data later.
    //
    // NOTE: dragover events do not have access to the data set below.
    // SEE: https://goo.gl/fpwfP3
    var raw = event._rawEvent;
    raw.dataTransfer.setData('application/json', JSON.stringify(data));
    raw.dataTransfer.effectAllowed = 'move';

    broadcast(extend(data, { dragging: true }));
  }

  // Fires when the element is being dragged every few hundred ms. Currently a
  // noop.
  // SEE: https://developer.mozilla.org/en-US/docs/Web/Events/drag
  function drag(event) {}

  // Fired when dragging has ended.
  // SEE: https://developer.mozilla.org/en-US/docs/Web/Events/dragend
  function dragend(event) {
    delegator.unlistenTo('drag');
    delegator.removeEventListener(element, 'dragstart', dragstart);
    delegator.removeEventListener(element, 'drag', drag);
    delegator.removeEventListener(element, 'dragend', dragend);

    broadcast(extend(data, { dragging: false }));
  }
}
