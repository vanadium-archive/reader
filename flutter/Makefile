MAKEFLAGS += --warn-undefined-variables
SHELL := /bin/bash

.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := all
.SUFFIXES:

.PHONY: all
all: .packages doc
	@true # silences watch

.packages: pubspec.yaml
	pub get

.PHONY: upgrade
upgrade:
	pub upgrade

.PHONY: analyze
analyze:
	@echo "=== Analyzing Dart code ==="
	# dartanalyzer lib/main.dart --lints --fatal-hints --fatal-warnings
	@true

.PHONY: fmt
fmt: packages
	dartfmt --overwrite lib

doc:
	dartdoc
	@touch $@

# TODO(jasoncampbell): this task needs to use the jiri profile for flutter.
# NOTE: $FLUTTER_ENGINE is automatically picked up by flutter but is explcitly
# set here for calrity until the correct path can be set using a jiri profile.
.PHONY: test
test: analyze
	@echo "=== Running tests ==="
	# flutter test
	@true
