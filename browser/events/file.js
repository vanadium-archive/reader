// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var extend = require('xtend');
var BaseEvent = require('mercury').BaseEvent;

module.exports = BaseEvent(lambda); // jshint ignore:line

// TODO(jasoncampbell): Add validation for event target type
function lambda(ev, broadcast) {
  var target = ev.target;
  var valid = ev.type === 'change';

  if (!valid) {
    // Make sure to bubble
    if (ev.startPropagation) {
      ev.startPropagation();
    }

    return;
  }

  // Merges passed in data.
  var file = target.files[0];
  var data = extend({ file: file }, this.data);
  broadcast(data);
}
