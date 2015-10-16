MAKEFLAGS += --warn-undefined-variables
SHELL := /bin/bash

.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := all
.SUFFIXES:

VDLPATH = $(JIRI_ROOT)/release/go/src:$(shell pwd)
vdl_files = $(wildcard vdl/*.vdl)

.PHONY:
clean:
	$(MAKE) -C web clean

.PHONY:
test:
	$(MAKE) -C web test

.PHONY:
vdl: web/browser/vanadium/vdl/index.js
	@true  # silence "make: Nothing to be done for `vdl'."

# TODO(jasoncampbell): Move this to web/Makefile so it can be used as a
# dependency in tests etc.
web/browser/vanadium/vdl/index.js: $(vdl_files)
	VDLPATH=$(VDLPATH) vdl generate --lang javascript \
		-js-out-dir ./web/browser/vanadium \
		vdl

# The vdl command will general mutliple Java files in the --java-out-dir + /vdl
# directory. In order tie the $(vdl_files) dependencies to the building of the
# Java files the mtime on the android/src/main/java/vdl is used. Note the @touch
# at the end of this definition, this makes it so that the task only runs if the
# dependencies have updated since the last run.
android/src/main/java/vdl: $(vdl_files)
	VDLPATH=$(VDLPATH) vdl generate --lang java \
		--java-out-dir android/src/main/java \
		vdl
	@touch android/src/main/java/vdl
