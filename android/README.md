# Reader Android client

An example multi-device PDF reader app for Android platform, built using Vanadium.


# Development

## Dependencies

The Java/Android development profile can be installed by running the following `jiri` command:

    jiri profile-v23 install v23:java

## Building

Reader Android client can be built using Android Studio.
In order to set up the environment variables correctly,
the Android Studio should be run by the following command:

Linux:

    jiri run <path_to_android_studio>/bin/studio.sh

OS X:

    jiri run /Applications/Android\ Studio.app/Contents/MacOS/studio

When Android Studio runs for the first time,
select "Import project" and point to the `reader/android` directory to load the project into Android Studio.
Once the project is loaded, the project can be built and run within Android Studio.

To build the project from the command line, you can run the following command from the `reader/android` directory:

    ./gradlew :app:assembleDebug

When you want to force update the dependencis, add `--refresh-dependencies` parameter to your command:

    ./gradlew :app:assembleDebug --refresh-dependencies

## Running the Cloudsync instance

To make the synchronization work properly,
there needs to be a Cloudsync instance running, which hosts the Syncgroup for the Reader app.

To run the Cloudsync instance, run the following command from this directory:

    make -C `git rev-parse --show-toplevel`/cloudsync clean cloudsync

# Testing

There is an automated UI testing ability enabled by Appium which is a work in progress. To run the tests you will need to run an Appium server, the `cloudsync` syncbase instance, and then the test. In the future this may be simplified so that a single CLI task can manage all the test dependencies.

Be sure to set the `$ANDROID_HOME` env var with:

    export ANDROID_HOME=<pathname>/Android/sdk/

## Setup

First you will need to install all the dependencies, the default make task will handle this (it might take a minute or so):

    make

This will install the following testing dependencies:

* Any testing dependencies declared in the `package.json` (Appium, tape, etc.).
* Vanadium dependencies for the `syncbased` and `principal` commands.

Next you should build the APK for the reader application, this can be done via Android studio or with Gradle via the Makefile:

    make apk

Once the dependencies are in order and the application has be built you will need to plug in an Android device, and retrieve it's unique device id using `adb`. Make note of the device id for later.

    adb devices -l

## Services

Appium uses the a client/server architecture similar to Selenuim (in fact the clients libraries are the same). The tests are currently written in JS but they could be written in any language with a web driver client. Before tests can be run an Appium server needs to be available to handle HTTP requests from the client.

To run the Appium server:

    udid=<device-id> make appium-server

The reader app needs a cloud available peer to synchronize with, to provide this run the `cloudsync` Syncbase instance with the blessings of the same user who owns the Android device.

    make -C `git rev-parse --show-toplevel`/cloudsync clean cloudsync

**NOTE**: Be sure to login to the Google OAuth with the same email address as the account that owns the phone.

## Run

With the `cloudsync` service and the Appium server running the tests can now be run with one caveat: **be sure to unlock the phone**.

    udid=<device-id> make test-integration

Either the variable `device-id` or the environment variable `$DEVICE_ID` can be used. The command above will execute the tests written in JS that match `test/test-*.js`.

The make tasks are provided as a convenience so that any dependencies can be resolved automatically. It is possible to run the tests directly with tape once the initial setup is done and the required Appium server and cloudsync peer are running.

    tape test/test-my-new-test.js
    node test/test-my-new-test.js # This works too.

[Appium]: http://appium.io/
