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


def test_parses_parity_tag_full_target():
    source_lines = [
        "# @parity: ts=@/core/panchanga/drik::calculateTithiAsync",
        "def tithi(jd, place):",
        "    pass",
    ]
    tag = parse_parity_tag(source_lines, def_line_index=1)
    assert tag == {"ts": "@/core/panchanga/drik::calculateTithiAsync", "notes": None}


def test_enumerate_functions_skips_private():
    fns = enumerate_functions("jhora/panchanga/drik.py")
    for f in fns:
        assert not f["name"].startswith("_"), f"Should skip private fn {f['name']}"


from discover import resolve_ts_target, ts_export_exists  # noqa: E402


def test_resolve_ts_target_splits_path_and_export():
    result = resolve_ts_target("@/core/panchanga/drik::calculateTithiAsync")
    assert result["export_name"] == "calculateTithiAsync"
    assert result["file_path"].endswith("pyjhora-web/src/core/panchanga/drik.ts")


def test_ts_export_exists_true_for_real_export():
    assert ts_export_exists("@/core/panchanga/drik::calculateTithiAsync") is True


def test_ts_export_exists_false_for_missing_export():
    assert ts_export_exists("@/core/panchanga/drik::doesNotExistFn") is False


def test_ts_export_exists_false_for_missing_file():
    assert ts_export_exists("@/core/nonexistent/module::someFn") is False


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
    for key in ("total", "ready", "no_fixture", "missing_ts", "broken_tag"):
        assert key in result["summary"]
    assert out.exists()


def test_run_discovery_finds_drik_functions(tmp_path):
    out = tmp_path / "discovery.json"
    result = run_discovery(output_path=out)
    targets = [f["python_target"] for f in result["functions"]]
    assert "jhora.panchanga.drik.tithi" in targets
