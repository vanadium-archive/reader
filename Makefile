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
	@browserify --debug $< 1> $@

.PHONY:
clean:
	@$(RM) -fr node_modules
	@$(RM) -fr npm-debug.log
	@$(RM) -fr public/bundle.js

.PHONY:
lint: node_modules
	@dependency-check package.json --entry browser/index.js
	@jshint .

.PHONY:
test: lint node_modules
	tape test/index.js

coverage: $(js_files) node_modules
	@istanbul cover --report html --print detail ./test/index.js
	@touch coverage

disk.html: browser/index.js $(js_files) node_modules
	browserify --full-paths $< | discify > $@

.PHONY:
start: all
	st --port $(port) --host $(host) --dir public --no-cache --index index.html
