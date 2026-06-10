"""Tests for compare.compare_fixture_results (Task 13)"""
import json
import sys
from pathlib import Path

# Import harness module; path setup so tests work from any cwd.
_HARNESS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_HARNESS))

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
    # Output file written (fixture is outside harness fixtures root, so flat name).
    assert (diff_root / "f.json").exists()


def test_compare_fixture_flags_divergence(tmp_path):
    fixture = tmp_path / "fixtures/f.json"
    fixture.parent.mkdir(parents=True)
    fixture.write_text(json.dumps({
        "python_target": "x.y",
        "typescript_target": "@/x::y",
        "tolerance": {"float_abs": 1e-9, "float_rel": 1e-12},
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


def test_compare_fixture_error_envelope(tmp_path):
    fixture = tmp_path / "fixtures/f.json"
    fixture.parent.mkdir(parents=True)
    fixture.write_text(json.dumps({
        "python_target": "x.y",
        "typescript_target": "@/x::y",
        "cases": [{"id": "c0", "inputs": {}}, {"id": "c1", "inputs": {}}],
    }))

    py = tmp_path / "results/python/f.json"
    py.parent.mkdir(parents=True)
    py.write_text(json.dumps({
        "error": "Target resolution failed: boom",
        "cases": [],
    }))
    ts = tmp_path / "results/typescript/f.json"
    ts.parent.mkdir(parents=True)
    ts.write_text(json.dumps({
        "cases": [
            {"id": "c0", "ok": True, "result": 42, "error": None},
            {"id": "c1", "ok": True, "result": 43, "error": None},
        ],
    }))

    diff_root = tmp_path / "results/diff"
    outcome = compare_fixture_results(fixture_path=fixture,
                                      python_result_path=py,
                                      typescript_result_path=ts,
                                      output_root=diff_root)
    # Both cases should be marked as error status due to Python envelope error
    assert outcome["summary"]["error"] == 2
    assert outcome["summary"]["ok"] == 0
    assert outcome["cases"][0]["status"] == "error"
    assert outcome["cases"][1]["status"] == "error"
    assert outcome["cases"][0]["python_error"] == "Target resolution failed: boom"
