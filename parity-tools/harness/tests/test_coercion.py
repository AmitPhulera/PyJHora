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
    import sys as _sys
    repo_root = Path(__file__).resolve().parents[3]
    _sys.path.insert(0, str(repo_root / "src"))
    from jhora.panchanga.drik import Place

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
    assert isinstance(result["nested"], Place)
    assert isinstance(result["list_of_places"][0], Place)
