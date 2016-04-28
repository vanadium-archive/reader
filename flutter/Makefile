MAKEFLAGS += --warn-undefined-variables
SHELL := /bin/bash

.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := all
.SUFFIXES:

DIRNAME := $(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
FLUTTER_BIN := $(DIRNAME)/deps/flutter/bin
DART_BIN := $(FLUTTER_BIN)/cache/dart-sdk/bin
PATH := $(FLUTTER_BIN):$(DART_BIN):$(PATH)

.PHONY: all
all: .packages deps
	@true # silences watch

.packages: pubspec.yaml deps/flutter
	pub get

.PHONY: upgrade
upgrade: deps/flutter
	pub upgrade

.PHONY: analyze
analyze: deps/flutter
	@echo "=== Analyzing application code ==="
	dartanalyzer lib/main.dart --lints --fatal-hints --fatal-warnings
	@echo "=== Analyzing test code ==="
	dartanalyzer $(shell find test -name "*.dart") --lints --fatal-hints --fatal-warnings

.PHONY: fmt
fmt: packages deps/flutter
	dartfmt --overwrite lib

doc: deps/flutter $(shell find lib/ -name "*.dart")
	dartdoc
	@touch $@

# TODO(jasoncampbell): this task needs to use the jiri profile for flutter.
# NOTE: $FLUTTER_ENGINE is automatically picked up by flutter but is explcitly
# set here for calrity until the correct path can be set using a jiri profile.
.PHONY: test
test: analyze deps/flutter
	@echo "=== Running tests ==="
	flutter test test/unit/example_test.dart
	flutter test test/widget/flutter_demo_test.dart

.PHONY: depclean
depclean:
	@rm -rf $(shell find . -name "packages")
	@rm -rf deps
	@rm -rf .packages
	@rm -rf pubspec.lock

deps: deps/flutter

deps/flutter:
	git clone https://github.com/flutter/flutter.git -b alpha $@
	cd $@ && git checkout $(shell echo -e `cat FLUTTER_VERSION`)
	flutter doctor
	pub get
	@touch $@
