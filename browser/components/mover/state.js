// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var hg = require('mercury');
var debug = require('debug')('reader:mover');

module.exports = create;

function create(options) {
  debug('creating Mover state: %o', options);

  var state = hg.state({
    error: hg.value(null),
    moving: hg.value(false),
    movingThisDevice: hg.value(false),
    insertAtIndex: hg.value(-1),
    highlightAtIndex: hg.value(-1),
    channels: {
      // User clicks to add/move the device before this one
      before: previous,
      // User clicks to add/move the device after this one
      after: next,
      // User clicks the cancel button
      cancel: cancel,
      // User selects location for new device manually (only on moving device)
      selected: link,
      // User clicks ok after selecting a new device location
      commit: commit,
      // Drop target channels
      dragenter: highlightTarget,
      dragleave: unhighlightTarget,
      // 'dragenter' and 'dragover' events that occur on valid drop targets
      // need to have event.preventDefault() called.  This happens in the
      // droptarget event handler, which then broadcasts to a channel.
      // In the case of dropover, nothing else needs to happen, thus the
      // need for this channel handler.
      dragover: noop,
      // 'dragend' is also caught by the dragdrop event handler and broadcast
      // to a channel, but we do not currently have anything to do when this
      // happens.  A successful drop is handled by the drop event, which is
      // communicated via the commit channel.
      dragend: noop
    },
    // These states should be linked into syncbase, but are here now until
    // that's ready
    numDevicesInLinkedSet: hg.value(4),
    firstPageNum: hg.value(2)
  });

  state.error(function(err) {
    if (!err) {
      return;
    }

    console.error('TODO: add an error component');
    console.error(err.stack);
  });

  return state;
}

function previous(state, data) {
  // TODO(jwnichols): This result of this decision needs to be determined and
  // then echoed to other devices
  state.moving.set(false);
}

function next(state, data) {
  // TODO(jwnichols): This result of this decision needs to be determined and
  // then echoed to other devices
  state.moving.set(false);
}

function cancel(state, data) {
  // Leave the move state without making any changes
  // TODO(jwnichols): This may need to be echoed to other devices
  state.moving.set(false);
}

function link(state, data) {
  if (data.index > state.numDevicesInLinkedSet()) {
    state.insertAtIndex.set(-1);
  } else {
    state.insertAtIndex.set(data.index);
  }
}

function commit(state, data) {
  // TODO(jwnichols): This result of this decision needs to be determined and
  // then echoed to other devices
  state.moving.set(false);
}

function highlightTarget(state, data) {
  state.highlightAtIndex.set(data.index);
}

function unhighlightTarget(state, data) {
  state.highlightAtIndex.set(-1);
}

function noop(state, data) {
  // The equivalent of a dev/null channel method
}
