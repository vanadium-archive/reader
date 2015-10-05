MAKEFLAGS += --warn-undefined-variables
SHELL := /bin/bash

.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := all
.SUFFIXES:

.PHONY:
clean:
	$(MAKE) -C web clean

.PHONY:
test:
	$(MAKE) -C web test
