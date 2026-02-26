---
name: parity-report
description: Generate a comprehensive Python vs TypeScript parity report by dynamically scanning all module pairs and analyzing them in parallel with deep logic comparison. Creates a detailed comparison with feature-level summaries and function-by-function breakdowns, plus an implementation task list.
disable-model-invocation: true
argument-hint: "[optional: specific-module-name or 'refresh' to rescan modules]"
---

# Parity Report Generator

Generate a comprehensive, deep-logic parity report comparing the Python source (`src/jhora/`) against the TypeScript port (`pyjhora-web/src/`). The goal is **100% feature match** between Python and TypeScript — every function (public AND private), every formula, every constant must match.

## Step 0: Module Registry (Config File)

A module registry config file lives at `.claude/skills/parity-report/module-registry.json`. This avoids re-scanning every run.

**If the file exists AND `$ARGUMENTS` is NOT "refresh"**: Read it and use the cached module pairs.

**If the file does NOT exist OR `$ARGUMENTS` is "refresh"**: Run discovery (Step 1) and save results to the config file.

The config file format:

```json
{
  "lastUpdated": "2026-02-26T12:00:00Z",
  "modules": [
    {
      "name": "drik",
      "category": "panchanga",
      "pyPath": "src/jhora/panchanga/drik.py",
      "tsPath": "pyjhora-web/src/core/panchanga/drik.ts",
      "status": "paired"
    },
    {
      "name": "surya_sidhantha",
      "category": "panchanga",
      "pyPath": "src/jhora/panchanga/surya_sidhantha.py",
      "tsPath": null,
      "status": "unported",
      "skipReason": "experimental"
    }
  ],
  "excludedPatterns": ["__init__.py", "test_*.py", "setup.py", "ui/*.py", "_package_info.py"]
}
```

## Step 1: Dynamic Module Discovery

Scan ALL `.py` files under `src/jhora/` recursively using Glob. For each Python file:

1. **Exclude**: `__init__.py`, `test_*.py`, `setup.py`, `_package_info.py`, and everything under `ui/` (UI code doesn't port to web)
2. **Categorize** by directory:
   - `panchanga/` → category "panchanga"
   - `horoscope/chart/` → category "horoscope-chart"
   - `horoscope/dhasa/graha/` → category "dhasa-graha"
   - `horoscope/dhasa/raasi/` → category "dhasa-raasi"
   - `horoscope/dhasa/annual/` → category "dhasa-annual"
   - `horoscope/dhasa/` (top-level files) → category "dhasa-other"
   - `horoscope/match/` → category "match"
   - `horoscope/transit/` → category "transit"
   - `horoscope/prediction/` → category "prediction"
   - Root (`const.py`, `utils.py`) → category "core"
3. **Find TS counterpart**: For each Python file, search for a matching `.ts` file in `pyjhora-web/src/`. Apply these name mapping rules:
   - Snake case → kebab case: `buddhi_gathi.py` → `buddhi-gathi.ts`
   - Underscores → hyphens in general
   - Some names differ slightly — use fuzzy matching if exact match fails (e.g., `sataatbika` ↔ `sataabdika`, `chathuraaseethi_sama` ↔ `chaturaseethi`)
   - `const.py` → `constants.ts`
   - `utils.py` → check `utils/` directory for multiple TS files
   - If no match found after fuzzy search, use Grep to search for Python function names in TS files to locate the correct file
4. **Mark status**: "paired" (has TS file), "unported" (no TS file), or "skip" (experimental/excluded)

Save the complete registry to `.claude/skills/parity-report/module-registry.json`.

## Step 2: Launch Parallel Deep-Analysis Agents

If `$ARGUMENTS` is a specific module name, only analyze that module. Otherwise, analyze ALL paired modules.

For each module pair (or batch of small related modules), launch a Task agent with `subagent_type: "Explore"` to perform a **deep logic comparison**. Launch agents in parallel, grouping small modules (< 500 lines) into batches of 2-3 per agent. Large modules (drik.py, yoga.py, charts.py, house.py, main.py) each get their own dedicated agent.

### Agent Prompt Template

Each agent receives:

```
You are performing a deep logic comparison between a Python module and its TypeScript port.
The goal is 100% feature parity — every function, every formula, every branch must match.

**Python file**: {pyPath}
**TypeScript file**: {tsPath}
**Module name**: {moduleName}

## Instructions

### Phase 1: Inventory
1. Read BOTH files completely.
2. Extract EVERY function (public AND private/underscore-prefixed) from the Python file. For each:
   - Function name
   - Full parameter list with any defaults
   - Return type (inferred from code if no annotation)
   - Line number in the Python file
   - Whether it's public or private (starts with `_`)
3. Do the same for the TypeScript file (exported, non-exported, helper functions).
4. Create a mapping: Python function → TS function (match by name after case conversion, or by logic if names differ).

### Phase 2: Deep Logic Comparison
For EACH Python function that has a TS counterpart, compare the ACTUAL LOGIC:

1. **Parameters**: Do they accept the same inputs? Are defaults the same? Are any parameters missing in TS?
2. **Algorithm**: Walk through the Python logic step by step. Does the TS version do the same thing?
   - Check mathematical formulas — every term, every operator, every constant
   - Check conditional branches — same conditions? Same order?
   - Check loop logic — same iteration? Same termination?
   - Check data structure usage — same lookups, same indexing?
3. **Edge cases**: Does TS handle the same edge cases (None/null checks, boundary values, zero division)?
4. **Constants/tables**: If the function uses lookup tables or constants, are they identical in TS?
5. **Dependencies**: Does the function call other functions? Are those calls the same in TS?
6. **Return value**: Is the return format/structure identical?

Mark each function with one of:
- **MATCH**: Logic is identical (minor syntax differences like Python `//` vs JS `Math.floor()` are fine if semantically equivalent)
- **LOGIC_DIFF**: The algorithm or formula differs in a way that would produce different results
- **PARAM_DIFF**: Parameters differ (missing, extra, different defaults)
- **PARTIAL**: Function exists but is incomplete (stub, TODO, or missing branches)
- **MISSING**: No TS counterpart at all
- **EXTRA_TS**: Exists in TS but not in Python

### Phase 3: Output Format

Output your analysis in this EXACT format (this is critical for downstream parsing):

---BEGIN_MODULE_REPORT---
## Module: {moduleName}
**Category**: {category}
**Python**: `{pyPath}` — {lineCount} lines, {totalFunctions} functions ({publicCount} public, {privateCount} private)
**TypeScript**: `{tsPath}` — {lineCount} lines, {totalFunctions} functions ({exportedCount} exported, {internalCount} internal)

### Parity Summary
- **Full Match**: {count} functions
- **Logic Differences**: {count} functions
- **Parameter Differences**: {count} functions
- **Partial/Incomplete**: {count} functions
- **Missing in TS**: {count} functions
- **Extra in TS**: {count} functions
- **Parity Score**: {matchCount}/{totalPyFunctions} ({percentage}%)

### Function-by-Function Comparison

#### MATCH ({count})
| # | Python Function | TS Function | Py Line | TS Line |
|---|----------------|-------------|---------|---------|
| 1 | `func_name(a, b)` | `funcName(a, b)` | 123 | 45 |

#### LOGIC_DIFF ({count})
| # | Python Function | TS Function | Py Line | TS Line | Difference |
|---|----------------|-------------|---------|---------|------------|
| 1 | `func_name(a, b)` | `funcName(a, b)` | 123 | 45 | Python uses `x // y`, TS uses `x / y` (missing floor) |

For each LOGIC_DIFF, include a detailed explanation:

**`func_name`** (Python L123, TS L45):
- Python: `result = (a * b + c) // d`
- TS: `result = (a * b + c) / d`
- Impact: TS returns float instead of integer, will cause downstream rounding errors
- Fix: Change to `Math.floor((a * b + c) / d)`

#### PARAM_DIFF ({count})
| # | Python Function | TS Function | Difference |
|---|----------------|-------------|------------|
| 1 | `func(a, b, c=True)` | `func(a, b)` | Missing param `c` with default `True` |

#### PARTIAL ({count})
| # | Python Function | TS Function | What's Missing |
|---|----------------|-------------|----------------|
| 1 | `func_name` | `funcName` | Missing else-branch for retrograde planets |

#### MISSING in TS ({count})
| # | Python Function | Py Line | Description | Priority |
|---|----------------|---------|-------------|----------|
| 1 | `_helper_func(x)` | 456 | Computes X used by `public_func` | HIGH — blocks `public_func` |

#### EXTRA in TS ({count})
| # | TS Function | TS Line | Notes |
|---|-------------|---------|-------|
| 1 | `helperAsync(x)` | 78 | Async wrapper, no Python equivalent needed |

### Implementation Tasks
For each non-MATCH function, generate a task:

```task
- id: {moduleName}-{number}
  function: {pythonFuncName}
  type: {LOGIC_DIFF|PARAM_DIFF|PARTIAL|MISSING}
  priority: {HIGH|MEDIUM|LOW}
  pyFile: {pyPath}
  pyLine: {lineNumber}
  tsFile: {tsPath}
  tsLine: {lineNumber or "N/A"}
  description: >
    Detailed description of what needs to change.
    Include the exact formula/logic that needs to be fixed or ported.
  dependencies:
    - {other-task-ids this depends on, if any}
```

---END_MODULE_REPORT---
```

## Step 3: Combine Results into Final Report

After ALL agents complete, combine their outputs into a single report. Save it to the `parity-reports/` directory in the repo root. **Create the directory if it does not exist** (using `mkdir -p parity-reports`). The file should be named `parity-report-YYYY-MM-DD.md`.

### Final Report Structure

```markdown
# Python ↔ TypeScript Parity Report
**Generated**: YYYY-MM-DD HH:MM
**Python source**: src/jhora/
**TypeScript port**: pyjhora-web/src/

---

## Executive Summary

| Metric | Count |
|--------|-------|
| Python modules scanned | N |
| TS modules found (paired) | N |
| Unported modules | N |
| Skipped modules (experimental/UI) | N |
| Total Python functions (public + private) | N |
| Functions with full parity (MATCH) | N (X%) |
| Functions with logic differences (LOGIC_DIFF) | N (X%) |
| Functions with parameter differences (PARAM_DIFF) | N (X%) |
| Functions partially ported (PARTIAL) | N (X%) |
| Functions missing in TS (MISSING) | N (X%) |
| Extra TS functions | N |

### Overall Parity Score: X/100

Score = (MATCH count / total Python functions) * 100

---

## Module-by-Module Analysis

### Panchanga
[All module reports in this category]

### Horoscope / Charts
[All module reports in this category]

### Dhasa / Graha
[All module reports in this category]

### Dhasa / Raasi
[All module reports in this category]

### Dhasa / Annual & Other
[All module reports in this category]

### Match / Compatibility
[All module reports in this category]

### Transit
[All module reports in this category]

### Core (Constants, Utils)
[All module reports in this category]

---

## Unported Modules

| Module | Category | Python Path | Line Count | Function Count | Reason |
|--------|----------|-------------|------------|----------------|--------|
| surya_sidhantha | panchanga | src/jhora/panchanga/surya_sidhantha.py | N | N | Experimental |

---

## Consolidated Implementation Plan

Aggregate ALL tasks from individual module reports. Sort by priority, then by dependency order.

### Critical (HIGH Priority)
These are logic differences and missing functions that directly affect calculation accuracy.

- [ ] **{task-id}**: {description} (`{pyPath}` L{line} → `{tsPath}`)

### Important (MEDIUM Priority)
Parameter differences and partial implementations.

- [ ] **{task-id}**: {description}

### Backlog (LOW Priority)
Extra utilities, experimental features.

- [ ] **{task-id}**: {description}

### Dependency Graph
List any task dependencies (task X must be done before task Y).

---

## Appendix: Complete Function Inventory

A full CSV-style table of every Python function and its TS status:

| Category | Module | Python Function | Visibility | Py Line | TS Function | TS Line | Status |
|----------|--------|----------------|-----------|---------|-------------|---------|--------|
| panchanga | drik | sunrise | public | 100 | sunrise | 50 | MATCH |
| panchanga | drik | _get_tithi | private | 200 | getTithi | 100 | LOGIC_DIFF |
```

## Step 4: Summary Output

After saving the report file to `parity-reports/parity-report-YYYY-MM-DD.md`, print a brief summary to the conversation:
- File saved location (should be `parity-reports/parity-report-YYYY-MM-DD.md`)
- Overall parity score
- Top 5 most critical issues
- Count of tasks by priority

## Important Guidelines

- **Deep logic matters**: Surface-level signature matching is NOT enough. Read the actual function bodies and compare formulas line by line. A function that exists in TS but computes a different result is worse than a missing function.
- **Private functions are full citizens**: A private `_helper()` in Python that powers 10 public functions is HIGH priority if missing or wrong in TS.
- **Be precise about differences**: Don't say "logic differs". Say exactly WHAT differs: "Python uses `(a + b) % 12` but TS uses `(a + b) % 11`".
- **Formula accuracy**: For astronomical calculations, even tiny formula differences (wrong constant, missing term, different rounding) matter. Flag them all.
- **Async vs sync**: Note when Python is sync but TS is async (or vice versa), but this alone is NOT a logic difference — it's an architectural note.
- **Language idiom differences are OK**: `for i in range(n)` vs `for (let i = 0; i < n; i++)` is fine. `x // y` vs `Math.floor(x / y)` is fine. Focus on SEMANTIC differences.
- **Don't skip large files**: drik.py (183KB), yoga.py (364KB), charts.py (142KB), house.py (71KB) are the MOST important files. Give them dedicated agents and thorough analysis.
