// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var click = require('../../events/click');
var css = require('./pdf-viewer.css');
var debug = require('debug')('reader:device-set');
var drag = require('../../events/drag');
var dragover = require('../../events/dragover');
var drop = require('../../events/drop');
var format = require('format');
var h = require('mercury').h;
var hg = require('mercury');
var insert = require('insert-css');
var managerCSS = require('./manager.css');
var modal = require('../modal');
var PDFWidget = require('./pdf-widget');

module.exports = render;

function render(state, channels) {
  debug('render: %o', state);

  insert(css);

  var node = manager(state, channels);

  return h('.pdf-viewer', [
    hg.partial(progress, state.progress),
    hg.partial(controls, state, channels),
    h('.pdf-widget', new PDFWidget(state)),
    hg.partial(modal.render, state.modal, node)
  ]);
}

function progress(state) {
  if (state >= 100) {
    return h('.progress.hidden');
  }

  return h('.progress', [
    h('.progress-bar', {
      style: { width: state + '%' }
    })
  ]);
}

function controls(state, channels) {
  if (state.progress < 100) {
    return h('.pdf-controls.hidden');
  }

  return h('.pdf-controls', [
    h('a.back', {
      href: '/#!/'
    }, [
      h('i.material-icons', 'arrow_back')
    ]),
    h('.title', state.file.title),
    h('.pager', [
      h('.meta', format('Page: %s of %s',
        state.pages.current,
        state.pages.total)),
      h('a.previous', {
        href: '#',
        'ev-click': click(channels.previous)
      }, [
        h('i.material-icons', 'chevron_left'),
      ]),
      h('a.next', {
        href: '#',
        'ev-click': click(channels.next)
      }, [
        h('i.material-icons', 'chevron_right'),
      ])
    ]),
    h('a.menu', {
      href: '#',
      'ev-click': click(channels.manage)
    },
    [
      h('i.material-icons', 'more_vert'),
    ])
  ]);
}

function manager(state, channels) {
  // If the initiator is the current device show the device list manager UI.
  // Else show the remote control manager.
  insert(managerCSS);

  // TODO(jasoncampbell): Refactor so that re-indexing is not required.
  // Use a single loop to create each linked, and unlinked vnode children arrays
  // which are sorted in the correct order.
  var linked = [];
  var unlinked = [];
  var keys = Object.keys(state.devices);
  var length = keys.length;
  for (var i = 0; i < length; i++) {
    var id = keys[i];
    var device = state.devices[id];
    if (device.linked) {
      // Add the node to the linked array at the correct index to preserve the
      // order.
      linked.push(device);
    } else {
      unlinked.push(device);
    }
  }

  linked = linked.sort(function sort(a, b){
    var value = 0;

    if (a.index > b.index) {
      value = 1;
    }

    if (a.index < b.index) {
      value = -1;
    }

    return value;
  });

  return h('.manager', [
    h('.devices-linked', {
      'ev-event': [
        dragover(channels.link, {
          id: state.manager.dragID
        }),
        drop(channels.reset)
      ]
    }, [
      h('.title', 'Linked devices (drag to reorder)'),
      h('.list', linked.map(function (device) {
        return hg.partial(item, device, state, channels);
      }))
    ]),
    h('.devices-unlinked', {
      'ev-event': drop(channels.unlink, {
        id: state.manager.dragID
      })
    }, [
      h('.title', 'Unlinked devices (drag here to unlink)'),
      h('.list', unlinked.map(function (device) {
        return hg.partial(item, device, state, channels);
      }))
    ])
  ]);
}

function item(device, state, channels) {
  if (state.manager.dragID === device.id) {
    return h('.item.placeholder', {
      'ev-event': drop(channels.reset)
    }, format('PLACEHOLDER: %s - index: %s', device.id, device.index));
  }

  var current = device.current ? 'CURRENT' : '';

  var classNames = [];
  if (state.manager.overID) {
    classNames.push('over');
  }

  if (device.current) {
    classNames.push('current');
  }

  var events = [
    drag(channels.drag, { id: device.id }),
  ];

  if (device.linked) {
    // Only reorder linked devices.
    events.push(dragover(channels.reorder, {
      droptarget: device.id,
      dragtarget: state.manager.dragID
    }));
  }

  return h('.item', {
    className: classNames.join(' '),
    draggable: true,
    'ev-event': events,
  }, format('%s - index: %s %s', device.id, device.index, current));
}
