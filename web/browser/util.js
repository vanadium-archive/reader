// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

module.exports = {
  toArray: toArray,
  removed: removed,
  each: each,
  map: map
};

// Map an object's keys to vdom.
function map(object, render, channels) {
  var array = [];
  var keys = Object.keys(object);
  var length = keys.length;

  for (var i = 0; i < length; i++) {
    var key = keys[i];
    var value = object[key];
    var item = render(value, channels);

    array.push(item);
  }

  return array;
}

// # toArray(object)
//
// Convert an object to an array which contains just the enumerable keys of the
// object.
function toArray(object) {
  var keys = Object.keys(object);
  var array = keys.map(toItem);

  return array;

  function toItem(key, index) {
    return object[key];
  }
}

// Iterate the removed keys in an obeserv-varhash change.
function removed(change, iterator) {
  var _diff = change._diff;
  for (var key in _diff) {
    if (_diff.hasOwnProperty(key) && !_diff[key]) {
      iterator(key);
    }
  }
}

// Iterate key, value pairs in an obeserv-varhash change where values have been
// updated. The iteration ignores removed keys and changes which contain a
// syncbase ref update.
//
// NOTE: Ignoring the syncbase ref update is critical to prevent undesired
// recursive loop updates. When a file is created it is missing a blob ref until
// the multip-step, async calls have been finished. The calls are initiated from
// a listener on the application state. Once syncbase put requests finish a hash
// is returned with the ref which should be updated in the app state/UI so the
// it can be rendered and retirevied later. Updating the state after a syncbase
// update causes the original state listener to fire again, causing this loop.
// Skipping changes to the ref property prevent this from occuring.
function each(change, iterator) {
  var keys = Object.keys(change._diff);
  var length = keys.length;
  for (var i = 0; i < length; i++) {
    var key = keys[i];
    // Diffs are partial, grab the whole value from the change.
    var value = change[key];

    // Only iterate existing items that don't contain a .ref update.
    if (value && !(value._diff && value._diff.ref)) {
      iterator(key, value);
    }
  }
}
