# Reader

An example PDF reader using Vanadium.

# Development

## Dependencies

If you have a `$JIRI_ROOT` setup you can install Node.js from
`$JIRI_ROOT/third_party` by running:

    jiri profile install nodejs

Optionally, it is possible to use your own install of Node.js if you would like
to use a more recent version.

## Building

The Makefile is setup to handle all dependencies once Node.js is installed. The
default make task will install any modules listed in the `package.json` and
build a browser bundle from `browser/index.js` via browserify.

    make

It is possible to have the build happen automatically anytime a JavaScript file
changes using the watch tool:

    watch make

## Running locally

To run a local dev server use:

    make start

If you would like to change the host and or port that is used:

    make start port=<port> host=<host>

Run syncbase with:

    make syncbase

This will automatically have you set up credentials etc. If you want to remove stored data & credentials use:

    make clean
