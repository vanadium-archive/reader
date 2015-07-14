MAKEFLAGS += --warn-undefined-variables
PATH := node_modules/.bin:$(PATH)
PATH := $(PATH):$(V23_ROOT)/third_party/cout/node/bin
SHELL := /bin/bash

.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := all
.SUFFIXES:

js_files := $(shell find browser -name "*.js")
host ?= 127.0.0.1
port ?= 8080

all: public/bundle.js node_modules
	@true  # silences watch

.DELETE_ON_ERROR:
node_modules: package.json
	@npm prune
	@npm install
	@npm install $(V23_ROOT)/release/javascript/core/
	@touch node_modules

.DELETE_ON_ERROR:
public/bundle.js: browser/index.js $(js_files) node_modules
	browserify --debug $< 1> $@

.PHONY:
clean:
	@$(RM) -fr node_modules
	@$(RM) -fr npm-debug.log
	@$(RM) -fr public/bundle.js

.PHONY:
lint: node_modules
	@jshint .

.PHONY:
test: lint all
	@true

.PHONY:
start: all
	st --port $(port) --host $(host) --dir public --no-cache --index index.html
