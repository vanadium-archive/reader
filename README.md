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

Run the syncbase instance which hosts the syncgroup:

    make cloudsync

This will run a syncbased instance that will mount as
"users/<email>/reader/cloudsync" and host the syncgroup. In order for peers to
sync an instance of this needs to be running somewhere.

To run a new syncbase peer and corresponding application use variables to change
the startup settings:

    syncbase_port=8888 id=`./bin/cuid` make syncbase

This will generate a new client id and start a new syncbased instance on a
different port. The generated id can be grabbed from the standard out and will
look something like this "cif7en1kb00007uigyohv58tx". Once you have the id you
can open a new browser window and use the id in a query param to initialize the
application to connect as that peer.

    http://127.0.0.1:8080/?id=<id>

This will automatically have you set up credentials etc. If you want to remove
stored data & credentials use:

    make clean
