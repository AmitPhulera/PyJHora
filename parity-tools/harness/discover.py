"""Enumerate Python calculation modules for the parity harness.

Walks src/jhora/, applies exclusions from parity-tools/exclusions.yaml,
returns a list of module descriptors.
"""
import ast
import datetime
import fnmatch
import importlib
import inspect
import json
import re
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


_TAG_RE = re.compile(
    r'@parity:\s*(?P<lang>ts|py)=(?P<target>[@/\w.:+-]+)'
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
            i -= 1
            continue
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

    use_ast = False
    pairs = []

    try:
        if str(_JHORA_SRC) not in sys.path:
            sys.path.insert(0, str(_JHORA_SRC))
        module = importlib.import_module(module_dotted)
        members = inspect.getmembers(module, inspect.isfunction)
        pairs = [(n, f) for n, f in members if getattr(f, "__module__", None) == module_dotted]
    except BaseException:
        use_ast = True

    if use_ast:
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
            # line from inspect is 1-based; def is at source_lines[line-1]
            # def_line_index=line-1 means the def is at index line-1, scan starts at line-2
            tag = parse_parity_tag(source_lines, def_line_index=line - 1)
        results.append({
            "name": name,
            "line": line,
            "signature": signature,
            "parity_tag": tag,
        })
    return results


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


def fixture_path_for(python_target: str) -> str:
    """jhora.panchanga.drik.tithi -> .../fixtures/panchanga/drik/tithi.json"""
    parts = python_target.split(".")
    assert parts[0] == "jhora", f"Expected 'jhora.' prefix, got {python_target!r}"
    rel = "/".join(parts[1:-1]) + "/" + parts[-1] + ".json"
    return str(_HARNESS_DIR / "fixtures" / rel)


def _classify(entry):
    if entry["typescript_target"] is None:
        return "missing_ts"
    try:
        exists = ts_export_exists(entry["typescript_target"])
    except ValueError:
        exists = False
    if not exists:
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
        try:
            fns = enumerate_functions(module["path"])
        except BaseException as e:
            # One bad module should not kill the whole discovery
            fns = []
            print(f"[discover] WARNING: failed to enumerate {module['path']}: {type(e).__name__}: {e}", file=sys.stderr)
        for fn in fns:
            tag = fn["parity_tag"]
            ts_target = tag.get("ts") if tag else None
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
