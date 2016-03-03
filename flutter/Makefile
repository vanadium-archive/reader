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
	dartanalyzer lib/main.dart

.PHONY: fmt
fmt: packages
	dartfmt --overwrite lib

doc:
	dartdoc
	@touch $@
