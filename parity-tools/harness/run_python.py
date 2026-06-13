"""Run parity fixtures against Python implementations.

Usage:
    python run_python.py <fixture.json> [<fixture.json> ...]

Writes one result JSON per fixture to parity-tools/harness/results/python/<path>.
"""
import argparse
import datetime
import importlib
import inspect
import json
import math
import sys
import traceback
from pathlib import Path

_HARNESS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(_HARNESS_DIR))
sys.path.insert(0, str(_HARNESS_DIR.parent.parent / "src"))

from coercion import coerce  # noqa: E402

# Populate language-dependent module globals (e.g. NAKSHATRA_LIST) the same
# way pvr_tests does. Without this, targets that read those globals raise
# NameError. TS parity side runs with English resources, so use 'en'.
from jhora import utils as _utils  # noqa: E402
_utils.set_language("en")


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
            result = _build_call(target, inputs)()
            cases_out.append({"id": case["id"], "ok": True, "result": result, "error": None})
        except Exception:
            cases_out.append({
                "id": case["id"],
                "ok": False,
                "result": None,
                "error": traceback.format_exc(limit=3),
            })

    fixture_result = {
        "fixture": str(fixture_path),
        "runtime": "python",
        "runtime_version": sys.version.split()[0],
        "ayanamsa": ayanamsa,
        "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "cases": _make_json_safe(cases_out),
    }

    if output_root is not None:
        _write_result(fixture_path, output_root, fixture_result)
    return fixture_result


def _build_call(target, inputs):
    """Return a zero-arg callable that invokes target exactly once.

    Decides kwargs vs positional by *binding* the signature first, so the
    target body never runs twice (a TypeError raised inside the target must
    not trigger a positional retry).
    """
    if isinstance(inputs, dict):
        try:
            sig = inspect.signature(target)
        except (ValueError, TypeError):
            sig = None  # some C builtins expose no signature
        if sig is not None:
            try:
                sig.bind(**inputs)
                return lambda: target(**inputs)
            except TypeError:
                pass
        # Pass values positionally (preserving key-order).
        return lambda: target(*inputs.values())
    if isinstance(inputs, list):
        return lambda: target(*inputs)
    return lambda: target(inputs)


def _make_json_safe(value):
    """Recursively convert tuples, namedtuples, and non-serialisable objects.

    NaN floats are normalised to the string "NaN" for symmetry with the TS
    runner which also emits "NaN" strings (JSON does not support bare NaN).
    """
    if isinstance(value, float) and math.isnan(value):
        return "NaN"
    if isinstance(value, (list, tuple)):
        return [_make_json_safe(v) for v in value]
    if isinstance(value, dict):
        return {k: _make_json_safe(v) for k, v in value.items()}
    if isinstance(value, (int, float, str, bool)) or value is None:
        return value
    # numpy scalars (np.int64 etc. are not int subclasses in py3)
    if hasattr(value, "item") and callable(value.item):
        return _make_json_safe(value.item())
    return repr(value)


def _write_result(fixture_path: Path, output_root: Path, result: dict):
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
        fixture_path = Path(f)
        try:
            run_fixture(fixture_path, output_root=output_root)
        except Exception:
            # Per-fixture isolation: one bad fixture must not abort the rest.
            err = traceback.format_exc(limit=5)
            print(f"ERROR running fixture {f}:\n{err}", file=sys.stderr)
            _write_result(fixture_path, output_root, {
                "fixture": str(fixture_path),
                "runtime": "python",
                "error": err,
                "cases": [],
            })


if __name__ == "__main__":
    main()
