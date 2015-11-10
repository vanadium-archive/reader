// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var window = require('global/window');

module.exports = stash;
module.exports.get = get;
module.exports.set = set;
module.exports.del = del;

function stash(key, value){
  if (typeof value === 'undefined') {
    return get(key);
  } else {
    return set(key, value);
  }
}

function get(key){
  var local = window.localStorage.getItem(key);

  return JSON.parse(local);
}

function set(key, value){
  value = JSON.stringify(value);

  window.localStorage.setItem(key, value);
}

function del(key){
  window.localStorage.removeItem(key);
}
