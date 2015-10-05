// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var debug = require('debug')('reader:vanadium:service');

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
