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


def _discovery_stub():
    return {
        "generated_at": "2026-04-21T00:00:00Z",
        "functions": [],
        "summary": {"total": 0, "ready": 0, "no_fixture": 0, "missing_ts": 0, "broken_tag": 0},
    }


def test_report_diverge_table_escapes_pipes():
    diffs = [
        {"fixture": "fixtures/p/a.json", "python_target": "jhora.p.a",
         "typescript_target": "@/x::a",
         "summary": {"ok": 0, "diverges": 1, "error": 0, "missing": 0},
         "cases": [
             {"id": "case1", "status": "diverges",
              "diff": {"path": "$[0]", "python": 1, "typescript": 2,
                       "rule": "a|b mismatch"}},
         ]},
    ]
    md = build_report(discovery=_discovery_stub(), diffs=diffs, exclusions=[])
    assert "| Function | Case | Path | Python | TypeScript | Rule |" in md
    assert "jhora.p.a" in md
    # Pipe in the rule value must be escaped, not break the table row.
    assert "a\\|b mismatch" in md
    assert "a|b mismatch" not in md


def test_report_runtime_errors_section_lists_error_case():
    diffs = [
        {"fixture": "fixtures/p/a.json", "python_target": "jhora.p.a",
         "typescript_target": "@/x::a",
         "summary": {"ok": 0, "diverges": 0, "error": 1, "missing": 0},
         "cases": [
             {"id": "boom", "status": "error",
              "python_error": "ValueError: bad input"},
         ]},
    ]
    md = build_report(discovery=_discovery_stub(), diffs=diffs, exclusions=[])
    assert "## Runtime errors" in md
    assert "boom" in md
    assert "ValueError: bad input" in md
