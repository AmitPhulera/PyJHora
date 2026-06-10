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
