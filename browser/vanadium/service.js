// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

module.exports = Service

function Service(name, wrapper) {
  if (!(this instanceof Service)) {
    return new Service(name)
  }

  this._name = name
  this._wrapper = wrapper
}

// errors are not bublling up into a context that makes sense, for instance
// serverCall missing here causes problems but there is no where to hook in to
// grab errors.
Service.prototype.announce = function(context, serverCall, name, callback) {
  this._wrapper.connect(name)
  callback(null, 'ACK')
}
