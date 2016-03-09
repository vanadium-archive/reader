MAKEFLAGS += --warn-undefined-variables
SHELL := /bin/bash

.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := cloudsync
.PHONY: bin clean cloudsync distclean

port ?= 8000

bin: bin/principal bin/syncbased
	@true

distclean: clean
	@$(RM) -f bin/principal
	@$(RM) -f bin/syncbased

clean:
	@$(RM) -fr tmp
	@$(RM) -fr credentials

bin/principal:
	jiri go build -a -o $@ v.io/x/ref/cmd/principal

bin/syncbased:
	jiri go build -a -o $@ v.io/x/ref/services/syncbase/syncbased

tmp:
	mkdir -p $@

credentials: bin/principal
	./bin/principal seekblessings --v23.credentials ./credentials
	touch $@

# Easy way to make --v23.permissions.literal?
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
		--v23.tcp.address=":$(port)" \
		--v23.credentials="credentials" \
		--v23.permissions.literal='{"Admin":{"In":["..."]},"Write":{"In":["..."]},"Read":{"In":["..."]},"Resolve":{"In":["..."]},"Debug":{"In":["..."]}}'
