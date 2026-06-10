"""Symmetric diff for parity harness results.

Compare Python and TS result trees and report the first diverging leaf.
"""
import argparse
import json
import math
from pathlib import Path

DEFAULT_TOLERANCE = {
    "float_abs": 1e-6,
    "float_rel": 1e-9,
    "time_seconds": 1.0,
}


_HARNESS_DIR = Path(__file__).resolve().parent
_FIXTURES_ROOT = _HARNESS_DIR / "fixtures"
_RESULTS_ROOT = _HARNESS_DIR / "results"


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
    if a is None and b is None:
        return None

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
    """Compare results for a single fixture and optionally write diff to output_root.

    Args:
        fixture_path: Path to fixture JSON file with python_target, typescript_target, cases
        python_result_path: Path to Python runner result envelope
        typescript_result_path: Path to TypeScript runner result envelope
        output_root: Optional root path for output diff file

    Returns:
        dict with fixture, targets, cases list, and summary counts (ok, diverges, error, missing)
    """
    fixture = json.loads(Path(fixture_path).read_text())
    py = json.loads(Path(python_result_path).read_text())
    ts = json.loads(Path(typescript_result_path).read_text())

    # Check for top-level error envelopes
    py_envelope_error = py.get("error")
    ts_envelope_error = ts.get("error")

    py_cases = {c["id"]: c for c in py.get("cases", [])}
    ts_cases = {c["id"]: c for c in ts.get("cases", [])}

    diffs = []
    for case in fixture["cases"]:
        cid = case["id"]
        entry = {"id": cid}

        # If either envelope has an error, mark all cases as error
        if py_envelope_error or ts_envelope_error:
            entry["status"] = "error"
            if py_envelope_error:
                entry["python_error"] = py_envelope_error
            if ts_envelope_error:
                entry["typescript_error"] = ts_envelope_error
            diffs.append(entry)
            continue

        p = py_cases.get(cid)
        t = ts_cases.get(cid)
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
