"""
dfm_checker.py — DFM Checker for KiCad AI Copilot
===================================================
Runs Design-for-Manufacturability checks against fab-specific rules and
generates a graded markdown report.

Usage:
    python dfm_checker.py --input design.json --fab jlcpcb --output dfm_report.md
"""

import argparse
import json
import os
import sys
from datetime import datetime
from typing import Any

# ---------------------------------------------------------------------------
# Fab rule sets
# ---------------------------------------------------------------------------

FAB_RULES: dict[str, dict[str, Any]] = {
    "jlcpcb": {
        "name":                    "JLCPCB",
        "min_trace_width_mm":      0.09,
        "min_clearance_mm":        0.09,
        "min_drill_mm":            0.20,
        "min_annular_ring_mm":     0.13,
        "max_layers":              16,
        "supports_bga":            True,
        "min_silkscreen_width_mm": 0.15,
        "min_via_diameter_mm":     0.45,
        "max_components":          500,
        "cost_per_layer_factor":   1.0,
        "notes": [
            "BGA requires X-ray inspection add-on.",
            "Use HASL or ENIG surface finish for SMT.",
            "Panelisation recommended for orders > 50 units.",
        ],
    },
    "pcbway": {
        "name":                    "PCBWay",
        "min_trace_width_mm":      0.10,
        "min_clearance_mm":        0.10,
        "min_drill_mm":            0.20,
        "min_annular_ring_mm":     0.15,
        "max_layers":              14,
        "supports_bga":            True,
        "min_silkscreen_width_mm": 0.15,
        "min_via_diameter_mm":     0.50,
        "max_components":          600,
        "cost_per_layer_factor":   1.2,
        "notes": [
            "PCBWay offers impedance control from 4-layer onwards.",
            "Blind/buried vias available on premium tier.",
        ],
    },
    "oshpark": {
        "name":                    "OSH Park",
        "min_trace_width_mm":      0.127,
        "min_clearance_mm":        0.127,
        "min_drill_mm":            0.254,
        "min_annular_ring_mm":     0.152,
        "max_layers":              4,
        "supports_bga":            False,
        "min_silkscreen_width_mm": 0.20,
        "min_via_diameter_mm":     0.60,
        "max_components":          200,
        "cost_per_layer_factor":   2.5,
        "notes": [
            "OSH Park is purple solder mask only.",
            "4-layer is the maximum supported stack-up.",
            "BGA is not supported — avoid fine-pitch BGA components.",
        ],
    },
}

# ---------------------------------------------------------------------------
# DFM checks
# ---------------------------------------------------------------------------

def _check(name: str, passed: bool, detail: str, recommendation: str = "") -> dict:
    return {
        "check":          name,
        "passed":         passed,
        "detail":         detail,
        "recommendation": recommendation,
    }


def run_checks(design: dict, rules: dict) -> list[dict]:
    """Run all DFM checks against the given fab rules."""
    checks: list[dict] = []
    constraints  = design.get("constraints", {})
    components   = design.get("components", [])
    placement    = design.get("pcb_placement_rules", {})

    # 1. Trace width
    min_trace = constraints.get("min_trace_width_mm", rules["min_trace_width_mm"])
    checks.append(_check(
        "Trace Width",
        min_trace >= rules["min_trace_width_mm"],
        f"Min trace: {min_trace} mm  (fab limit: {rules['min_trace_width_mm']} mm)",
        f"Increase minimum trace width to ≥ {rules['min_trace_width_mm']} mm." if min_trace < rules["min_trace_width_mm"] else "",
    ))

    # 2. Clearance
    min_clear = constraints.get("min_clearance_mm", rules["min_clearance_mm"])
    checks.append(_check(
        "Clearance",
        min_clear >= rules["min_clearance_mm"],
        f"Min clearance: {min_clear} mm  (fab limit: {rules['min_clearance_mm']} mm)",
        f"Increase clearance to ≥ {rules['min_clearance_mm']} mm." if min_clear < rules["min_clearance_mm"] else "",
    ))

    # 3. Drill size
    min_drill = constraints.get("min_drill_mm", rules["min_drill_mm"])
    checks.append(_check(
        "Drill Size",
        min_drill >= rules["min_drill_mm"],
        f"Min drill: {min_drill} mm  (fab limit: {rules['min_drill_mm']} mm)",
        f"Increase drill diameter to ≥ {rules['min_drill_mm']} mm." if min_drill < rules["min_drill_mm"] else "",
    ))

    # 4. Annular ring
    annular = constraints.get("min_annular_ring_mm", rules["min_annular_ring_mm"])
    checks.append(_check(
        "Annular Ring",
        annular >= rules["min_annular_ring_mm"],
        f"Annular ring: {annular} mm  (fab limit: {rules['min_annular_ring_mm']} mm)",
        f"Increase annular ring to ≥ {rules['min_annular_ring_mm']} mm." if annular < rules["min_annular_ring_mm"] else "",
    ))

    # 5. BGA support
    has_bga = any(str(c.get("package", "")).upper().startswith("BGA") for c in components)
    bga_ok  = (not has_bga) or rules["supports_bga"]
    checks.append(_check(
        "BGA Support",
        bga_ok,
        f"BGA components present: {has_bga}  |  Fab supports BGA: {rules['supports_bga']}",
        "Remove BGA components or switch to a fab that supports BGA." if not bga_ok else "",
    ))

    # 6. Via diameter
    min_via = constraints.get("min_via_diameter_mm", rules["min_via_diameter_mm"])
    checks.append(_check(
        "Via Diameter",
        min_via >= rules["min_via_diameter_mm"],
        f"Min via diameter: {min_via} mm  (fab limit: {rules['min_via_diameter_mm']} mm)",
        f"Increase via diameter to ≥ {rules['min_via_diameter_mm']} mm." if min_via < rules["min_via_diameter_mm"] else "",
    ))

    # 7. Component count
    comp_count = len(components)
    max_comp   = rules["max_components"]
    checks.append(_check(
        "Component Count",
        comp_count <= max_comp,
        f"Components: {comp_count}  (fab limit: {max_comp})",
        f"Split design into sub-assemblies; {comp_count} exceeds fab limit of {max_comp}." if comp_count > max_comp else "",
    ))

    # 8. Layer count
    layers = constraints.get("layers", 2)
    checks.append(_check(
        "Layer Count",
        layers <= rules["max_layers"],
        f"Layers: {layers}  (fab limit: {rules['max_layers']})",
        f"Reduce layer count to ≤ {rules['max_layers']} or choose a different fab." if layers > rules["max_layers"] else "",
    ))

    # 9. Silkscreen width
    silk = constraints.get("min_silkscreen_width_mm", rules["min_silkscreen_width_mm"])
    checks.append(_check(
        "Silkscreen Width",
        silk >= rules["min_silkscreen_width_mm"],
        f"Silkscreen width: {silk} mm  (fab limit: {rules['min_silkscreen_width_mm']} mm)",
        f"Increase silkscreen stroke to ≥ {rules['min_silkscreen_width_mm']} mm." if silk < rules["min_silkscreen_width_mm"] else "",
    ))

    # 10. Assembly complexity (SMT-only vs mixed)
    smt_only   = placement.get("smt_only", True)
    has_thru   = any(str(c.get("mounting", "smt")).lower() == "thru" for c in components)
    mixed_ok   = not has_thru or not smt_only
    checks.append(_check(
        "Assembly Complexity",
        mixed_ok or not has_thru,
        f"Through-hole components present: {has_thru}  |  SMT-only assembly: {smt_only}",
        "Mixed assembly increases cost; consider converting THT parts to SMT equivalents." if has_thru and smt_only else "",
    ))

    return checks


# ---------------------------------------------------------------------------
# Scoring & report
# ---------------------------------------------------------------------------

GRADE_THRESHOLDS = [
    (1.00, "A"),
    (0.90, "B"),
    (0.75, "C"),
    (0.60, "D"),
    (0.00, "F"),
]

GRADE_EMOJI = {"A": "🟢", "B": "🟡", "C": "🟠", "D": "🔴", "F": "⛔"}


def _grade(score_pct: float) -> str:
    for threshold, letter in GRADE_THRESHOLDS:
        if score_pct >= threshold:
            return letter
    return "F"


def score_dfm(design: dict, fab: str) -> dict:
    """
    Run DFM checks for the given fab and return a structured result.

    Parameters
    ----------
    design : dict  — design JSON with `components`, `pcb_placement_rules`, `constraints`
    fab    : str   — one of: jlcpcb, pcbway, oshpark

    Returns
    -------
    dict with keys: grade, score_pct, checks, failures, recommendations, fab_name
    """
    if fab not in FAB_RULES:
        raise ValueError(f"Unknown fab '{fab}'. Choose from: {', '.join(FAB_RULES)}")
    rules    = FAB_RULES[fab]
    checks   = run_checks(design, rules)
    passed   = sum(1 for c in checks if c["passed"])
    total    = len(checks)
    pct      = passed / total if total else 0.0
    failures = [c for c in checks if not c["passed"]]
    recs     = [c["recommendation"] for c in checks if c["recommendation"]]
    recs    += rules.get("notes", [])
    return {
        "grade":           _grade(pct),
        "score_pct":       round(pct * 100, 1),
        "checks":          checks,
        "failures":        failures,
        "recommendations": recs,
        "fab_name":        rules["name"],
    }


def generate_markdown_report(result: dict, fab: str) -> str:
    """Render the DFM result as a markdown document."""
    grade      = result["grade"]
    emoji      = GRADE_EMOJI.get(grade, "")
    fab_name   = result["fab_name"]
    score_pct  = result["score_pct"]
    timestamp  = datetime.now().isoformat(timespec="seconds")

    lines: list[str] = [
        f"# DFM Report — {fab_name}",
        f"",
        f"> Generated: {timestamp}",
        f"",
        f"## Overall Grade",
        f"",
        f"| Fab | Score | Grade |",
        f"|-----|-------|-------|",
        f"| {fab_name} | {score_pct:.1f}% | {emoji} **{grade}** |",
        f"",
        f"## Check Results",
        f"",
        f"| # | Check | Status | Detail |",
        f"|---|-------|--------|--------|",
    ]
    for i, c in enumerate(result["checks"], 1):
        status = "✅ PASS" if c["passed"] else "❌ FAIL"
        lines.append(f"| {i} | {c['check']} | {status} | {c['detail']} |")

    if result["failures"]:
        lines += [
            "",
            "## Failures",
            "",
        ]
        for f in result["failures"]:
            lines.append(f"- **{f['check']}**: {f['detail']}")

    if result["recommendations"]:
        lines += [
            "",
            "## Recommendations",
            "",
        ]
        for r in result["recommendations"]:
            lines.append(f"- {r}")

    lines += ["", "---", f"*KiCad AI Copilot DFM Checker — {fab_name}*", ""]
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="KiCad AI Copilot — DFM Checker",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--input",  required=True, help="Design JSON file")
    parser.add_argument("--fab",    required=True, choices=list(FAB_RULES.keys()),
                        help="Target fab: jlcpcb | pcbway | oshpark")
    parser.add_argument("--output", required=True, help="Output markdown report file")
    args = parser.parse_args()

    if not os.path.isfile(args.input):
        print(f"ERROR: input file '{args.input}' not found.", file=sys.stderr)
        sys.exit(1)

    with open(args.input, encoding="utf-8") as fh:
        design = json.load(fh)

    print(f"[DFM Checker] Checking design against {FAB_RULES[args.fab]['name']} rules …")
    result = score_dfm(design, args.fab)

    grade_emoji = GRADE_EMOJI.get(result["grade"], "")
    print(f"  Grade: {grade_emoji} {result['grade']}  ({result['score_pct']:.1f}%)")
    print(f"  Passed: {len([c for c in result['checks'] if c['passed']])} / {len(result['checks'])} checks")

    if result["failures"]:
        print(f"  Failures ({len(result['failures'])}):")
        for f in result["failures"]:
            print(f"    ❌  {f['check']}: {f['detail']}")

    report = generate_markdown_report(result, args.fab)
    with open(args.output, "w", encoding="utf-8") as fh:
        fh.write(report)
    print(f"[DFM Checker] Report written to '{args.output}'.")


if __name__ == "__main__":
    main()
