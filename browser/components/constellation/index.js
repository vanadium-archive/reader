// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// # Vanadium component
//
// Wraps Vanadium functionality in a mercury style component so that state can
// be easily modified, observed, and rendered into the UI as appropriate.
module.exports = {
  state: require('./state'),
  render: require('./render')
};
