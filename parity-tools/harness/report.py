"""Generate parity-tools/harness/report.md from discovery + diff outputs."""
import argparse
import json
from pathlib import Path

import yaml

_HARNESS_DIR = Path(__file__).resolve().parent
_RESULTS = _HARNESS_DIR / "results"
_REPO_ROOT = _HARNESS_DIR.parent.parent
_EXCLUSIONS_PATH = _REPO_ROOT / "parity-tools" / "exclusions.yaml"


def _cell(v) -> str:
    """Escape a value for safe interpolation into a markdown table cell."""
    return str(v).replace("|", "\\|").replace("`", "'")


def build_report(discovery, diffs, exclusions) -> str:
    lines = []
    lines.append("# PyJhora Parity Report")
    lines.append("")
    lines.append(f"_Generated: {discovery['generated_at']}_")
    lines.append("")
    s = discovery["summary"]
    lines.append(
        f"**Summary:** {s['total']} functions · "
        f"{s['ready']} ready · {s['no_fixture']} no fixture · "
        f"{s['missing_ts']} missing TS · {s['broken_tag']} broken tag"
    )
    lines.append("")

    diverge_cases = []
    error_cases = []
    for d in diffs:
        for c in d["cases"]:
            if c["status"] == "diverges":
                diverge_cases.append((d, c))
            elif c["status"] == "error":
                error_cases.append((d, c))

    lines.append("## Diverges")
    lines.append("")
    if not diverge_cases:
        lines.append("_No divergences._")
    else:
        lines.append("| Function | Case | Path | Python | TypeScript | Rule |")
        lines.append("|----------|------|------|--------|------------|------|")
        for d, c in diverge_cases:
            leaf = c.get("diff", {})
            lines.append(
                f"| `{_cell(d['python_target'])}` | `{_cell(c['id'])}` | `{_cell(leaf.get('path', ''))}` | "
                f"`{_cell(leaf.get('python'))}` | `{_cell(leaf.get('typescript'))}` | `{_cell(leaf.get('rule', ''))}` |"
            )
    lines.append("")

    missing = [f for f in discovery["functions"] if f.get("status") in ("missing_ts", "broken_tag")]
    lines.append("## Missing TS partner")
    lines.append("")
    if not missing:
        lines.append("_None._")
    else:
        lines.append(f"{len(missing)} functions without a resolvable TS counterpart.")
        lines.append("")
        lines.append("<details><summary>List</summary>")
        lines.append("")
        for f in sorted(missing, key=lambda x: x["python_target"]):
            lines.append(f"- `{f['python_target']}` ({f['status']})")
        lines.append("")
        lines.append("</details>")
    lines.append("")

    todo = [f for f in discovery["functions"] if f.get("status") == "no_fixture"]
    lines.append("## No fixture yet")
    lines.append("")
    if not todo:
        lines.append("_None._")
    else:
        lines.append(f"{len(todo)} tagged pairs with no fixture.")
        lines.append("")
        lines.append("<details><summary>List</summary>")
        lines.append("")
        for f in sorted(todo, key=lambda x: x["python_target"]):
            lines.append(f"- `{f['python_target']}` → `{f['typescript_target']}`")
        lines.append("")
        lines.append("</details>")
    lines.append("")

    lines.append("## Runtime errors")
    lines.append("")
    if not error_cases:
        lines.append("_No runtime errors._")
    else:
        for d, c in error_cases:
            lines.append(f"- `{_cell(d['python_target'])}` / case `{_cell(c['id'])}`")
            if c.get("python_error"):
                lines.append(f"  - Python: `{_cell(c['python_error'])}`")
            if c.get("typescript_error"):
                lines.append(f"  - TypeScript: `{_cell(c['typescript_error'])}`")
    lines.append("")

    lines.append("## Excluded modules")
    lines.append("")
    for e in exclusions:
        lines.append(f"- `{e['path']}` — {e['reason']}")
    lines.append("")

    return "\n".join(lines)


def _load_diffs(diff_root: Path):
    diffs = []
    if not diff_root.exists():
        return diffs
    for p in sorted(diff_root.rglob("*.json")):
        diffs.append(json.loads(p.read_text()))
    return diffs


def _load_exclusions():
    if not _EXCLUSIONS_PATH.exists():
        return []
    return yaml.safe_load(_EXCLUSIONS_PATH.read_text()) or []


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default=str(_HARNESS_DIR / "report.md"))
    args = parser.parse_args()
    discovery = json.loads((_RESULTS / "discovery.json").read_text())
    diffs = _load_diffs(_RESULTS / "diff")
    exclusions = _load_exclusions()
    md = build_report(discovery, diffs, exclusions)
    Path(args.output).write_text(md)
    print(f"Wrote {args.output}")


if __name__ == "__main__":
    main()
