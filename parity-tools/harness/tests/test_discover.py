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
