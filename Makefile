MAKEFLAGS += --warn-undefined-variables
SHELL := /bin/bash
GRADLE := ./android/gradlew

.SHELLFLAGS := -eu -o pipefail -c
.PHONY: clean cloudsync test

cloudsync:
	$(MAKE) -C cloudsync

clean:
	$(GRADLE) -p android clean
	$(MAKE) -C cloudsync clean

test:
	$(GRADLE) -p android test
