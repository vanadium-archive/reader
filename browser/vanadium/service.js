// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var debug = require('debug')('reader:vanadium:service');
var Buffer = require('buffer').Buffer;
var store = require('../pdf-store');
var assert = require('assert');
var format = require('format');
var window = require('global/window');

module.exports = Service;

function Service(client) {
  if (!(this instanceof Service)) {
    return new Service(client);
  }

  var service = this;

  // NOTE: Attributes prefixed with an underscore are ignored by the Vanadium
  // reflection invoker.
  service._client = client;
}

// TODO(jasoncampbell): Explore why exceptions are not bubbling up into a
// context that makes sense, for instance serverCall missing here causes
// problems but there is no where to hook in to grab errors since they are only
// logged by the vanadium module.
//
// SEE: https://github.com/vanadium/issues/issues/587
Service.prototype.announce = function(context, serverCall, name, callback) {
  var service = this;

  // NOTE: It would be ideal if simply putting to the peer list would do all the
  // set/connection work automatically.
  debug('announce called by: %s', name);
  service._client.emit('service:announce', name);
  callback(null, 'ACK');
};

Service.prototype.savePDF = function(ctx, serverCall, $stream, meta, callback) {
  var service = this;
  debug('savePDF called: %o', meta);

  // TODO(jasoncampbell): send these errors back to the client via the callback
  assert.ok(meta.hash, 'meta.hash required');
  assert.ok(meta.name, 'meta.name required');
  assert.ok(meta.size, 'meta.size required');
  assert.ok(meta.type, 'meta.type required');

  // Check if this file is already stored in the local file system.
  store.has(meta.hash, function onexists(err, exists) {
    if (err) {
      // TODO(jasoncampbell): don't send the DB error directly, wrap it or
      // create a new error that allows the DB issue to be surfaced on this
      // service and send a generic error back to the client.
      return callback(err);
    }

    // Politely cancel the RPC/stream if the file exists.
    if (exists) {
      var message = format('PDF file "%s" already exists.', meta.hash);
      callback(null, message);
      return;
    }

    debug('Buffering PDF: %d', meta.size);

    // TODO(jasoncampbell): use eos to handle err/finish on stream.
    var buffer = new Buffer(meta.size);
    var start = 0;

    $stream.on('error', function onerror(err) {
      debug('$stream error: %s', err.stack);
      callback(err);
    });

    // Streamed data from WSPR is emitted as Unint8Array objects instead of
    // Buffers (which is what the client piped to the RPC stream) this breaks
    // compatibility with stream utilities like through, etc. It's possible to
    // change this in the vanadium code where the data could be converted to a
    // buffer instead of passing a Unint8Array directly (similar to the code
    // below) or by defining a VDL for this application it might be possible to
    // provide information on the type that should be emitted.
    //
    // Ideally the $stream here could be piped directly without issue:
    //
    //     $stream.pipe(through(write, flush));
    //
    $stream.on('data', function(data) {
      // create a new buffer from the unint8Array array and then copy into
      // (concatenat) the buffer defined above.
      var buff = new Buffer(data);
      buff.copy(buffer, start);
      start += buff.length;

      debug('recieved: %d of %d', start, meta.size);

      if (start > meta.size) {
        var err = new Error('PDF stream exceeded content length');
        $stream.emit('error', err);
        $stream.pause();
      }
    });

    $stream.on('end', function() {
      debug('end PDF stream');
      // Create a Blob from the concatenated buffer above (it's not possible to
      // create a File object directly).
      // TODO(jasoncampbell): store file meta in syncbase separately.
      var blob = new window.Blob([ buffer ], {
        type: meta.type
      });

      callback(null, 'Success.');
      service._client.emit('service:pdf', meta, blob);
    });
  });
};
