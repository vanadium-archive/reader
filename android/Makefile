MAKEFLAGS += --warn-undefined-variables
PATH := node_modules/.bin:$(PATH)
NODE_DIR := $(shell jiri profile list --info Target.InstallationDir v23:nodejs)
PATH := $(PATH):$(NODE_DIR)/bin
SHELL := /bin/bash
VDLPATH := $(JIRI_ROOT)/release/go/src:$(shell cd ../common; pwd)

.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := all
.SUFFIXES:
.PHONY: all appium-server bin clean distclean test-integration

port ?= 4723
udid ?= ${DEVICE_ID}
log-level ?= warn

all: node_modules
	@true

# TODO(jasoncampbell): Add a task for building the account manager APK.

distclean:
	@$(RM) -fr node_modules

clean:
	./gradlew clean

.DELETE_ON_ERROR:
node_modules: package.json
	@npm prune
	@npm install
	@touch $@

apk: app/build/outputs/apk/app-universal-debug.apk

app/build/outputs/apk/app-universal-debug.apk:
	./gradlew :app:assembleDebug

appium-server: node_modules apk
	appium --port $(port) --log-level $(log-level)

test-integration: all
	APK="$(realpath app/build/outputs/apk/app-universal-debug.apk)" \
	DEVICE_ID="$(udid)" \
	tape test/test-*.js
