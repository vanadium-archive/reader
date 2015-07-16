// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var document = require('global/document');
var hg = require('mercury');

module.exports = setup;

// Wraps up functioanility for embedding a component in the document and setting
// up some test cleanup to run after t.end() is called.
//
// SEE: http://git.io/vmR3O
function setup(component, callback) {
  var div = document.createElement('div');
  document.body.appendChild(div);

  var state = component.create();
  var initial = state();
  var remove = hg.app(div, state, render);

  return function fn(t) {
    t.once('end', function() {
      state.set(initial);
      document.body.removeChild(div);
      remove();
    });

    callback(t, state);
  };

  function render(state) {
    return hg.partial(component.render, state, state.channels);
  }
}
