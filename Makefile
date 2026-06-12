# PyJhora parity harness orchestration.

# Pipeline stages share results/ files; parallel make would race discovery.
.NOTPARALLEL:

SHELL := /bin/bash
PYTHON := $(shell [ -x .venv/bin/python ] && echo .venv/bin/python || echo python)
FIXTURES := $(shell find parity-tools/harness/fixtures -name '*.json' 2>/dev/null)

.PHONY: parity parity-discover parity-run-python parity-run-typescript parity-compare parity-report parity-test

parity-discover:
	$(PYTHON) parity-tools/harness/discover.py

parity-run-python: parity-discover
	@if [ -z "$(FIXTURES)" ]; then \
	  echo "No fixtures found; skipping Python run."; \
	else \
	  $(PYTHON) parity-tools/harness/run_python.py $(FIXTURES); \
	fi

parity-run-typescript: parity-discover
	@if [ -z "$(FIXTURES)" ]; then \
	  echo "No fixtures found; skipping TypeScript run."; \
	else \
	  cd pyjhora-web && npx tsx ../parity-tools/harness/run_typescript.ts $(addprefix ../,$(FIXTURES)); \
	fi

parity-compare: parity-run-python parity-run-typescript
	@if [ -z "$(FIXTURES)" ]; then \
	  echo "No fixtures; skipping compare."; \
	else \
	  $(PYTHON) parity-tools/harness/compare.py $(FIXTURES); \
	fi

parity-report: parity-compare
	$(PYTHON) parity-tools/harness/report.py

parity: parity-report
	@echo ""
	@echo "Parity report written to parity-tools/harness/report.md"

parity-test:
	$(PYTHON) -m pytest parity-tools/harness/tests/ -v
	cd pyjhora-web && npx vitest run tests/parity/
