// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var pathToRegexp = require('path-to-regexp');

module.exports = {
  parseName: parseName
};

function parseName(name) {
  var keys = [];
  var re = pathToRegexp('users/:username/:app/:id/:suffix', keys);
  var matches = re.exec(name);

  if (!matches) {
    return;
  }

  var params = {};
  var length = matches.length;
  // Skip the first match.
  for (var i = 1; i < length; i++) {
    var key = keys[i - 1];
    var value = matches[i];
    if (!!value || !params[key.name]) {
      params[key.name] = value;
    }
  }

  return params;
}
