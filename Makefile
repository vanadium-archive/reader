MAKEFLAGS += --warn-undefined-variables
SHELL := /bin/bash
GRADLE := android/gradlew

.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := all
.SUFFIXES:

.PHONY:
clean:
	$(MAKE) -C web clean
	$(GRADLE) -p android clean

.PHONY:
test: test-android
	$(MAKE) -C web test

.PHONY:
test-android:
	$(GRADLE) -p android :app:test

.PHONY: vdl
vdl:
	$(MAKE) -C web vdl
	$(GRADLE) -p android vdl

