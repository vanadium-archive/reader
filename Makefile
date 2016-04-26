MAKEFLAGS += --warn-undefined-variables
SHELL := /bin/bash
GRADLE := ./android/gradlew

.SHELLFLAGS := -eu -o pipefail -c

.PHONY: cloudsync
cloudsync:
	$(MAKE) -C cloudsync

.PHONY: clean
clean:
	# Temporarily avoid Android related tasks.
	# $(GRADLE) -p android clean
	# $(MAKE) -C cloudsync clean
	@true

.PHONY: test
test:
	@echo "= Running flutter tests ="
	$(MAKE) -C flutter test

.PHONY: test-android
test-android:
	$(GRADLE) -p android test
