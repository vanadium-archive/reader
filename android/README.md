# Reader Android client

An example multi-device PDF reader app for Android platform, built using Vanadium.


# Development

## Dependencies

The Java/Android development profile can be installed by running the following jiri command:

    jiri v23-profile install java

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

## Running the cloud Syncbase instance

To make the synchronization work properly,
there needs to be a cloud Syncbase instance running, which hosts the Syncgroup for the Reader app.

To run the cloudsync instance, run the following command from the `reader/web` directory:

    make cloudsync


