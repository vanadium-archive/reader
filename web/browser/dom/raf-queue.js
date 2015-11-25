// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var raf = require('raf');

var jobs = [];
var id = null;

module.exports = queue;

// Queue asynchronous workers to fire on the next available animation frame.
function queue(job) {
  jobs.push(job);

  // If the id is set there is a job execution happening, don't invoke next in
  // this case, it will be called when the currently executing job is done.
  if (!id) {
    id = raf(next);
  }

}

// Call the next job in the queue (if available).
function next() {
  if (jobs.length === 0) {
    // Allows the next call to `queue(...)` to kick off the newly added job.
    id = null;
    return;
  }

  var job = jobs.shift();
  job(done);

  function done(err) {
    if (err) {
      throw err;
    }

    id = raf(next);
  }
}