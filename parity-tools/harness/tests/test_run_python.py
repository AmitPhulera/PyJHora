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
