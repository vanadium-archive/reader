// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('tape');
var component = require('../../browser/components/constellation');
var raf = require('raf');
var query = require('./query');
var setup = require('./setup');
var dispatch = require('./dispatch');

test('components/constellation - state', function(t) {
  var state = component.state();

  t.same(state.peers(), {});
  t.end();
});

test.skip('components/peers - fake test', setup(component, function(t, state){
  t.same(state.peers(), {});

  dispatch('click', '.add-peer');

  t.notSame(state.peers(), {});

  raf(function() {
    var nodes = query('.peer');
    var element = nodes[0];

    t.equal(nodes.length, 1);
    t.ok(element['data-id'], 'should have data-id attribute');
    t.equal(element.childNodes[0].data, 'peer: ' + element['data-id']);
    t.end();
  });
}));
