# Cloudsync for Reader

This directory contains scripts for building and running the Cloudsync instance,
which is a Syncbase instance which hosts the syncgroup and replicates the data
of all the Reader app clients for a user. There must be a Cloudsync instance
running for the Reader app to work properly.

For now, every user needs to have a separate Cloudsync instance running, but
this requirement may change in the future. To learn more details about Syncbase,
please refer to its [website](https://vanadium.github.io/syncbase).

# Development

## Dependencies

To build the binaries for Syncbase, you need to have the base profile installed
with `jiri` tool with the following command:

    jiri profile-v23 install v23:base

## Running Cloudsync

To run the syncbase instance which hosts the syncgroup:

    make cloudsync

This will run a cloudsync instance that will mount as
`users/<email>/reader/cloudsync` and host the syncgroup. In order for peers to
sync an instance of this needs to be running somewhere.

To run a new cloudsync with a different port number:

    port=8888 make cloudsync

This will automatically have you set up credentials etc. If you want to remove
stored data & credentials use:

    make clean
