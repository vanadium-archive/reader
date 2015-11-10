// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var once = require('once');
var thunky = require('thunky');
var window = require('global/window');

var database = thunky(open);

module.exports = {
  get: get,
  put: put
};

// Open, initialize and return an IndexedDB instance.
function open(callback) {
  // Use the `indexedDB.open()` factory to get a IDBOpenDBRequest which inherits
  // from IDBRequest. Do the right thing for every event handler.
  //
  // SEE: https://developer.mozilla.org/en-US/docs/Web/API/IDBFactory/open
  // SEE: https://developer.mozilla.org/en-US/docs/Web/API/IDBOpenDBRequest
  // SEE: https://developer.mozilla.org/en-US/docs/Web/API/IDBRequest
  var req = window.indexedDB.open('reader-files');
  req.onupgradeneeded = onupgradeneeded;
  req.onblocked = onfailure;
  req.onfailure = onfailure;
  req.onsuccess = onsuccess;

  // This event fires when a new version fires, this is a simple prototype
  // without versions so this only happens on new databases. In this case the
  // initial object store needs to be created.
  function onupgradeneeded(event) {
    var db = event.target.result;
    db.createObjectStore('reader-files');
  }

  function onsuccess(event) {
    var db = event.target.result;
    callback(null, db);
  }

  function onfailure(event) {
    callback(req.error);
  }
}

// Put a Blob/File to the database.
function put(hash, blob, callback) {
  callback = once(callback);

  database(ondb);

  function ondb(err, db) {
    if (err) {
      return callback(err);
    }

    // Use a transaction to get the underlying "store" and save the passed in
    // Blob.
    //
    // SEE: https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction
    var transaction = db.transaction([ 'reader-files' ], 'readwrite');
    var store = transaction.objectStore('reader-files');
    var req = store.put(blob, hash);
    req.onsuccess = onsuccess;
    req.onfailure = onfailure;

    function onsuccess(event) {
      var res = event.target.result;
      callback(null, res);
    }

    function onfailure(event) {
      callback(req.error);
    }
  }
}

function get(hash, callback) {
  callback = once(callback);

  database(ondb);

  function ondb(err, db) {
    if (err) {
      return callback(err);
    }

    // Use a transaction to get the underlying "store" and retrieve the Blob
    // identified by it's hash.
    //
    // SEE: https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction
    var transaction = db.transaction([ 'reader-files' ], 'readwrite');
    var store = transaction.objectStore('reader-files');
    var req = store.get(hash);
    req.onsuccess = onsuccess;
    req.onfailure = onfailure;
    req.onabort = onfailure;

    function onsuccess(event) {
      var blob = event.target.result;
      callback(null, blob);
    }

    function onfailure(event) {
      callback(req.error);
    }
  }
}
