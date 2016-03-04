MAKEFLAGS += --warn-undefined-variables
PATH := node_modules/.bin:$(PATH)
NODE_DIR := $(shell jiri profile list --info Target.InstallationDir v23:nodejs)
PATH := $(PATH):$(NODE_DIR)/bin
SHELL := /bin/bash
VDLPATH := $(JIRI_ROOT)/release/go/src:$(shell cd ../common; pwd)

.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := all
.SUFFIXES:

port ?= 4723
udid ?= ${DEVICE_ID}
log-level ?= warn

.PHONY:
all: bin node_modules
	@true

.PHONY:
bin:
	$(MAKE) -C ../web bin

# TODO(jasoncampbell): Add a task for building the account manager APK.

.PHONY:
distclean:
	@$(RM) -fr node_modules

.PHONY:
clean:
	./gradlew clean

.DELETE_ON_ERROR:
node_modules: package.json
	@npm prune
	@npm install
	@touch $@

.PHONY:
apk: app/build/outputs/apk/app-debug.apk

app/build/outputs/apk/app-debug.apk:
	./gradlew :app:assembleDebug

.PHONY:
appium-server: node_modules apk
	appium --port $(port) --log-level $(log-level)

.PHONY:
test-integration: all
	APK="$(realpath app/build/outputs/apk/app-debug.apk)" \
	DEVICE_ID="$(udid)" \
	tape test/test-*.js
