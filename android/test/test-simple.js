// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('tape');
var remote = require('./helpers/remote');
var debug = require('debug')('test');
var ms = require('ms');
var waterfall = require('run-waterfall');
var extend = require('xtend');

test('simple', function(t) {
  var driver = remote();

  // Hook into the test's end event to shutdown the driver session.
  t.on('end', function end() {
    debug('test ending, closing driver');

    driver.quit(function onclose(err) {
      if (err) {
        debug('error: %o', err);
        throw err;
      }
    });
  });

  var tasks = [
    init,
    wait(ms('4s')),
    getCurrentActivity,
    contexts,
    wait(ms('4s')),
    selectBlessing
  ];

  // Run all the tasks above, one after the other.
  waterfall(tasks, function done(err, res) {
    if (err) {
      t.end(err);
      return;
    }

    debug('res: %o', res);

    t.ok(true);
    t.end();
  });

  function init(callback) {
    var defaults = {
      browserName: '',
      'appium-version': '1.4.13',
      platformName: 'Android',
    };

    // TODO(jasoncampbell): Support some kind of cinfiguration file for all
    // these options.
    var options = extend(defaults, {
      platformVersion: '6.0',
      deviceName: process.env.DEVICE_ID,
      app: process.env.APK
    });

    debug('initializing driver with: %o', options);

    driver.init(options, done);

    function done(err) {
      if (err) {
        return callback(err);
      }

      callback(null, {});
    }
  }

  function wait(miliseconds) {
    miliseconds = miliseconds || 60;
    return task;

    function task(res, callback) {
      setTimeout(function timeout() {
        callback(null, res);
      }, miliseconds);
    }
  }

  function getCurrentActivity(res, callback) {
    driver.getCurrentActivity(function done(err, activity) {
      if (err) {
        return callback(err);
      }

      res.activity = activity;
      callback(null, res);
    });
  }

  function contexts(res, callback) {
    driver.contexts(function done(err, contexts) {
      if (err) {
        return callback(err);
      }

      res.contexts = contexts;
      callback(null, res);
    });
  }

  function selectBlessing(res, callback) {
    var selector = [
      'new UiSelector()',
      '.className("android.widget.CheckedTextView")',
      '.index(0)'
    ].join('');

    driver.elementByAndroidUIAutomator(selector, function(err, element) {
      if (err) {
        return callback(err);
      }

      t.ok(element, 'Blessing selection UI should exist');

      element.click(function(err) {
        if (err) {
          return callback(err);
        }

        res['check-box'] = element;

        var selector = [
          'new UiSelector()',
          '.className("android.widget.Button")',
          '.text("OK")'
        ].join('');

        driver.elementByAndroidUIAutomator(selector, function(err, element) {
          if (err) {
            return callback(err);
          }

          element.click(function(err) {
            if (err) {
              return callback(err);
            }

            var selector = [
              'new UiSelector()',
              '.className("android.widget.Button")',
              '.text("Allow")'
            ].join('');

            driver
              .elementByAndroidUIAutomator(selector, function(err, element) {

              if (err) {
                return callback(err);
              }

              element.click(function(err) {
                if (err) {
                  return callback(err);
                }

                callback(null, res);
              });
            });


          });
        });
      });
    });
  }
});

// NOTE: Below is a WIP example of how an API for running a single test which
// spans multiple devices might work. Ideally the managment of Appium clients,
// Appium servers, and the cloud instance could be managed by the setup helper.
var setup = require('./helpers/setup');

test.skip('bless application', setup(function(t, devices) {
  devices.bless(function onbless(err) {
    if (err) {
      return t.error(err);
    }

    t.end();
  });
}));
