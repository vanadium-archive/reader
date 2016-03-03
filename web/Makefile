MAKEFLAGS += --warn-undefined-variables
PATH := node_modules/.bin:$(PATH)
NODE_DIR := $(shell jiri v23-profile list --info Target.InstallationDir nodejs)
PATH := $(PATH):$(NODE_DIR)/bin
SHELL := /bin/bash
VDLPATH := $(JIRI_ROOT)/release/go/src:$(shell cd ../common; pwd)

.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := all
.SUFFIXES:

js_files := $(shell find browser -name "*.js")
css_files := $(shell find browser -name "*.css")
vdl_files := $(wildcard ../common/vdl/*.vdl)

host ?= 127.0.0.1
port ?= 8080
syncbase_port ?= 4000
cloudsync_port ?= 8000
id ?= $(shell if test -e tmp/id; then cat tmp/id; else PATH=$(PATH) bin/uuid; fi)

.PHONY:
all: public/bundle.js public/pdf-web-view.js
	@true # silences watch

.PHONY:
bin: bin/principal bin/syncbased
	@true

.DELETE_ON_ERROR:
node_modules: package.json
	@npm prune
	@npm install
	# SEE: http://git.io/vGkKV
	@rm -rf ./node_modules/{vanadium,syncbase}
	@cd "$(JIRI_ROOT)/release/javascript/core" && npm link
	@npm link vanadium
	@cd "$(JIRI_ROOT)/release/javascript/syncbase" && make node_modules && npm link
	@npm link syncbase
	@touch $@

.DELETE_ON_ERROR:
public/bundle.js: browser/main.js $(js_files) $(css_files) node_modules tmp
	browserify \
		--debug \
		--transform ./lib/transform-css \
		--transform [ envify --ID $(id) ] \
		$< 1> $@

.DELETE_ON_ERROR:
public/pdf-web-view.js: browser/pdf-web-view.js $(js_files) node_modules
	browserify --debug $< 1> $@

.PHONY:
distclean: clean
	@$(RM) -fr node_modules
	@$(RM) -f bin/principal
	@$(RM) -f bin/syncbased
	@jiri goext distclean

.PHONY:
clean:
	@$(RM) -fr npm-debug.log
	@$(RM) -fr public/bundle.js
	@$(RM) -fr tmp
	@$(RM) -fr credentials
	@$(RM) -fr browser/vanadium/v.io
	@$(RM) -fr browser/vanadium/vdl

.PHONY:
dependency-check:
	@dependency-check package.json --entry browser/main.js
	@dependency-check package.json --entry browser/main.js --unused --no-dev

.PHONY:
lint: node_modules
	@jshint .

.PHONY:
test: lint node_modules
	tape test/index.js

coverage: $(js_files) node_modules
	@istanbul cover --report html --print detail ./test/index.js
	@touch coverage

disk.html: browser/main.js $(js_files) node_modules
	browserify --full-paths --transform ./lib/transform-css $< | discify > $@

.PHONY:
start: all
	st --port $(port) --host $(host) --dir public --no-cache --index index.html

bin/principal:
	jiri go build -a -o $@ v.io/x/ref/cmd/principal

bin/syncbased:
	jiri go build -a -o $@ v.io/x/ref/services/syncbase/syncbased

tmp:
	mkdir -p $@
	echo $(id) > $@/id

credentials: bin/principal
	./bin/principal seekblessings --v23.credentials ./credentials
	touch $@

# Naming collisions for different instances of syncbase for the same user?
# Easy way to make --v23.permissions.literal?
.PHONY:
syncbase: bin/syncbased credentials tmp
	$(eval blessing := $(shell bin/principal dump --v23.credentials=./credentials -s=true))
	$(eval email := $(subst dev.v.io:u:,,$(blessing)))
	./bin/syncbased \
		--vmodule=*=5 \
		--alsologtostderr=false \
		--root-dir="tmp/syncbase_$(id)" \
		--name="users/$(email)/reader/$(id)/syncbase" \
		--v23.namespace.root="/ns.dev.v.io:8101" \
		--v23.proxy="proxy" \
		--v23.tcp.address=":$(syncbase_port)" \
		--v23.credentials="credentials" \
		--v23.permissions.literal='{"Admin":{"In":["..."]},"Write":{"In":["..."]},"Read":{"In":["..."]},"Resolve":{"In":["..."]},"Debug":{"In":["..."]}}'

.PHONY:
cloudsync: bin/syncbased credentials tmp
	$(eval blessing := $(shell bin/principal dump --v23.credentials=./credentials -s=true))
	$(eval email := $(subst dev.v.io:u:,,$(blessing)))
	./bin/syncbased \
		--vmodule=*=5 \
		--alsologtostderr=false \
		--root-dir="tmp/cloudsync" \
		--name="users/$(email)/reader/cloudsync" \
		--v23.namespace.root="/ns.dev.v.io:8101" \
		--v23.proxy="proxy" \
		--v23.tcp.address=":$(cloudsync_port)" \
		--v23.credentials="credentials" \
		--v23.permissions.literal='{"Admin":{"In":["..."]},"Write":{"In":["..."]},"Read":{"In":["..."]},"Resolve":{"In":["..."]},"Debug":{"In":["..."]}}'

vdl: browser/vanadium/vdl/index.js

browser/vanadium/vdl/index.js: $(vdl_files)
	VDLPATH=$(VDLPATH) vdl generate --lang javascript \
		-js-out-dir ./browser/vanadium \
		vdl
	@touch $@
