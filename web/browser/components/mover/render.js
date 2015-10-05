// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var hg = require('mercury');
var h = require('mercury').h;
var insert = require('insert-css');
var css = require('./index.css');
var dragdrop = require('../../events/dragdrop');
var droptarget = require('../../events/droptarget');

module.exports = render;

function render(state, channels) {
  insert(css);

  var moving = state.moving;
  var movingThisDevice = state.movingThisDevice;

  return h('.moveOverlay', {
      hidden: !moving,
    }, [
    h('.overlayBackground', [
      movingThisDevice ?
        hg.partial(moveThisDeviceControls, state, channels) :
        hg.partial(moveOtherDeviceControls, state, channels)
    ])
  ]);
}

function moveOtherDeviceControls(state, channels) {
  return h('.movingOtherDevice', [
    h('button.addBeforeButton .addButton', {
      'ev-click': hg.send(channels.before)
    }, '+'),
    h('button.textButton .cancelBeforeAfterButton', {
      'ev-click': hg.send(channels.cancel)
    }, 'Cancel'),
    h('button.addAfterButton .addButton', {
      'ev-click': hg.send(channels.after)
    }, '+')
  ]);
}

function moveThisDeviceControls(state, channels) {
  var numDevicesInLinkedSet = state.numDevicesInLinkedSet;
  var firstPageNum = state.firstPageNum;
  var insertAtIndex = state.insertAtIndex;
  var highlightAtIndex = state.highlightAtIndex;

  var deviceTargetArray = [];
  // This is Used to adjust page numbers of devices after an insert
  var newPageOffset = 0;

  // Create a move target and device tile for each device already in the set
  for(var i = 0; i < numDevicesInLinkedSet; i++) {
    if (i === insertAtIndex) {
      // As long as the first page isn't page 1, put the new device before
      // the first device page
      var devicePageNum = firstPageNum + i;
      if (i === 0 && firstPageNum !== 1) {
        devicePageNum = firstPageNum - 1;
      } else {
        newPageOffset = 1;
      }
      deviceTargetArray.push(moveDevice(String(devicePageNum), channels));
    } else {
      deviceTargetArray.push(moveTarget(i,
                             (i === highlightAtIndex),
                             channels));
    }
    deviceTargetArray.push(h('.deviceTile',
                             String(firstPageNum + i + newPageOffset)));
  }

  // Create the final item in the list of devices and targets
  // ---
  // If the insert index is equal to the number of devices in the set,
  // then it will be added at the end of the existing set. Otherwise
  // we show the final drop target
  var finalItem;
  if (insertAtIndex === numDevicesInLinkedSet) {
    var pageNum = firstPageNum + numDevicesInLinkedSet;
    finalItem = moveDevice(String(pageNum), channels);
  } else {
    var highlightLast = numDevicesInLinkedSet === highlightAtIndex;
    finalItem = moveTarget(numDevicesInLinkedSet, highlightLast, channels);
  }
  deviceTargetArray.push(finalItem);

  // The starting position of the device is above the device list, and
  // can either be the device or a move target
  var startNode;
  if (insertAtIndex < 0) {
    startNode = moveDevice('D', channels);
  } else {
    // We the number of devices + 1 as the index for the start move target
    // to enable proper highlighting
    var startTargetIndex = numDevicesInLinkedSet + 1;
    var highlightStart = (numDevicesInLinkedSet + 1) === highlightAtIndex;
    startNode = moveTarget(startTargetIndex, highlightStart, channels);
  }

  return h('.movingThisDevice', [
    h('.moveDeviceRow', [
      startNode,
      h('.linkLabel', (insertAtIndex < 0) ? 'Unlinked' : 'Linked')
    ]),
    h('.deviceMovementSpace', deviceTargetArray),
    h('.buttonRow', [
      h('button.textButton', {
        'ev-click': hg.send(channels.cancel)
      }, 'Cancel'),
      h('button.textButton', {
        'ev-click': hg.send(channels.commit)
      }, 'OK')
    ])
  ]);
}

function moveDevice(label, channels) {
  return h('.moveDevice', {
    draggable: true,
    'ev-mousedown': dragdrop(channels.dragend)
  }, label);
}

function moveTarget(index, highlightFlag, channels) {
  var classNames = '.moveTarget' + (highlightFlag ? ' .overMoveTarget' : '');

  return h(classNames, {
    'ev-dragenter': droptarget(channels.dragenter, { index: index }),
    'ev-dragover': droptarget(channels.dragover, { index: index }),
    'ev-dragleave': hg.send(channels.dragleave, { index: index }),
    'ev-drop': hg.send(channels.selected, { index: index })
  },[]);
}
