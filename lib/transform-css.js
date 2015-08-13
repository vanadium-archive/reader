// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var myth = require('myth');
var rework = require('rework');
var inherit = require('rework-inherit');
var imprt = require('rework-import');
var through = require('through2');
var path = require('path');
var format = require('format');
var fs = require('fs');

module.exports = transform;

// Convert imports using `require('*.css')` into a string of compiled CSS to be
// inserted into the DOM.
function transform(file) {
  var string = '';

  if (path.extname(file) !== '.css') {
    return through();
  } else {
    return through(write, flush);
  }

  function write(buffer, enc, callback) {
    string += buffer.toString('utf8');
    callback();
  }

  function flush(callback) {
    var stream = this;
    var css;
    var err;

    try {
      css = preprocess(file, string);
    } catch (e) {
      console.error(e);
      console.error(Object.keys(e));

      err = e;
    }

    stream.push(css);
    callback(err, css);
  }
}


var dirname = path.resolve(__dirname, '../browser/components');
var components = fs.readdirSync(dirname).map(function(file) {
  return path.resolve(dirname, file);
});

function preprocess(file, css) {
  var out = rework(css)
  .use(imprt({
    path: components
  }))
  .use(myth({
    compress: true,
    source: file
  }))
  .use(inherit())
  .toString();

  return format('module.exports = %s;', JSON.stringify(out));
}
