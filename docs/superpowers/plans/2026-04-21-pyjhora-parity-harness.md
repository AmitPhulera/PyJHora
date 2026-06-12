# PyJhora Parity Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cross-validation harness that enumerates Python functions in `src/jhora/`, finds their TS counterparts in `pyjhora-web/src/core/` via `@parity` tags, runs both sides against shared JSON fixtures, and produces a divergence report.

**Architecture:** Three Python scripts (`discover.py`, `run_python.py`, `compare.py`, `report.py`) + one TS script (`run_typescript.ts`) + shared coercion modules + JSON fixtures. Orchestrated by a Makefile. Seeded with 5 fixtures for `drik.py` (tithi, nakshatra, yogam, karana, vaara). Phase B backfills `@parity` tags across all non-excluded modules.

**Tech Stack:** Python 3.11, pytest, PyYAML, pyswisseph (existing). TypeScript, tsx, vitest (existing). Makefile orchestration.

**Spec:** `docs/superpowers/specs/2026-04-20-pyjhora-parity-harness-design.md`

---

## File Structure

```
parity-tools/
├── exclusions.yaml                  Config: Python modules intentionally not ported
├── README.md                        Usage + how to add @parity tags + how to add fixtures
└── harness/
    ├── __init__.py
    ├── coercion.py                  Python: tag-aware JSON → native (Place, Date, chart arrays)
    ├── coercion.ts                  TS: tag-aware JSON → native
    ├── discover.py                  CLI: emit discovery.json
    ├── run_python.py                CLI: run fixtures, emit results/python/*.json
    ├── run_typescript.ts            CLI: run fixtures, emit results/typescript/*.json
    ├── compare.py                   CLI: diff results, emit results/diff/*.json
    ├── report.py                    CLI: consolidate discovery + diffs into report.md
    ├── fixtures/
    │   └── panchanga/drik/
    │       ├── tithi.json
    │       ├── nakshatra.json
    │       ├── yogam.json
    │       ├── karana.json
    │       └── vaara.json
    ├── results/                     Per-run output (gitignored)
    │   ├── python/
    │   ├── typescript/
    │   ├── diff/
    │   └── discovery.json
    └── tests/
        ├── __init__.py
        ├── test_coercion.py
        ├── test_discover.py
        ├── test_compare.py
        └── test_report.py

Makefile                             Root: `make parity` entry point
pyjhora-web/tests/coercion.test.ts   TS coercion tests (lives with other TS tests)
```

Root-level additions:
- `.gitignore`: add `parity-tools/harness/results/`
- `pyjhora-web/package.json`: add `tsx` devDep, add `parity:run` script

---

## Task 1: Directory scaffold + exclusions config + gitignore

**Files:**
- Create: `parity-tools/exclusions.yaml`
- Create: `parity-tools/harness/__init__.py`
- Create: `parity-tools/harness/tests/__init__.py`
- Create: `parity-tools/harness/fixtures/.gitkeep`
- Create: `parity-tools/harness/results/.gitkeep`
- Modify: `.gitignore`

- [ ] **Step 1: Create the directory tree**

```bash
mkdir -p parity-tools/harness/tests
mkdir -p parity-tools/harness/fixtures
mkdir -p parity-tools/harness/results/python
mkdir -p parity-tools/harness/results/typescript
mkdir -p parity-tools/harness/results/diff
touch parity-tools/harness/__init__.py
touch parity-tools/harness/tests/__init__.py
touch parity-tools/harness/fixtures/.gitkeep
touch parity-tools/harness/results/.gitkeep
```

- [ ] **Step 2: Create `parity-tools/exclusions.yaml`**

```yaml
# Python modules intentionally excluded from parity checks.
# Discovery skips any module matching these globs.

- path: jhora/ui/**
  reason: PyQt6 UI, replaced by React UI in pyjhora-web/src/components
- path: jhora/horoscope/prediction/**
  reason: Marked experimental in CLAUDE.md; not ported
- path: jhora/panchanga/surya_sidhantha.py
  reason: Experimental alternative ephemeris
- path: jhora/panchanga/khanda_khaadyaka.py
  reason: Experimental alternative ephemeris
- path: jhora/panchanga/drik1.py
  reason: Legacy/alternative drik implementation
- path: jhora/tests/**
  reason: Python test harness itself, not a calculation module
- path: jhora/lang/**
  reason: Language resource files
- path: jhora/data/**
  reason: Data files (ephemeris, etc.)
```

- [ ] **Step 3: Update `.gitignore`**

Append to existing `.gitignore`:

```
# Parity harness runtime output
parity-tools/harness/results/python/*
parity-tools/harness/results/typescript/*
parity-tools/harness/results/diff/*
parity-tools/harness/results/discovery.json
parity-tools/harness/report.md
!parity-tools/harness/results/.gitkeep
```

- [ ] **Step 4: Commit**

```bash
git add parity-tools/ .gitignore
git commit -m "feat(parity): scaffold parity-tools directory + exclusions config"
```

---

## Task 2: Install harness Python dependencies

**Files:**
- Modify: `requirements.txt`

The harness uses `pyyaml` (read exclusions) and `pytest` (run harness unit tests). `pyswisseph` is already present.

- [ ] **Step 1: Check current requirements**

```bash
cat requirements.txt
```

- [ ] **Step 2: Add pyyaml and pytest if missing**

Append to `requirements.txt` (only if not already present):

```
pyyaml>=6.0
pytest>=7.0
```

- [ ] **Step 3: Install**

```bash
pip install -r requirements.txt
```

Expected: `pyyaml` and `pytest` install without error.

- [ ] **Step 4: Verify pytest works**

```bash
pytest --version
```

Expected: pytest version printed.

- [ ] **Step 5: Commit**

```bash
git add requirements.txt
git commit -m "feat(parity): add pyyaml + pytest for harness"
```

---

## Task 3: Install tsx in pyjhora-web

**Files:**
- Modify: `pyjhora-web/package.json`

`run_typescript.ts` is invoked via `tsx`. It's not currently installed.

- [ ] **Step 1: Install tsx as devDep**

```bash
cd pyjhora-web && npm install --save-dev tsx
```

Expected: `tsx` added to `devDependencies`, no errors.

- [ ] **Step 2: Verify**

```bash
cd pyjhora-web && npx tsx --version
```

Expected: tsx version printed.

- [ ] **Step 3: Commit**

```bash
git add pyjhora-web/package.json pyjhora-web/package-lock.json
git commit -m "feat(parity): add tsx to pyjhora-web devDeps for TS runner"
```

---

## Task 4: Python coercion module (primitives + Place)

**Files:**
- Create: `parity-tools/harness/coercion.py`
- Create: `parity-tools/harness/tests/test_coercion.py`

Converts tag-aware JSON values into native Python structures. Keeps fixtures self-describing.

- [ ] **Step 1: Write failing tests**

Create `parity-tools/harness/tests/test_coercion.py`:

```python
"""Tests for parity-tools/harness/coercion.py"""
import sys
from pathlib import Path

# Import harness module; path setup so tests work from any cwd.
_HARNESS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_HARNESS))

from coercion import coerce  # noqa: E402


def test_passes_through_primitives():
    assert coerce(7) == 7
    assert coerce(3.14) == 3.14
    assert coerce("hello") == "hello"
    assert coerce(True) is True
    assert coerce(None) is None


def test_passes_through_list():
    assert coerce([1, 2, 3]) == [1, 2, 3]


def test_passes_through_plain_dict():
    # A dict without __type is just a dict.
    assert coerce({"a": 1, "b": 2}) == {"a": 1, "b": 2}


def test_coerces_place():
    import sys as _sys
    # Resolve src/jhora on sys.path so utils.Place can be found.
    repo_root = Path(__file__).resolve().parents[3]
    _sys.path.insert(0, str(repo_root / "src"))
    from jhora.panchanga.drik import Place

    tagged = {
        "__type": "Place",
        "value": {"name": "Bangalore", "latitude": 12.97, "longitude": 77.58, "timezone": 5.5},
    }
    result = coerce(tagged)
    assert isinstance(result, Place)
    assert result.latitude == 12.97
    assert result.longitude == 77.58
    assert result.timezone == 5.5


def test_coerces_nested_structures():
    tagged = {
        "nested": {
            "__type": "Place",
            "value": {"name": "X", "latitude": 0.0, "longitude": 0.0, "timezone": 0.0},
        },
        "list_of_places": [
            {"__type": "Place", "value": {"name": "A", "latitude": 1.0, "longitude": 2.0, "timezone": 3.0}},
        ],
    }
    result = coerce(tagged)
    # Should recurse into dict values and list items.
    from jhora.panchanga.drik import Place
    assert isinstance(result["nested"], Place)
    assert isinstance(result["list_of_places"][0], Place)
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest parity-tools/harness/tests/test_coercion.py -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'coercion'`.

- [ ] **Step 3: Implement `coerce`**

Create `parity-tools/harness/coercion.py`:

```python
"""Tag-aware JSON coercion for parity harness fixtures.

Converts JSON values tagged with {"__type": "...", "value": ...} into native
Python structures. Plain primitives, lists, and untagged dicts pass through
unchanged (with recursion into their members).
"""
import sys
from pathlib import Path

# Make jhora package importable regardless of invocation cwd.
_REPO_ROOT = Path(__file__).resolve().parents[2]
_SRC = _REPO_ROOT / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from jhora.panchanga.drik import Date, Place  # noqa: E402


def _coerce_place(value):
    return Place(value["name"], value["latitude"], value["longitude"], value["timezone"])


def _coerce_date(value):
    return Date(value["year"], value["month"], value["day"])


_COERCERS = {
    "Place": _coerce_place,
    "Date": _coerce_date,
}


def coerce(node):
    """Recursively convert tagged JSON to native Python values."""
    if isinstance(node, dict):
        type_tag = node.get("__type")
        if type_tag is not None:
            coercer = _COERCERS.get(type_tag)
            if coercer is None:
                raise ValueError(f"Unknown __type tag: {type_tag!r}")
            return coercer(node["value"])
        return {k: coerce(v) for k, v in node.items()}
    if isinstance(node, list):
        return [coerce(x) for x in node]
    return node
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest parity-tools/harness/tests/test_coercion.py -v
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add parity-tools/harness/coercion.py parity-tools/harness/tests/test_coercion.py
git commit -m "feat(parity): Python coercion module (Place, Date, recursive)"
```

---

## Task 5: TypeScript coercion module

**Files:**
- Create: `pyjhora-web/src/parity/coercion.ts`
- Create: `pyjhora-web/tests/parity/coercion.test.ts`

TS mirror of the Python coercion table.

- [ ] **Step 1: Write failing test**

Create `pyjhora-web/tests/parity/coercion.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { coerce } from '../../src/parity/coercion';

describe('coerce', () => {
  it('passes through primitives', () => {
    expect(coerce(7)).toBe(7);
    expect(coerce(3.14)).toBe(3.14);
    expect(coerce('hello')).toBe('hello');
    expect(coerce(true)).toBe(true);
    expect(coerce(null)).toBe(null);
  });

  it('passes through arrays', () => {
    expect(coerce([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('passes through plain objects', () => {
    expect(coerce({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
  });

  it('coerces Place to {latitude, longitude, timezone}', () => {
    const tagged = {
      __type: 'Place',
      value: { name: 'Bangalore', latitude: 12.97, longitude: 77.58, timezone: 5.5 },
    };
    const result = coerce(tagged) as { latitude: number; longitude: number; timezone: number };
    expect(result.latitude).toBe(12.97);
    expect(result.longitude).toBe(77.58);
    expect(result.timezone).toBe(5.5);
    // Place name is dropped (TS side does not use it).
    expect('name' in result).toBe(false);
  });

  it('recurses into nested structures', () => {
    const tagged = {
      nested: { __type: 'Place', value: { name: 'X', latitude: 0, longitude: 0, timezone: 0 } },
      list: [{ __type: 'Place', value: { name: 'A', latitude: 1, longitude: 2, timezone: 3 } }],
    };
    const result = coerce(tagged) as { nested: any; list: any[] };
    expect(result.nested.latitude).toBe(0);
    expect(result.list[0].longitude).toBe(2);
  });

  it('throws on unknown __type', () => {
    expect(() => coerce({ __type: 'Unknown', value: {} })).toThrow(/Unknown __type/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd pyjhora-web && npx vitest run tests/parity/coercion.test.ts
```

Expected: FAIL, module not found.

- [ ] **Step 3: Implement `coerce`**

Create `pyjhora-web/src/parity/coercion.ts`:

```typescript
/**
 * Tag-aware JSON coercion for parity harness fixtures.
 * Mirror of parity-tools/harness/coercion.py.
 *
 * Converts JSON values tagged with {__type, value} into native TS structures.
 * Plain primitives, arrays, and untagged objects pass through (with recursion).
 */

type Coercer = (value: any) => any;

const coercers: Record<string, Coercer> = {
  Place: (value) => ({
    latitude: value.latitude,
    longitude: value.longitude,
    timezone: value.timezone,
  }),
  Date: (value) => ({
    year: value.year,
    month: value.month,
    day: value.day,
  }),
};

export function coerce(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map((x) => coerce(x));
  }
  if (node !== null && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    const typeTag = obj.__type as string | undefined;
    if (typeTag !== undefined) {
      const coercer = coercers[typeTag];
      if (coercer === undefined) {
        throw new Error(`Unknown __type tag: ${typeTag}`);
      }
      return coercer(obj.value);
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = coerce(v);
    }
    return out;
  }
  return node;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd pyjhora-web && npx vitest run tests/parity/coercion.test.ts
```

Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add pyjhora-web/src/parity/coercion.ts pyjhora-web/tests/parity/coercion.test.ts
git commit -m "feat(parity): TS coercion module (mirror of Python)"
```

---

## Task 6: discover.py — exclusions filter

**Files:**
- Create: `parity-tools/harness/discover.py`
- Create: `parity-tools/harness/tests/test_discover.py`

Start small: walk the tree, apply exclusions, list remaining module paths.

- [ ] **Step 1: Write failing test**

Create `parity-tools/harness/tests/test_discover.py`:

```python
"""Tests for parity-tools/harness/discover.py"""
import sys
from pathlib import Path

_HARNESS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_HARNESS))

from discover import list_python_modules  # noqa: E402


def test_lists_drik_py():
    modules = list_python_modules()
    module_paths = [m["path"] for m in modules]
    assert "jhora/panchanga/drik.py" in module_paths


def test_excludes_ui():
    modules = list_python_modules()
    for m in modules:
        assert not m["path"].startswith("jhora/ui/"), f"Should exclude {m['path']}"


def test_excludes_tests():
    modules = list_python_modules()
    for m in modules:
        assert not m["path"].startswith("jhora/tests/"), f"Should exclude {m['path']}"


def test_excludes_experimental_ephemeris():
    modules = list_python_modules()
    module_paths = {m["path"] for m in modules}
    assert "jhora/panchanga/surya_sidhantha.py" not in module_paths
    assert "jhora/panchanga/khanda_khaadyaka.py" not in module_paths


def test_lists_at_least_10_modules():
    modules = list_python_modules()
    assert len(modules) >= 10, f"Expected many modules, got {len(modules)}"
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest parity-tools/harness/tests/test_discover.py -v
```

Expected: FAIL, `discover` module not found.

- [ ] **Step 3: Implement `list_python_modules`**

Create `parity-tools/harness/discover.py`:

```python
"""Enumerate Python calculation modules for the parity harness.

Walks src/jhora/, applies exclusions from parity-tools/exclusions.yaml,
returns a list of module descriptors.
"""
import fnmatch
import sys
from pathlib import Path

import yaml

_HARNESS_DIR = Path(__file__).resolve().parent
_PARITY_TOOLS = _HARNESS_DIR.parent
_REPO_ROOT = _PARITY_TOOLS.parent
_JHORA_SRC = _REPO_ROOT / "src"


def _load_exclusions():
    with open(_PARITY_TOOLS / "exclusions.yaml") as f:
        entries = yaml.safe_load(f) or []
    return [e["path"] for e in entries]


def _is_excluded(rel_path: str, patterns) -> bool:
    for pat in patterns:
        if fnmatch.fnmatch(rel_path, pat):
            return True
    return False


def list_python_modules():
    """Return [{path: 'jhora/.../x.py', module: 'jhora.....x'}, ...]"""
    exclusions = _load_exclusions()
    results = []
    jhora_root = _JHORA_SRC / "jhora"
    for py_file in sorted(jhora_root.rglob("*.py")):
        if py_file.name == "__init__.py":
            continue
        rel = py_file.relative_to(_JHORA_SRC)
        rel_str = rel.as_posix()
        if _is_excluded(rel_str, exclusions):
            continue
        module_dotted = rel_str[:-3].replace("/", ".")
        results.append({"path": rel_str, "module": module_dotted})
    return results


if __name__ == "__main__":
    for m in list_python_modules():
        print(m["path"])
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pytest parity-tools/harness/tests/test_discover.py -v
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add parity-tools/harness/discover.py parity-tools/harness/tests/test_discover.py
git commit -m "feat(parity): discover.py — module enumeration with exclusions"
```

---

## Task 7: discover.py — function enumeration + @parity tag parsing

**Files:**
- Modify: `parity-tools/harness/discover.py`
- Modify: `parity-tools/harness/tests/test_discover.py`

Given a module path, list its public functions and their `@parity` tags.

- [ ] **Step 1: Append failing tests**

Append to `parity-tools/harness/tests/test_discover.py`:

```python
from discover import enumerate_functions, parse_parity_tag  # noqa: E402


def test_parses_parity_tag_basic():
    source_lines = [
        "# @parity: ts=calculateTithiAsync",
        "def tithi(jd, place):",
        "    pass",
    ]
    tag = parse_parity_tag(source_lines, def_line_index=1)
    assert tag == {"ts": "calculateTithiAsync", "notes": None}


def test_parses_parity_tag_with_notes():
    source_lines = [
        '# @parity: ts=calculateTithiAsync, notes="Python sync, TS async"',
        "def tithi(jd, place):",
        "    pass",
    ]
    tag = parse_parity_tag(source_lines, def_line_index=1)
    assert tag == {"ts": "calculateTithiAsync", "notes": "Python sync, TS async"}


def test_returns_none_when_no_tag():
    source_lines = [
        '"""Some docstring."""',
        "def tithi(jd, place):",
        "    pass",
    ]
    tag = parse_parity_tag(source_lines, def_line_index=1)
    assert tag is None


def test_enumerate_functions_drik_includes_tithi():
    fns = enumerate_functions("jhora/panchanga/drik.py")
    names = [f["name"] for f in fns]
    assert "tithi" in names
    assert "nakshatra" in names
    assert "yogam" in names
    assert "karana" in names
    assert "vaara" in names


def test_enumerate_functions_skips_private():
    fns = enumerate_functions("jhora/panchanga/drik.py")
    for f in fns:
        assert not f["name"].startswith("_"), f"Should skip private fn {f['name']}"
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest parity-tools/harness/tests/test_discover.py -v
```

Expected: `enumerate_functions` and `parse_parity_tag` undefined.

- [ ] **Step 3: Implement tag parser + enumeration**

Append to `parity-tools/harness/discover.py`:

```python
import ast
import importlib
import inspect
import re

_TAG_RE = re.compile(
    r'@parity:\s*(?P<lang>ts|py)=(?P<target>[\w.]+)'
    r'(?:,\s*notes="(?P<notes>[^"]*)")?'
)


def parse_parity_tag(source_lines, def_line_index: int):
    """Scan upward from def_line_index for a @parity tag in a comment.

    Stops at the first non-blank line that is not a comment.
    Returns {lang_key: target, 'notes': str|None} or None.
    """
    i = def_line_index - 1
    while i >= 0:
        line = source_lines[i].strip()
        if line == "":
            i -= 1
            continue
        if line.startswith("#"):
            m = _TAG_RE.search(line)
            if m:
                return {m.group("lang"): m.group("target"), "notes": m.group("notes")}
        # Non-blank non-comment line: stop searching.
        return None
    return None


def enumerate_functions(module_rel_path: str):
    """Return [{name, signature, parity_tag, line}, ...] for a Python module.

    Uses runtime import (handles dynamically-registered functions) but falls
    back to AST-only for modules that fail to import.
    """
    module_dotted = module_rel_path[:-3].replace("/", ".")
    source_path = _JHORA_SRC / module_rel_path
    source_lines = source_path.read_text().splitlines()

    try:
        # Ensure src/ is on sys.path.
        if str(_JHORA_SRC) not in sys.path:
            sys.path.insert(0, str(_JHORA_SRC))
        module = importlib.import_module(module_dotted)
        pairs = inspect.getmembers(module, inspect.isfunction)
        # Filter to functions defined in this module (not re-exported).
        pairs = [(n, f) for n, f in pairs if getattr(f, "__module__", None) == module_dotted]
    except Exception:
        # Fall back to AST for modules that can't be imported.
        tree = ast.parse(source_path.read_text())
        pairs = []
        class _FnCollector(ast.NodeVisitor):
            def visit_FunctionDef(self, node):
                pairs.append((node.name, node))
            visit_AsyncFunctionDef = visit_FunctionDef
        _FnCollector().visit(tree)

    results = []
    for name, obj in pairs:
        if name.startswith("_"):
            continue
        try:
            line = inspect.getsourcelines(obj)[1] if not isinstance(obj, ast.AST) else obj.lineno
        except (OSError, TypeError):
            line = None
        try:
            signature = str(inspect.signature(obj)) if not isinstance(obj, ast.AST) else ""
        except (ValueError, TypeError):
            signature = ""
        tag = None
        if line is not None:
            tag = parse_parity_tag(source_lines, def_line_index=line - 1)
        results.append({
            "name": name,
            "line": line,
            "signature": signature,
            "parity_tag": tag,
        })
    return results
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest parity-tools/harness/tests/test_discover.py -v
```

Expected: all 10 tests pass.

- [ ] **Step 5: Commit**

```bash
git add parity-tools/harness/discover.py parity-tools/harness/tests/test_discover.py
git commit -m "feat(parity): function enumeration + @parity tag parsing"
```

---

## Task 8: discover.py — TS export existence check

**Files:**
- Modify: `parity-tools/harness/discover.py`
- Modify: `parity-tools/harness/tests/test_discover.py`

Given a `typescript_target` like `@/core/panchanga/drik::calculateTithiAsync`, verify that the file exists and the named export exists.

- [ ] **Step 1: Append failing tests**

```python
from discover import resolve_ts_target, ts_export_exists  # noqa: E402


def test_resolve_ts_target_splits_path_and_export():
    result = resolve_ts_target("@/core/panchanga/drik::calculateTithiAsync")
    # Returns absolute filesystem path + export name.
    assert result["export_name"] == "calculateTithiAsync"
    assert result["file_path"].endswith("pyjhora-web/src/core/panchanga/drik.ts")


def test_ts_export_exists_true_for_real_export():
    # Assumes drik.ts exists and exports calculateTithiAsync.
    assert ts_export_exists("@/core/panchanga/drik::calculateTithiAsync") is True


def test_ts_export_exists_false_for_missing_export():
    assert ts_export_exists("@/core/panchanga/drik::doesNotExistFn") is False


def test_ts_export_exists_false_for_missing_file():
    assert ts_export_exists("@/core/nonexistent/module::someFn") is False
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest parity-tools/harness/tests/test_discover.py -v -k ts
```

Expected: FAIL, undefined functions.

- [ ] **Step 3: Implement TS target resolution**

Append to `parity-tools/harness/discover.py`:

```python
_PYJHORA_WEB_SRC = _REPO_ROOT / "pyjhora-web" / "src"

_ALIAS_PREFIXES = {
    "@/": "",
    "@core/": "core/",
    "@components/": "components/",
    "@services/": "services/",
    "@hooks/": "hooks/",
    "@i18n/": "i18n/",
}


def resolve_ts_target(target: str):
    """Resolve '@/core/panchanga/drik::calculateTithiAsync' into
    {file_path: abs, export_name: str}.
    """
    if "::" not in target:
        raise ValueError(f"Invalid typescript_target (missing '::'): {target!r}")
    path_part, export_name = target.split("::", 1)

    resolved = None
    for prefix, replacement in _ALIAS_PREFIXES.items():
        if path_part.startswith(prefix):
            resolved = replacement + path_part[len(prefix):]
            break
    if resolved is None:
        resolved = path_part  # already relative under src/

    file_path = _PYJHORA_WEB_SRC / f"{resolved}.ts"
    return {"file_path": str(file_path), "export_name": export_name}


# Match `export function x`, `export async function x`, `export const x`,
# `export class x`, `export { x, y }`, `export type x`, `export interface x`.
_EXPORT_NAMED_RE = re.compile(
    r'^\s*export\s+(?:async\s+)?'
    r'(?:function|const|let|var|class|type|interface|enum)\s+(\w+)'
)
_EXPORT_BRACES_RE = re.compile(r'^\s*export\s*\{\s*([^}]+)\s*\}')


def ts_export_exists(target: str) -> bool:
    info = resolve_ts_target(target)
    file_path = Path(info["file_path"])
    if not file_path.exists():
        return False
    want = info["export_name"]
    for line in file_path.read_text().splitlines():
        m = _EXPORT_NAMED_RE.match(line)
        if m and m.group(1) == want:
            return True
        m = _EXPORT_BRACES_RE.match(line)
        if m:
            names = [n.split(" as ")[-1].strip() for n in m.group(1).split(",")]
            if want in names:
                return True
    return False
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest parity-tools/harness/tests/test_discover.py -v -k ts
```

Expected: all 4 new tests pass.

- [ ] **Step 5: Commit**

```bash
git add parity-tools/harness/discover.py parity-tools/harness/tests/test_discover.py
git commit -m "feat(parity): TS export existence check"
```

---

## Task 9: discover.py — full discovery + discovery.json output

**Files:**
- Modify: `parity-tools/harness/discover.py`
- Modify: `parity-tools/harness/tests/test_discover.py`

Tie it together: walk modules, enumerate functions, parse tags, check TS existence, check fixture presence, emit `discovery.json`.

- [ ] **Step 1: Append failing tests**

```python
from discover import run_discovery, fixture_path_for  # noqa: E402


def test_fixture_path_for():
    p = fixture_path_for("jhora.panchanga.drik.tithi")
    assert p.endswith("parity-tools/harness/fixtures/panchanga/drik/tithi.json")


def test_run_discovery_returns_summary_structure(tmp_path):
    out = tmp_path / "discovery.json"
    result = run_discovery(output_path=out)
    assert "generated_at" in result
    assert "functions" in result
    assert "summary" in result
    # Summary should have expected counts.
    for key in ("total", "ready", "no_fixture", "missing_ts", "broken_tag"):
        assert key in result["summary"]
    assert out.exists()


def test_run_discovery_finds_drik_functions(tmp_path):
    out = tmp_path / "discovery.json"
    result = run_discovery(output_path=out)
    targets = [f["python_target"] for f in result["functions"]]
    assert "jhora.panchanga.drik.tithi" in targets
```

- [ ] **Step 2: Run tests to verify they fail**

Expected: `run_discovery`, `fixture_path_for` undefined.

- [ ] **Step 3: Implement `run_discovery` + CLI**

Append to `parity-tools/harness/discover.py`:

```python
import datetime
import json


def fixture_path_for(python_target: str) -> str:
    """jhora.panchanga.drik.tithi -> .../fixtures/panchanga/drik/tithi.json"""
    parts = python_target.split(".")
    # Drop leading 'jhora'
    assert parts[0] == "jhora", f"Expected 'jhora.' prefix, got {python_target!r}"
    rel = "/".join(parts[1:-1]) + "/" + parts[-1] + ".json"
    return str(_HARNESS_DIR / "fixtures" / rel)


def _classify(entry):
    if entry["typescript_target"] is None:
        return "missing_ts"
    if not ts_export_exists(entry["typescript_target"]):
        return "broken_tag"
    if Path(entry["fixture_path"]).exists():
        return "ready"
    return "no_fixture"


def run_discovery(output_path: Path = None):
    if output_path is None:
        output_path = _HARNESS_DIR / "results" / "discovery.json"
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    functions = []
    for module in list_python_modules():
        for fn in enumerate_functions(module["path"]):
            tag = fn["parity_tag"]
            ts_target = tag.get("ts") if tag else None
            if ts_target is not None and not ts_target.startswith("@"):
                # Rewrite bare TS target to @/core-relative form — discovery convention.
                # A tag like "ts=calculateTithiAsync" is ambiguous; require full form.
                # Keep as-is but resolve will fail, which we report as broken_tag.
                pass
            python_target = f"{module['module']}.{fn['name']}"
            fixture = fixture_path_for(python_target)
            entry = {
                "python_target": python_target,
                "typescript_target": ts_target,
                "tag_notes": tag.get("notes") if tag else None,
                "fixture_path": fixture,
                "python_source_line": fn["line"],
            }
            entry["status"] = _classify(entry)
            functions.append(entry)

    counts = {"total": len(functions), "ready": 0, "no_fixture": 0, "missing_ts": 0, "broken_tag": 0}
    for f in functions:
        counts[f["status"]] = counts.get(f["status"], 0) + 1

    result = {
        "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "functions": functions,
        "summary": counts,
    }
    output_path.write_text(json.dumps(result, indent=2))
    return result


if __name__ == "__main__":
    result = run_discovery()
    print(f"Discovered {result['summary']['total']} functions:")
    for k, v in result["summary"].items():
        if k != "total":
            print(f"  {k}: {v}")
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest parity-tools/harness/tests/test_discover.py -v
```

Expected: all tests pass.

- [ ] **Step 5: Run the CLI manually to smoke-test**

```bash
python parity-tools/harness/discover.py
```

Expected: Prints a summary; `parity-tools/harness/results/discovery.json` written. Most functions should be classified as `missing_ts` (no tags yet).

- [ ] **Step 6: Commit**

```bash
git add parity-tools/harness/discover.py parity-tools/harness/tests/test_discover.py
git commit -m "feat(parity): full discovery — classify functions, emit discovery.json"
```

---

## Task 10: run_python.py — single-fixture execution

**Files:**
- Create: `parity-tools/harness/run_python.py`
- Create: `parity-tools/harness/tests/test_run_python.py`

Run one fixture, call the Python function once per case, emit result JSON.

- [ ] **Step 1: Write failing test**

Create `parity-tools/harness/tests/test_run_python.py`:

```python
import json
import sys
from pathlib import Path

_HARNESS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_HARNESS))

from run_python import run_fixture  # noqa: E402


def test_runs_trivial_fixture(tmp_path):
    """Uses math.sqrt as a trivial target to exercise the runner plumbing."""
    fixture = {
        "python_target": "math.sqrt",
        "typescript_target": "@/nonexistent::x",
        "cases": [
            {"id": "c0", "inputs": {"x": 4}, "description": "sqrt(4)=2"},
            {"id": "c1", "inputs": {"x": 9}, "description": "sqrt(9)=3"},
        ],
    }
    fixture_file = tmp_path / "trivial.json"
    fixture_file.write_text(json.dumps(fixture))

    out_dir = tmp_path / "out"
    result = run_fixture(fixture_file, output_root=out_dir)

    assert result["runtime"] == "python"
    assert len(result["cases"]) == 2
    assert result["cases"][0] == {"id": "c0", "ok": True, "result": 2.0, "error": None}
    assert result["cases"][1] == {"id": "c1", "ok": True, "result": 3.0, "error": None}


def test_captures_exceptions_per_case(tmp_path):
    fixture = {
        "python_target": "math.sqrt",
        "typescript_target": "@/x::x",
        "cases": [
            {"id": "bad", "inputs": {"x": "not a number"}},
        ],
    }
    fixture_file = tmp_path / "bad.json"
    fixture_file.write_text(json.dumps(fixture))

    result = run_fixture(fixture_file, output_root=tmp_path / "out")
    assert result["cases"][0]["ok"] is False
    assert "TypeError" in result["cases"][0]["error"] or "ValueError" in result["cases"][0]["error"]
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest parity-tools/harness/tests/test_run_python.py -v
```

Expected: FAIL, module not found.

- [ ] **Step 3: Implement `run_fixture`**

Create `parity-tools/harness/run_python.py`:

```python
"""Run parity fixtures against Python implementations.

Usage:
    python run_python.py <fixture.json> [<fixture.json> ...]

Writes one result JSON per fixture to parity-tools/harness/results/python/<path>.
"""
import argparse
import datetime
import importlib
import json
import sys
import traceback
from pathlib import Path

_HARNESS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(_HARNESS_DIR))
sys.path.insert(0, str(_HARNESS_DIR.parent.parent / "src"))

from coercion import coerce  # noqa: E402


def _resolve_target(python_target: str):
    """'math.sqrt' -> math.sqrt (callable)."""
    module_name, _, fn_name = python_target.rpartition(".")
    module = importlib.import_module(module_name)
    return getattr(module, fn_name)


def _apply_ayanamsa(ayanamsa: str):
    from jhora.panchanga.drik import set_ayanamsa_mode
    set_ayanamsa_mode(ayanamsa)


def run_fixture(fixture_path: Path, output_root: Path = None):
    fixture_path = Path(fixture_path)
    fixture = json.loads(fixture_path.read_text())

    target_name = fixture["python_target"]
    target = _resolve_target(target_name)
    ayanamsa = fixture.get("setup", {}).get("ayanamsa", "LAHIRI")

    cases_out = []
    for case in fixture["cases"]:
        # Reset ayanamsa per case to isolate state.
        try:
            _apply_ayanamsa(ayanamsa)
        except Exception:
            # Non-drik targets (e.g. math.sqrt) don't need ayanamsa.
            pass
        raw_inputs = case["inputs"]
        inputs = coerce(raw_inputs) if isinstance(raw_inputs, dict) else raw_inputs
        try:
            if isinstance(inputs, dict):
                result = target(**inputs)
            elif isinstance(inputs, list):
                result = target(*inputs)
            else:
                result = target(inputs)
            cases_out.append({"id": case["id"], "ok": True, "result": result, "error": None})
        except Exception:
            cases_out.append({
                "id": case["id"],
                "ok": False,
                "result": None,
                "error": traceback.format_exc(limit=3),
            })

    result = {
        "fixture": str(fixture_path),
        "runtime": "python",
        "runtime_version": sys.version.split()[0],
        "ayanamsa": ayanamsa,
        "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "cases": _make_json_safe(cases_out),
    }

    if output_root is not None:
        _write_result(fixture_path, output_root, result)
    return result


def _make_json_safe(value):
    """Recursively convert tuples, namedtuples, and non-serialisable objects."""
    if isinstance(value, (list, tuple)):
        return [_make_json_safe(v) for v in value]
    if isinstance(value, dict):
        return {k: _make_json_safe(v) for k, v in value.items()}
    if isinstance(value, (int, float, str, bool)) or value is None:
        return value
    return repr(value)


def _write_result(fixture_path: Path, output_root: Path, result: dict):
    _REPO_ROOT = _HARNESS_DIR.parent.parent
    fixtures_root = _HARNESS_DIR / "fixtures"
    try:
        rel = fixture_path.resolve().relative_to(fixtures_root.resolve())
    except ValueError:
        rel = Path(fixture_path.name)
    target_path = Path(output_root) / rel
    target_path.parent.mkdir(parents=True, exist_ok=True)
    target_path.write_text(json.dumps(result, indent=2))


def _default_output_root():
    return _HARNESS_DIR / "results" / "python"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("fixtures", nargs="+")
    args = parser.parse_args()
    output_root = _default_output_root()
    output_root.mkdir(parents=True, exist_ok=True)
    for f in args.fixtures:
        run_fixture(Path(f), output_root=output_root)


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest parity-tools/harness/tests/test_run_python.py -v
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add parity-tools/harness/run_python.py parity-tools/harness/tests/test_run_python.py
git commit -m "feat(parity): run_python.py — execute fixtures, emit result JSON"
```

---

## Task 11: run_typescript.ts — single-fixture execution

**Files:**
- Create: `parity-tools/harness/run_typescript.ts`
- Create: `parity-tools/harness/tests/test_run_typescript.sh`

TS-side counterpart: dynamic import of target, run cases, write result JSON.

- [ ] **Step 1: Implement `run_typescript.ts`**

Create `parity-tools/harness/run_typescript.ts`:

```typescript
/**
 * Parity harness TypeScript fixture runner.
 *
 * Usage:
 *   tsx run_typescript.ts <fixture.json> [<fixture.json> ...]
 *
 * Writes one result JSON per fixture to
 * parity-tools/harness/results/typescript/<path>.
 *
 * MUST be invoked from the pyjhora-web/ working directory so @/ path aliases
 * resolve. The Makefile handles this.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { coerce } from '../../pyjhora-web/src/parity/coercion';
import { initSwissEph, setAyanamsaMode } from '../../pyjhora-web/src/core/ephemeris/swe-adapter';

interface Fixture {
  python_target: string;
  typescript_target: string;
  setup?: { ayanamsa?: string };
  cases: Array<{ id: string; inputs: unknown; description?: string }>;
}

interface CaseResult {
  id: string;
  ok: boolean;
  result: unknown;
  error: string | null;
}

// Repo-root layout: <repo>/parity-tools/harness/run_typescript.ts
// pyjhora-web lives at <repo>/pyjhora-web, so core/ sits at ../../pyjhora-web/src/core.
const HARNESS_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname));
const REPO_ROOT = path.resolve(HARNESS_DIR, '..', '..');
const PYJHORA_WEB_SRC = path.join(REPO_ROOT, 'pyjhora-web', 'src');

const ALIAS_PREFIXES: Array<[string, string]> = [
  ['@/', ''],
  ['@core/', 'core/'],
  ['@components/', 'components/'],
  ['@services/', 'services/'],
  ['@hooks/', 'hooks/'],
  ['@i18n/', 'i18n/'],
];

function resolveTsTarget(target: string): { filePath: string; exportName: string } {
  const sepIdx = target.indexOf('::');
  if (sepIdx === -1) throw new Error(`Invalid typescript_target: ${target}`);
  const pathPart = target.slice(0, sepIdx);
  const exportName = target.slice(sepIdx + 2);
  let resolved = pathPart;
  for (const [prefix, replacement] of ALIAS_PREFIXES) {
    if (pathPart.startsWith(prefix)) {
      resolved = replacement + pathPart.slice(prefix.length);
      break;
    }
  }
  return { filePath: path.join(PYJHORA_WEB_SRC, `${resolved}.ts`), exportName };
}

function makeJsonSafe(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(makeJsonSafe);
  if (value === null || value === undefined) return value;
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = makeJsonSafe(v);
    return out;
  }
  if (typeof value === 'function') return `<function ${(value as Function).name}>`;
  if (typeof value === 'number' && Number.isNaN(value)) return 'NaN';
  return value;
}

async function runFixture(fixturePath: string): Promise<unknown> {
  const fixture: Fixture = JSON.parse(await fs.readFile(fixturePath, 'utf-8'));
  const { filePath, exportName } = resolveTsTarget(fixture.typescript_target);
  const module = await import(pathToFileURL(filePath).href);
  const target = module[exportName];
  if (typeof target !== 'function') {
    throw new Error(`Export ${exportName} at ${filePath} is not a function`);
  }

  const ayanamsa = fixture.setup?.ayanamsa ?? 'LAHIRI';

  const results: CaseResult[] = [];
  for (const c of fixture.cases) {
    try {
      setAyanamsaMode(ayanamsa);
    } catch {
      // Not all targets need ayanamsa (e.g. Math.sqrt).
    }
    try {
      const inputs = coerce(c.inputs);
      let out;
      if (inputs !== null && typeof inputs === 'object' && !Array.isArray(inputs)) {
        const argNames = (target.length > 0)
          ? Object.keys(inputs)
          : [];
        if (argNames.length > 0) {
          // Pass positional: order matters. Prefer explicit ordering via Object.keys.
          out = await target(...argNames.map((k) => (inputs as Record<string, unknown>)[k]));
        } else {
          out = await target(inputs);
        }
      } else if (Array.isArray(inputs)) {
        out = await target(...inputs);
      } else {
        out = await target(inputs);
      }
      results.push({ id: c.id, ok: true, result: makeJsonSafe(out), error: null });
    } catch (err) {
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      results.push({ id: c.id, ok: false, result: null, error: msg });
    }
  }

  const payload = {
    fixture: fixturePath,
    runtime: 'typescript',
    runtime_version: process.version,
    ayanamsa,
    generated_at: new Date().toISOString(),
    cases: results,
  };
  return payload;
}

async function main() {
  const fixtures = process.argv.slice(2);
  if (fixtures.length === 0) {
    console.error('Usage: tsx run_typescript.ts <fixture.json> [<fixture.json> ...]');
    process.exit(1);
  }
  await initSwissEph();
  const outputRoot = path.join(HARNESS_DIR, 'results', 'typescript');
  const fixturesRoot = path.join(HARNESS_DIR, 'fixtures');
  await fs.mkdir(outputRoot, { recursive: true });
  for (const f of fixtures) {
    const abs = path.resolve(f);
    const result = await runFixture(abs);
    let rel: string;
    if (abs.startsWith(fixturesRoot)) {
      rel = path.relative(fixturesRoot, abs);
    } else {
      rel = path.basename(abs);
    }
    const outFile = path.join(outputRoot, rel);
    await fs.mkdir(path.dirname(outFile), { recursive: true });
    await fs.writeFile(outFile, JSON.stringify(result, null, 2));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Create a smoke-test fixture**

Create `parity-tools/harness/fixtures/_smoke_trivial.json` (temporary, deleted later):

```json
{
  "python_target": "math.sqrt",
  "typescript_target": "@/parity/_trivial_smoke::sqrt",
  "cases": [
    {"id": "four", "inputs": {"x": 4}},
    {"id": "nine", "inputs": {"x": 9}}
  ]
}
```

Create a trivial TS export at `pyjhora-web/src/parity/_trivial_smoke.ts`:

```typescript
export function sqrt(x: number): number {
  return Math.sqrt(x);
}
```

- [ ] **Step 3: Run the smoke fixture**

```bash
cd pyjhora-web && npx tsx ../parity-tools/harness/run_typescript.ts ../parity-tools/harness/fixtures/_smoke_trivial.json
```

Expected: exits 0; `parity-tools/harness/results/typescript/_smoke_trivial.json` contains:

```json
{
  "cases": [
    {"id": "four", "ok": true, "result": 2, ...},
    {"id": "nine", "ok": true, "result": 3, ...}
  ]
}
```

- [ ] **Step 4: Clean up smoke artifacts**

```bash
rm parity-tools/harness/fixtures/_smoke_trivial.json
rm pyjhora-web/src/parity/_trivial_smoke.ts
rm -f parity-tools/harness/results/typescript/_smoke_trivial.json
```

- [ ] **Step 5: Commit**

```bash
git add parity-tools/harness/run_typescript.ts
git commit -m "feat(parity): run_typescript.ts — execute TS fixtures via tsx"
```

---

## Task 12: compare.py — primitives + tolerance resolution

**Files:**
- Create: `parity-tools/harness/compare.py`
- Create: `parity-tools/harness/tests/test_compare.py`

Core: recursively compare two values and report the first diverging leaf.

- [ ] **Step 1: Write failing tests**

Create `parity-tools/harness/tests/test_compare.py`:

```python
import sys
from pathlib import Path

_HARNESS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_HARNESS))

from compare import compare_values, DEFAULT_TOLERANCE  # noqa: E402


def test_equal_ints_match():
    diff = compare_values(5, 5, DEFAULT_TOLERANCE)
    assert diff is None


def test_unequal_ints_diverge():
    diff = compare_values(5, 6, DEFAULT_TOLERANCE)
    assert diff is not None
    assert diff["python"] == 5
    assert diff["typescript"] == 6


def test_floats_within_tolerance_match():
    tol = {"float_abs": 1e-6, "float_rel": 1e-9}
    assert compare_values(1.0, 1.0000001, tol) is None


def test_floats_outside_tolerance_diverge():
    tol = {"float_abs": 1e-9, "float_rel": 1e-12}
    diff = compare_values(1.0, 1.01, tol)
    assert diff is not None


def test_nan_matches_nan():
    assert compare_values(float("nan"), "NaN", DEFAULT_TOLERANCE) is None


def test_none_null_undefined_equal():
    assert compare_values(None, None, DEFAULT_TOLERANCE) is None


def test_list_divergence_reports_index():
    diff = compare_values([1, 2, 3], [1, 99, 3], DEFAULT_TOLERANCE)
    assert diff is not None
    assert "[1]" in diff["path"]


def test_dict_divergence_reports_key():
    diff = compare_values({"a": 1, "b": 2}, {"a": 1, "b": 999}, DEFAULT_TOLERANCE)
    assert diff is not None
    assert "b" in diff["path"]


def test_string_exact_match():
    assert compare_values("abc", "abc", DEFAULT_TOLERANCE) is None
    assert compare_values("abc ", "abc", DEFAULT_TOLERANCE) is None  # strip behaviour
    assert compare_values("abc", "abd", DEFAULT_TOLERANCE) is not None
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest parity-tools/harness/tests/test_compare.py -v
```

Expected: FAIL, module not found.

- [ ] **Step 3: Implement `compare_values`**

Create `parity-tools/harness/compare.py`:

```python
"""Symmetric diff for parity harness results.

Compare Python and TS result trees and report the first diverging leaf.
"""
import math

DEFAULT_TOLERANCE = {
    "float_abs": 1e-6,
    "float_rel": 1e-9,
    "time_seconds": 1.0,
}


def _is_nan_marker(x):
    if isinstance(x, float) and math.isnan(x):
        return True
    if isinstance(x, str) and x == "NaN":
        return True
    return False


def _floats_match(a, b, tol):
    if a == b:
        return True
    abs_diff = abs(a - b)
    if abs_diff <= tol.get("float_abs", DEFAULT_TOLERANCE["float_abs"]):
        return True
    scale = max(abs(a), abs(b))
    if scale > 0 and (abs_diff / scale) <= tol.get("float_rel", DEFAULT_TOLERANCE["float_rel"]):
        return True
    return False


def _diff_at(path, a, b, rule):
    return {"path": path, "python": a, "typescript": b, "rule": rule}


def compare_values(a, b, tolerance, path: str = "$"):
    """Return None if equal, else {path, python, typescript, rule}."""
    # None / null / undefined equivalence.
    if a is None and b is None:
        return None

    # NaN markers (Python nan, TS serialised as "NaN").
    if _is_nan_marker(a) and _is_nan_marker(b):
        return None

    # Bool before int (isinstance(True, int) is True).
    if isinstance(a, bool) or isinstance(b, bool):
        if a == b:
            return None
        return _diff_at(path, a, b, "bool_exact")

    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        if isinstance(a, int) and isinstance(b, int):
            if a == b:
                return None
            return _diff_at(path, a, b, "int_exact")
        if _floats_match(float(a), float(b), tolerance):
            return None
        return _diff_at(path, a, b, "float_tolerance")

    if isinstance(a, str) and isinstance(b, str):
        if a.rstrip() == b.rstrip():
            return None
        return _diff_at(path, a, b, "string_exact")

    if isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            return _diff_at(path, a, b, "list_length")
        for i, (x, y) in enumerate(zip(a, b)):
            sub = compare_values(x, y, tolerance, f"{path}[{i}]")
            if sub is not None:
                return sub
        return None

    if isinstance(a, dict) and isinstance(b, dict):
        all_keys = set(a.keys()) | set(b.keys())
        for k in sorted(all_keys):
            if k not in a or k not in b:
                return _diff_at(f"{path}.{k}", a.get(k), b.get(k), "key_missing")
            sub = compare_values(a[k], b[k], tolerance, f"{path}.{k}")
            if sub is not None:
                return sub
        return None

    # Type mismatch or unhandled.
    return _diff_at(path, a, b, "type_mismatch")
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest parity-tools/harness/tests/test_compare.py -v
```

Expected: 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add parity-tools/harness/compare.py parity-tools/harness/tests/test_compare.py
git commit -m "feat(parity): compare.py — primitive + container value diff"
```

---

## Task 13: compare.py — fixture-level compare + output files

**Files:**
- Modify: `parity-tools/harness/compare.py`
- Modify: `parity-tools/harness/tests/test_compare.py`

Read Python + TS result files for a fixture, run `compare_values` per case, emit diff JSON.

- [ ] **Step 1: Append failing tests**

```python
import json

from compare import compare_fixture_results  # noqa: E402


def test_compare_fixture_all_ok(tmp_path):
    fixture = tmp_path / "fixtures/dir/f.json"
    fixture.parent.mkdir(parents=True)
    fixture.write_text(json.dumps({
        "python_target": "math.sqrt",
        "typescript_target": "@/x::sqrt",
        "cases": [{"id": "c0", "inputs": {"x": 4}}],
    }))

    py_result = tmp_path / "results/python/dir/f.json"
    py_result.parent.mkdir(parents=True)
    py_result.write_text(json.dumps({
        "cases": [{"id": "c0", "ok": True, "result": 2.0, "error": None}],
    }))

    ts_result = tmp_path / "results/typescript/dir/f.json"
    ts_result.parent.mkdir(parents=True)
    ts_result.write_text(json.dumps({
        "cases": [{"id": "c0", "ok": True, "result": 2.0, "error": None}],
    }))

    diff_root = tmp_path / "results/diff"
    outcome = compare_fixture_results(
        fixture_path=fixture,
        python_result_path=py_result,
        typescript_result_path=ts_result,
        output_root=diff_root,
    )
    assert outcome["summary"]["ok"] == 1
    assert outcome["summary"]["diverges"] == 0
    # Output file written.
    assert (diff_root / "dir/f.json").exists()


def test_compare_fixture_flags_divergence(tmp_path):
    fixture = tmp_path / "fixtures/f.json"
    fixture.parent.mkdir(parents=True)
    fixture.write_text(json.dumps({
        "python_target": "x.y",
        "typescript_target": "@/x::y",
        "tolerance": {"float_abs": 1e-9},
        "tolerance_rationale": "test: extremely tight tolerance",
        "cases": [{"id": "c0", "inputs": {}}],
    }))

    py = tmp_path / "results/python/f.json"
    py.parent.mkdir(parents=True)
    py.write_text(json.dumps({"cases": [{"id": "c0", "ok": True, "result": 1.0, "error": None}]}))
    ts = tmp_path / "results/typescript/f.json"
    ts.parent.mkdir(parents=True)
    ts.write_text(json.dumps({"cases": [{"id": "c0", "ok": True, "result": 1.5, "error": None}]}))

    diff_root = tmp_path / "results/diff"
    outcome = compare_fixture_results(fixture_path=fixture,
                                      python_result_path=py,
                                      typescript_result_path=ts,
                                      output_root=diff_root)
    assert outcome["summary"]["diverges"] == 1
```

- [ ] **Step 2: Run tests — expect failure**

```bash
pytest parity-tools/harness/tests/test_compare.py -v
```

Expected: new tests FAIL, `compare_fixture_results` undefined.

- [ ] **Step 3: Implement `compare_fixture_results` + CLI**

Append to `parity-tools/harness/compare.py`:

```python
import argparse
import json
from pathlib import Path


_HARNESS_DIR = Path(__file__).resolve().parent
_FIXTURES_ROOT = _HARNESS_DIR / "fixtures"
_RESULTS_ROOT = _HARNESS_DIR / "results"


def _resolve_tolerance(fixture, case):
    tol = dict(DEFAULT_TOLERANCE)
    tol.update(fixture.get("tolerance") or {})
    tol.update(case.get("tolerance") or {})
    return tol


def _fixture_rel_path(fixture_path: Path):
    try:
        return fixture_path.resolve().relative_to(_FIXTURES_ROOT.resolve())
    except ValueError:
        return Path(fixture_path.name)


def compare_fixture_results(fixture_path: Path,
                            python_result_path: Path,
                            typescript_result_path: Path,
                            output_root: Path = None):
    fixture = json.loads(Path(fixture_path).read_text())
    py = json.loads(Path(python_result_path).read_text())
    ts = json.loads(Path(typescript_result_path).read_text())

    py_cases = {c["id"]: c for c in py["cases"]}
    ts_cases = {c["id"]: c for c in ts["cases"]}

    diffs = []
    for case in fixture["cases"]:
        cid = case["id"]
        p = py_cases.get(cid)
        t = ts_cases.get(cid)
        entry = {"id": cid}
        if p is None or t is None:
            entry["status"] = "missing"
            entry["detail"] = f"python={'ok' if p else 'missing'}, ts={'ok' if t else 'missing'}"
            diffs.append(entry)
            continue
        if not p["ok"] or not t["ok"]:
            entry["status"] = "error"
            entry["python_error"] = p.get("error")
            entry["typescript_error"] = t.get("error")
            diffs.append(entry)
            continue
        tol = _resolve_tolerance(fixture, case)
        leaf = compare_values(p["result"], t["result"], tol)
        if leaf is None:
            entry["status"] = "ok"
        else:
            entry["status"] = "diverges"
            entry["diff"] = leaf
        diffs.append(entry)

    summary = {
        "ok": sum(1 for d in diffs if d["status"] == "ok"),
        "diverges": sum(1 for d in diffs if d["status"] == "diverges"),
        "error": sum(1 for d in diffs if d["status"] == "error"),
        "missing": sum(1 for d in diffs if d["status"] == "missing"),
    }

    outcome = {
        "fixture": str(fixture_path),
        "python_target": fixture["python_target"],
        "typescript_target": fixture["typescript_target"],
        "cases": diffs,
        "summary": summary,
    }

    if output_root is not None:
        rel = _fixture_rel_path(Path(fixture_path))
        out_file = Path(output_root) / rel
        out_file.parent.mkdir(parents=True, exist_ok=True)
        out_file.write_text(json.dumps(outcome, indent=2))

    return outcome


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("fixtures", nargs="+")
    args = parser.parse_args()
    output_root = _RESULTS_ROOT / "diff"
    output_root.mkdir(parents=True, exist_ok=True)
    for f in args.fixtures:
        fixture_path = Path(f).resolve()
        rel = _fixture_rel_path(fixture_path)
        py = _RESULTS_ROOT / "python" / rel
        ts = _RESULTS_ROOT / "typescript" / rel
        compare_fixture_results(fixture_path, py, ts, output_root)


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest parity-tools/harness/tests/test_compare.py -v
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add parity-tools/harness/compare.py parity-tools/harness/tests/test_compare.py
git commit -m "feat(parity): compare.py — fixture-level diff + CLI"
```

---

## Task 14: report.py — generate report.md

**Files:**
- Create: `parity-tools/harness/report.py`
- Create: `parity-tools/harness/tests/test_report.py`

Consolidate `discovery.json` + `results/diff/*.json` into a human-readable Markdown report.

- [ ] **Step 1: Write failing test**

Create `parity-tools/harness/tests/test_report.py`:

```python
import json
import sys
from pathlib import Path

_HARNESS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_HARNESS))

from report import build_report  # noqa: E402


def test_report_has_all_sections(tmp_path):
    discovery = {
        "generated_at": "2026-04-21T00:00:00Z",
        "functions": [
            {"python_target": "jhora.p.a", "typescript_target": "@/x::a",
             "fixture_path": str(tmp_path / "fixtures/p/a.json"), "status": "ready",
             "tag_notes": None, "python_source_line": 10},
            {"python_target": "jhora.p.b", "typescript_target": None,
             "fixture_path": "", "status": "missing_ts",
             "tag_notes": None, "python_source_line": 20},
            {"python_target": "jhora.p.c", "typescript_target": "@/x::c",
             "fixture_path": "", "status": "no_fixture",
             "tag_notes": None, "python_source_line": 30},
        ],
        "summary": {"total": 3, "ready": 1, "no_fixture": 1, "missing_ts": 1, "broken_tag": 0},
    }
    diffs = [
        {"fixture": "fixtures/p/a.json", "python_target": "jhora.p.a",
         "typescript_target": "@/x::a", "summary": {"ok": 1, "diverges": 0, "error": 0, "missing": 0},
         "cases": []},
    ]
    exclusions = [
        {"path": "jhora/ui/**", "reason": "UI, PyQt6"},
    ]
    md = build_report(discovery=discovery, diffs=diffs, exclusions=exclusions)
    assert "## Diverges" in md
    assert "## Missing TS partner" in md
    assert "## No fixture yet" in md
    assert "jhora.p.b" in md
    assert "jhora.p.c" in md
    assert "PyQt6" in md
```

- [ ] **Step 2: Run tests — expect failure**

```bash
pytest parity-tools/harness/tests/test_report.py -v
```

- [ ] **Step 3: Implement `build_report` + CLI**

Create `parity-tools/harness/report.py`:

```python
"""Generate parity-tools/harness/report.md from discovery + diff outputs."""
import argparse
import json
from pathlib import Path

import yaml

_HARNESS_DIR = Path(__file__).resolve().parent
_RESULTS = _HARNESS_DIR / "results"
_REPO_ROOT = _HARNESS_DIR.parent.parent
_EXCLUSIONS_PATH = _REPO_ROOT / "parity-tools" / "exclusions.yaml"


def build_report(discovery, diffs, exclusions) -> str:
    lines = []
    lines.append("# PyJhora Parity Report")
    lines.append("")
    lines.append(f"_Generated: {discovery['generated_at']}_")
    lines.append("")
    s = discovery["summary"]
    lines.append(
        f"**Summary:** {s['total']} functions · "
        f"{s['ready']} ready · {s['no_fixture']} no fixture · "
        f"{s['missing_ts']} missing TS · {s['broken_tag']} broken tag"
    )
    lines.append("")

    # Diverges section (sorted by first-diff magnitude if present, else by name).
    diverge_cases = []
    error_cases = []
    for d in diffs:
        for c in d["cases"]:
            if c["status"] == "diverges":
                diverge_cases.append((d, c))
            elif c["status"] == "error":
                error_cases.append((d, c))

    lines.append("## Diverges")
    lines.append("")
    if not diverge_cases:
        lines.append("_No divergences._")
    else:
        lines.append("| Function | Case | Path | Python | TypeScript | Rule |")
        lines.append("|----------|------|------|--------|------------|------|")
        for d, c in diverge_cases:
            leaf = c.get("diff", {})
            lines.append(
                f"| `{d['python_target']}` | `{c['id']}` | `{leaf.get('path', '')}` | "
                f"`{leaf.get('python')}` | `{leaf.get('typescript')}` | {leaf.get('rule', '')} |"
            )
    lines.append("")

    # Missing TS partner.
    missing = [f for f in discovery["functions"] if f["status"] in ("missing_ts", "broken_tag")]
    lines.append("## Missing TS partner")
    lines.append("")
    if not missing:
        lines.append("_None._")
    else:
        lines.append(f"{len(missing)} functions without a resolvable TS counterpart.")
        lines.append("")
        lines.append("<details><summary>List</summary>")
        lines.append("")
        for f in sorted(missing, key=lambda x: x["python_target"]):
            lines.append(f"- `{f['python_target']}` ({f['status']})")
        lines.append("")
        lines.append("</details>")
    lines.append("")

    # No fixture yet.
    todo = [f for f in discovery["functions"] if f["status"] == "no_fixture"]
    lines.append("## No fixture yet")
    lines.append("")
    if not todo:
        lines.append("_None._")
    else:
        lines.append(f"{len(todo)} tagged pairs with no fixture.")
        lines.append("")
        lines.append("<details><summary>List</summary>")
        lines.append("")
        for f in sorted(todo, key=lambda x: x["python_target"]):
            lines.append(f"- `{f['python_target']}` → `{f['typescript_target']}`")
        lines.append("")
        lines.append("</details>")
    lines.append("")

    # Runtime errors.
    lines.append("## Runtime errors")
    lines.append("")
    if not error_cases:
        lines.append("_No runtime errors._")
    else:
        for d, c in error_cases:
            lines.append(f"- `{d['python_target']}` / case `{c['id']}`")
            if c.get("python_error"):
                lines.append(f"  - Python: `{c['python_error']}`")
            if c.get("typescript_error"):
                lines.append(f"  - TypeScript: `{c['typescript_error']}`")
    lines.append("")

    # Excluded footer.
    lines.append("## Excluded modules")
    lines.append("")
    for e in exclusions:
        lines.append(f"- `{e['path']}` — {e['reason']}")
    lines.append("")

    return "\n".join(lines)


def _load_diffs(diff_root: Path):
    diffs = []
    if not diff_root.exists():
        return diffs
    for p in sorted(diff_root.rglob("*.json")):
        diffs.append(json.loads(p.read_text()))
    return diffs


def _load_exclusions():
    if not _EXCLUSIONS_PATH.exists():
        return []
    return yaml.safe_load(_EXCLUSIONS_PATH.read_text()) or []


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default=str(_HARNESS_DIR / "report.md"))
    args = parser.parse_args()
    discovery = json.loads((_RESULTS / "discovery.json").read_text())
    diffs = _load_diffs(_RESULTS / "diff")
    exclusions = _load_exclusions()
    md = build_report(discovery, diffs, exclusions)
    Path(args.output).write_text(md)
    print(f"Wrote {args.output}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest parity-tools/harness/tests/test_report.py -v
```

Expected: tests pass.

- [ ] **Step 5: Commit**

```bash
git add parity-tools/harness/report.py parity-tools/harness/tests/test_report.py
git commit -m "feat(parity): report.py — generate report.md"
```

---

## Task 15: Makefile — `make parity` entry point

**Files:**
- Create: `Makefile`

- [ ] **Step 1: Create `Makefile`**

```makefile
# PyJhora parity harness orchestration.

SHELL := /bin/bash
FIXTURES := $(shell find parity-tools/harness/fixtures -name '*.json' 2>/dev/null)

.PHONY: parity parity-discover parity-run-python parity-run-typescript parity-compare parity-report parity-test

parity-discover:
	python parity-tools/harness/discover.py

parity-run-python: parity-discover
	@if [ -z "$(FIXTURES)" ]; then \
	  echo "No fixtures found; skipping Python run."; \
	else \
	  python parity-tools/harness/run_python.py $(FIXTURES); \
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
	  python parity-tools/harness/compare.py $(FIXTURES); \
	fi

parity-report: parity-compare
	python parity-tools/harness/report.py

parity: parity-report
	@echo ""
	@echo "Parity report written to parity-tools/harness/report.md"

parity-test:
	pytest parity-tools/harness/tests/ -v
	cd pyjhora-web && npx vitest run tests/parity/
```

- [ ] **Step 2: Smoke-test: `make parity-test` passes**

```bash
make parity-test
```

Expected: all Python + TS harness unit tests pass.

- [ ] **Step 3: Smoke-test: `make parity` runs end-to-end with zero fixtures**

```bash
make parity
```

Expected: discovery runs, Python/TS runners skip (no fixtures), report.md written with "no divergences" / most functions missing_ts.

- [ ] **Step 4: Verify report.md exists and looks sensible**

```bash
head -30 parity-tools/harness/report.md
```

Expected: Sections "Summary", "Diverges" (empty), "Missing TS partner" (non-zero), "Excluded modules".

- [ ] **Step 5: Commit**

```bash
git add Makefile
git commit -m "feat(parity): Makefile — make parity entry point"
```

---

## Task 16: Seed @parity tags on drik.py (5 functions)

**Files:**
- Modify: `src/jhora/panchanga/drik.py`
- Modify: `pyjhora-web/src/core/panchanga/drik.ts`

Tag tithi, nakshatra, yogam, karana, vaara on both sides.

- [ ] **Step 1: Identify TS counterparts**

```bash
grep -E "^export (async )?(function|const) (calculateTithiAsync|calculateNakshatraAsync|calculateYogaAsync|calculateKaranaAsync|calculateVara)" pyjhora-web/src/core/panchanga/drik.ts
```

Expected: finds `calculateTithiAsync`, `calculateNakshatraAsync`, `calculateYogaAsync`, `calculateKaranaAsync`, `calculateVara`. If a name is different, update it in this task and the fixtures in Task 17.

- [ ] **Step 2: Add tags on Python side**

Edit `src/jhora/panchanga/drik.py`. For each of the 5 functions, add the comment line directly above the `def`:

At line 555 (above `def tithi(...):`) add:
```python
# @parity: ts=@/core/panchanga/drik::calculateTithiAsync
```

At line 716 (above `def nakshatra(jd,place):`) add:
```python
# @parity: ts=@/core/panchanga/drik::calculateNakshatraAsync
```

At line 818 (above `def yogam(jd,place,...):`) add:
```python
# @parity: ts=@/core/panchanga/drik::calculateYogaAsync
```

At line 871 (above `def karana(jd, place):`) add:
```python
# @parity: ts=@/core/panchanga/drik::calculateKaranaAsync
```

At line 890 (above `def vaara(jd):`) add:
```python
# @parity: ts=@/core/panchanga/drik::calculateVara
```

(Line numbers shift after each edit — use function name to locate, not hardcoded line.)

- [ ] **Step 3: Add tags on TS side**

Edit `pyjhora-web/src/core/panchanga/drik.ts`. Above each of the 5 export declarations, add:

```typescript
// @parity: py=tithi
export async function calculateTithiAsync(...
```
and similarly for the other four (`py=nakshatra`, `py=yogam`, `py=karana`, `py=vaara`).

- [ ] **Step 4: Re-run discovery**

```bash
python parity-tools/harness/discover.py
```

Expected: `missing_ts` count drops by ~5; `no_fixture` count goes up by 5 (they're now tagged but no fixtures yet).

- [ ] **Step 5: Commit**

```bash
git add src/jhora/panchanga/drik.py pyjhora-web/src/core/panchanga/drik.ts
git commit -m "feat(parity): add @parity tags on drik seed functions"
```

---

## Task 17: Seed fixtures for 5 drik functions

**Files:**
- Create: `parity-tools/harness/fixtures/panchanga/drik/tithi.json`
- Create: `parity-tools/harness/fixtures/panchanga/drik/nakshatra.json`
- Create: `parity-tools/harness/fixtures/panchanga/drik/yogam.json`
- Create: `parity-tools/harness/fixtures/panchanga/drik/karana.json`
- Create: `parity-tools/harness/fixtures/panchanga/drik/vaara.json`

Use a single verified reference case per fixture, sourced from `src/jhora/tests/pvr_tests.py`.

- [ ] **Step 1: Find reference inputs in pvr_tests.py**

```bash
grep -A3 "def tithi_tests\|def nakshathra_test\|def yogam_test\|def karana_test\|def vaara" src/jhora/tests/pvr_tests.py | head -60
```

Pick one well-known birthtime that is used in pvr_tests, e.g. PVR's own birthdata (already in the codebase as `book_chart_data.py`). Confirm it reproduces with:

```bash
python -c "
import sys; sys.path.insert(0, 'src')
from jhora.panchanga import drik
from jhora import utils
p = drik.Place('Machilipatnam', 16.1897, 81.1389, 5.5)
jd = utils.julian_day_number((1972,6,1), (4,16,0))
print('tithi:', drik.tithi(jd, p))
print('nakshatra:', drik.nakshatra(jd, p))
print('yogam:', drik.yogam(jd, p))
print('karana:', drik.karana(jd, p))
print('vaara:', drik.vaara(jd))
"
```

Record the printed values; they are the `expected` for each fixture.

- [ ] **Step 2: Write `fixtures/panchanga/drik/tithi.json`**

Substitute the exact printed `tithi` value for `expected`:

```json
{
  "python_target": "jhora.panchanga.drik.tithi",
  "typescript_target": "@/core/panchanga/drik::calculateTithiAsync",
  "setup": {"ayanamsa": "LAHIRI"},
  "cases": [
    {
      "id": "pvr_birth_1972_06_01",
      "description": "PVR's birth chart — reference tithi",
      "inputs": {
        "jd": 2441469.67778,
        "place": {
          "__type": "Place",
          "value": {"name": "Machilipatnam", "latitude": 16.1897, "longitude": 81.1389, "timezone": 5.5}
        }
      }
    }
  ]
}
```

(Note: no `expected` — we're diffing Python vs TS outputs. Add `expected` in a follow-up if Jagannatha Hora reference value is known.)

- [ ] **Step 3: Write the other four fixtures**

Same shape, adjusting `python_target`, `typescript_target`, and path. For `vaara`, the `inputs` need only `jd`:

```json
{
  "python_target": "jhora.panchanga.drik.vaara",
  "typescript_target": "@/core/panchanga/drik::calculateVara",
  "setup": {"ayanamsa": "LAHIRI"},
  "cases": [
    {
      "id": "pvr_birth_1972_06_01",
      "inputs": {"jd": 2441469.67778}
    }
  ]
}
```

- [ ] **Step 4: Re-run discovery**

```bash
python parity-tools/harness/discover.py
```

Expected: 5 drik functions classified as `ready` (tagged + fixture present).

- [ ] **Step 5: Commit**

```bash
git add parity-tools/harness/fixtures/
git commit -m "feat(parity): seed fixtures for 5 drik functions"
```

---

## Task 18: End-to-end smoke — `make parity` on drik seed

**Files:**
- None (verification + bugfix task)

Run the full pipeline on the drik seed. Any divergences discovered here are real — they reveal either tolerance issues, coercion bugs, or genuine TS/Python mismatches. Fix each one directly; don't just loosen tolerances.

- [ ] **Step 1: Run full pipeline**

```bash
make parity 2>&1 | tail -30
```

Expected: exits 0. `parity-tools/harness/report.md` shows 5 ready fixtures, runs them, reports divergences.

- [ ] **Step 2: Inspect report**

```bash
cat parity-tools/harness/report.md
```

- [ ] **Step 3: Triage each divergence**

For each case under "Diverges":

1. Read the `path`, `python`, `typescript`, `rule`.
2. Decide: is this a bug in the TS port, a tolerance mismatch, or a known expected divergence?
3. **If TS bug:** fix in TS, re-run `make parity`.
4. **If known divergence** (e.g. async TS returns different shape than sync Python): adjust the fixture's `tolerance` or restructure inputs; document in `tolerance_rationale`.
5. **If the result shapes differ** (Python returns list, TS returns object): add a pre-comparison normaliser in `compare.py` with a test, keep the fixture clean.

- [ ] **Step 4: Iterate until drik seed is green**

Loop Steps 1-3 until `Diverges` section is empty for the 5 drik fixtures, OR every remaining divergence has a `tolerance_rationale` committed.

- [ ] **Step 5: Commit the final green state**

```bash
git add parity-tools/harness/fixtures parity-tools/harness/compare.py \
        src/jhora pyjhora-web/src
git commit -m "fix(parity): drik seed fixtures green under make parity"
```

(Only commit files you actually modified in Step 3.)

---

## Task 19: README for parity-tools

**Files:**
- Create: `parity-tools/README.md`

- [ ] **Step 1: Write the README**

```markdown
# PyJhora Parity Harness

Cross-validation harness: runs the Python implementation (`src/jhora/`) and the
TypeScript port (`pyjhora-web/src/core/`) against shared JSON fixtures and
flags divergences.

## Running

```bash
make parity          # Run full pipeline: discover → run Python + TS → compare → report
make parity-test     # Run the harness's own unit tests
```

Output: `parity-tools/harness/report.md` with four sections:

1. **Diverges** — function pairs whose outputs don't match within tolerance
2. **Missing TS partner** — Python functions with no `@parity` tag or a tag pointing at a non-existent TS export
3. **No fixture yet** — tagged pairs that need a fixture written
4. **Runtime errors** — per-case exceptions

## Adding a new parity pair

1. **Tag the Python function.** Add above the `def`:

   ```python
   # @parity: ts=@/core/path/to/module::tsExportName
   def some_function(...):
       ...
   ```

2. **Tag the TypeScript function.** Add above the `export`:

   ```typescript
   // @parity: py=some_function
   export function tsExportName(...) { ... }
   ```

3. **Write a fixture.** Create
   `parity-tools/harness/fixtures/<python-module-path>/<function>.json`:

   ```json
   {
     "python_target": "jhora.path.to.module.some_function",
     "typescript_target": "@/core/path/to/module::tsExportName",
     "setup": {"ayanamsa": "LAHIRI"},
     "cases": [
       {
         "id": "case_1",
         "description": "What this case tests",
         "inputs": {
           "jd": 2441469.67778,
           "place": {
             "__type": "Place",
             "value": {"name": "Machilipatnam", "latitude": 16.18, "longitude": 81.13, "timezone": 5.5}
           }
         }
       }
     ]
   }
   ```

4. **Run `make parity`.** The new pair should appear under "Diverges" (if they
   differ) or nowhere (if they agree).

## Tagged input types

- `{"__type": "Place", "value": {name, latitude, longitude, timezone}}`
- `{"__type": "Date", "value": {year, month, day}}`

Add new tagged types by extending `parity-tools/harness/coercion.py` and
`pyjhora-web/src/parity/coercion.ts` in lockstep.

## Tolerance

Defaults (in `compare.py`): `float_abs=1e-6`, `float_rel=1e-9`, `time_seconds=1`.

To override per fixture, add a `tolerance` block + `tolerance_rationale`:

```json
{
  "tolerance": {"float_abs": 1e-3},
  "tolerance_rationale": "Sunrise time differs ~1 min between Moshier and JPL ephemeris."
}
```

Rationale is required when overriding — prevents silent tolerance creep.

## Exclusions

`parity-tools/exclusions.yaml` lists Python paths not checked for parity
(UI, experimental modules, tests). Edit to exclude new paths, with a `reason`.

## Architecture

See `docs/superpowers/specs/2026-04-20-pyjhora-parity-harness-design.md`.
```

- [ ] **Step 2: Commit**

```bash
git add parity-tools/README.md
git commit -m "docs(parity): README for parity harness"
```

---

## Task 20: Phase B — Backfill @parity tags, one module per commit

**Files:**
- Modify: every file under `src/jhora/` (non-excluded) that has a TS counterpart in `pyjhora-web/src/core/`
- Modify: corresponding TS files

Bulk, mechanical work. Each module-pair gets one commit. Procedure below is the template — repeat per module.

### Per-module procedure

- [ ] **Step 1: Run discovery, pick the next module**

```bash
python parity-tools/harness/discover.py
# Look at the 'missing_ts' entries — group them by module.
```

Pick a module where (a) the Python file has many missing-TS entries and (b) a sibling TS file exists in `pyjhora-web/src/core/`.

- [ ] **Step 2: Identify Python↔TS function pairs for that module**

```bash
# Example for charts:
grep "^def " src/jhora/horoscope/chart/charts.py | sed 's/def \([a-zA-Z_]*\).*/\1/' > /tmp/py_fns
grep -E "^export (async )?(function|const) " pyjhora-web/src/core/horoscope/chart/charts.ts | \
  sed -E 's/.*export (async )?(function|const) ([a-zA-Z]+).*/\3/' > /tmp/ts_fns
paste /tmp/py_fns /tmp/ts_fns | column -t
```

Use this to see candidate pairs. Resolve naming differences by inspection (`snake_case` → `camelCase`, known renames documented in `docs/superpowers/specs/...`).

- [ ] **Step 3: Add tags on both sides**

For every pair where a TS counterpart exists:
- Python: prepend `# @parity: ts=@/core/.../<module>::<tsName>` above the `def`.
- TS: prepend `// @parity: py=<py_fn_name>` above the `export`.

If a Python function has no TS counterpart, leave it untagged. It remains `missing_ts`.

- [ ] **Step 4: Re-run discovery and verify**

```bash
python parity-tools/harness/discover.py
```

Expected: `broken_tag` remains 0. `missing_ts` drops by the number of pairs tagged. `no_fixture` increases by the same amount.

- [ ] **Step 5: Commit (per module)**

```bash
git add src/jhora/<module>.py pyjhora-web/src/core/<module>.ts
git commit -m "feat(parity): @parity tags on <module> pairs"
```

### Module pairing suggestions (rough order)

Tackle in this order — high-value modules first:

1. `panchanga/vratha.py` + closest TS file (if any)
2. `horoscope/chart/charts.py` ↔ `core/horoscope/chart/charts.ts`
3. `horoscope/chart/house.py` ↔ `core/horoscope/chart/house.ts`
4. `horoscope/chart/yoga.py` ↔ `core/horoscope/chart/yoga.ts`
5. `horoscope/chart/strength.py` ↔ `core/horoscope/chart/strength.ts`
6. `horoscope/chart/sphuta.py` ↔ `core/horoscope/chart/sphuta.ts`
7. `horoscope/chart/dosha.py` ↔ `core/horoscope/chart/dosha.ts`
8. `horoscope/chart/raja_yoga.py` ↔ `core/horoscope/chart/raja_yoga.ts`
9. `horoscope/dhasa/graha/*.py` ↔ `core/horoscope/dhasa/graha/*.ts`
10. `horoscope/dhasa/raasi/*.py` ↔ `core/horoscope/dhasa/raasi/*.ts`
11. `horoscope/dhasa/annual/*.py` ↔ `core/horoscope/dhasa/annual/*.ts`
12. `horoscope/match/compatibility.py` ↔ `core/horoscope/match/compatibility.ts`
13. `horoscope/transit/*.py` ↔ TS equivalents (if present — many may be `missing_ts` and stay that way)
14. Remaining `horoscope/main.py`, `horoscope/chart/arudhas.py`, etc.

### Phase B exit criterion

- [ ] **Final check: `broken_tag` count is 0 and `missing_ts` is stable**

```bash
python parity-tools/harness/discover.py
```

Verify:
- `broken_tag: 0`
- The remaining `missing_ts` list contains only Python functions that genuinely have no TS counterpart yet. Write a brief note in `parity-tools/README.md` listing the categories of still-unported functions (e.g. "Transit/saham/tajaka are not yet ported to TS").

- [ ] **Commit the README update**

```bash
git add parity-tools/README.md
git commit -m "docs(parity): document known missing TS counterparts after Phase B"
```

---

## Self-Review

Checking the plan against the spec:

**Spec coverage:**
- [x] `discover.py` (Tasks 6–9)
- [x] `run_python.py` (Task 10)
- [x] `run_typescript.ts` (Task 11)
- [x] `compare.py` (Tasks 12–13)
- [x] `report.py` (Task 14)
- [x] `exclusions.yaml` (Task 1)
- [x] Makefile (Task 15)
- [x] Coercion for `__type`-tagged JSON (Tasks 4–5)
- [x] `@parity` tags for drik seed (Task 16)
- [x] 5 drik fixtures (Task 17)
- [x] End-to-end smoke (Task 18)
- [x] README (Task 19)
- [x] Phase B tag backfill (Task 20)

**Placeholder scan:** no `TBD`/`TODO`/`fill in details` left. Step 3 of Task 18 uses "triage each divergence" which is action-directing, not a placeholder — it includes concrete decision rules.

**Type consistency:**
- `coerce` signature matches across Python and TS implementations (accepts any value, returns coerced value).
- `run_fixture` (Python) and `runFixture` (TS) return the same schema.
- `compare_values` and `compare_fixture_results` use consistent tolerance dict shape (`{float_abs, float_rel, time_seconds}`).
- `discovery.json` schema consistent across `discover.py` writer and `report.py` reader.

**Risks noted in spec that the plan surfaces in execution:**
- Moshier vs JPL ephemeris 1-min drift → Task 18 expects some divergences, provides tolerance_rationale path.
- `swe.calc_ut` buggy JS wrapper → surfaces as divergence in Task 18.
- Python sync ascendant proxy → will appear as divergence when raasi dhasa fixtures are added in Phase C (out of scope here).

Plan looks complete. No placeholders or contradictions found.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-21-pyjhora-parity-harness.md`.

Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
