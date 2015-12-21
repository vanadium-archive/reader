// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var verror = require('verror');
var getport = require('getport');
var waterfall = require('run-waterfall');

module.exports = configure;

function configure(callback) {
  var json;

  try {
    json = require('../config.json');
  } catch (e) {
    var err = verror(e, 'Missing configuration file.');
    callback(err);
    return;
  }

  var devices = json.devices;
  var length = devices.length;
  var jobs = new Array(length);
  for (var i = 0; i < length; i++) {
    console.log('device: ', devices[i]);
    jobs[i] = task.bind(null, devices[i]);
  }

  waterfall(jobs, function done(err, ports) {
    if (err) {
      return callback(err);
    }

    callback(null, json);
  });

  // The first call will be missing the starting port.
  function task(device, start, callback) {
    if (typeof start === 'function') {
      callback = start;
      getport(done);
    } else {
      getport(start, done);
    }

    function done(err, port) {
      if (err) {
        callback(err);
        return;
      }

      device.port = port;
      callback(null, port + 10);
    }
  }
}

function device(options) {
  if (!(this instanceof arguments.callee)) {
    return new arguments.callee(arguments);
  }

  this.client = {

  };

  this.server = {

  };
}
