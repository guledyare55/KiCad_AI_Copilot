"""
bom_optimizer.py — BOM Optimizer for KiCad AI Copilot
======================================================
Reads a CSV BOM and applies smart substitution rules targeting JLCPCB basic-library
parts to minimize assembly cost.

Usage:
    python bom_optimizer.py --input bom.csv --instruction "JLCPCB basic only" --output bom_optimized.csv
"""

import argparse
import csv
import json
import os
import sys
from datetime import datetime
from typing import Any

# ---------------------------------------------------------------------------
# JLCPCB Basic Parts Library — subset of commonly used passives & actives
# Format: (value_pattern, footprint_pattern) -> {lcsc, unit_price_usd, note}
# ---------------------------------------------------------------------------
JLCPCB_BASIC: dict[str, dict[str, Any]] = {
    # Capacitors
    "100nF_0402":  {"lcsc": "C14663",  "unit_price_usd": 0.0019, "value": "100nF",  "footprint": "C_0402"},
    "100nF_0603":  {"lcsc": "C15849",  "unit_price_usd": 0.0021, "value": "100nF",  "footprint": "C_0603"},
    "10uF_0402":   {"lcsc": "C19702",  "unit_price_usd": 0.0082, "value": "10uF",   "footprint": "C_0402"},
    "10uF_0603":   {"lcsc": "C19578",  "unit_price_usd": 0.0088, "value": "10uF",   "footprint": "C_0603"},
    "1uF_0402":    {"lcsc": "C52923",  "unit_price_usd": 0.0032, "value": "1uF",    "footprint": "C_0402"},
    "4.7uF_0402":  {"lcsc": "C23733",  "unit_price_usd": 0.0047, "value": "4.7uF",  "footprint": "C_0402"},
    "22uF_0805":   {"lcsc": "C45783",  "unit_price_usd": 0.0250, "value": "22uF",   "footprint": "C_0805"},
    "1nF_0402":    {"lcsc": "C1588",   "unit_price_usd": 0.0011, "value": "1nF",    "footprint": "C_0402"},
    "10nF_0402":   {"lcsc": "C57112",  "unit_price_usd": 0.0013, "value": "10nF",   "footprint": "C_0402"},

    # Resistors
    "10k_0402":    {"lcsc": "C25804",  "unit_price_usd": 0.0006, "value": "10k",    "footprint": "R_0402"},
    "10k_0603":    {"lcsc": "C25803",  "unit_price_usd": 0.0007, "value": "10k",    "footprint": "R_0603"},
    "1k_0402":     {"lcsc": "C11702",  "unit_price_usd": 0.0006, "value": "1k",     "footprint": "R_0402"},
    "4.7k_0402":   {"lcsc": "C25900",  "unit_price_usd": 0.0006, "value": "4.7k",   "footprint": "R_0402"},
    "100_0402":    {"lcsc": "C25076",  "unit_price_usd": 0.0006, "value": "100",    "footprint": "R_0402"},
    "0_0402":      {"lcsc": "C21189",  "unit_price_usd": 0.0005, "value": "0",      "footprint": "R_0402"},
    "100k_0402":   {"lcsc": "C25803",  "unit_price_usd": 0.0006, "value": "100k",   "footprint": "R_0402"},
    "22_0402":     {"lcsc": "C25900",  "unit_price_usd": 0.0006, "value": "22",     "footprint": "R_0402"},

    # Inductors
    "100nH_0402":  {"lcsc": "C1046",   "unit_price_usd": 0.0180, "value": "100nH",  "footprint": "L_0402"},
    "10uH_0805":   {"lcsc": "C408271", "unit_price_usd": 0.0430, "value": "10uH",   "footprint": "L_0805"},
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _normalise_value(value: str) -> str:
    """Normalise component value string: strip spaces, lowercase µ→u."""
    return value.strip().replace("µ", "u").replace("Ω", "").replace("ohm", "").replace("Ohm", "").replace(" ", "")


def _footprint_tag(footprint: str) -> str:
    """Extract the package size tag from a KiCad footprint string (e.g. '0402')."""
    fp = footprint.upper()
    for size in ["01005", "0201", "0402", "0603", "0805", "1206", "1210", "2010", "2512"]:
        if size in fp:
            return size
    return ""


def _lookup_basic(value: str, footprint: str) -> dict[str, Any] | None:
    """Return JLCPCB basic entry if a match exists, else None."""
    val = _normalise_value(value)
    size = _footprint_tag(footprint)
    key = f"{val}_{size}"
    return JLCPCB_BASIC.get(key)


def _is_passive(name: str) -> bool:
    """Return True if the component is a passive (R, C, L)."""
    n = name.upper()
    return any(n.startswith(p) for p in ("C", "R", "L", "CAP", "RES", "IND"))


# ---------------------------------------------------------------------------
# Core optimisation logic
# ---------------------------------------------------------------------------

def optimize_bom_data(components: list[dict], instruction: str) -> dict:
    """
    Optimise a list of BOM component dicts.

    Parameters
    ----------
    components : list[dict]
        Each dict must contain keys: Ref, Name, Value, Footprint, LCSC,
        Quantity, Unit_Price_USD.
    instruction : str
        Free-text optimisation hint (e.g. 'JLCPCB basic only').

    Returns
    -------
    dict with keys:
        substitutions   list of substitution dicts
        savings_usd     float
        original_cost   float
        optimized_cost  float
        warnings        list[str]
    """
    jlcpcb_mode = "jlcpcb" in instruction.lower() or "basic" in instruction.lower()

    substitutions: list[dict] = []
    warnings: list[str] = []
    original_cost = 0.0
    optimized_cost = 0.0

    for comp in components:
        try:
            qty = int(comp.get("Quantity", 1))
            orig_price = float(comp.get("Unit_Price_USD", 0.0))
        except (ValueError, TypeError):
            qty = 1
            orig_price = 0.0
            warnings.append(f"Could not parse price/quantity for {comp.get('Ref', '?')}")

        original_cost += orig_price * qty
        name = comp.get("Name", "")
        value = comp.get("Value", "")
        footprint = comp.get("Footprint", "")
        ref = comp.get("Ref", "?")

        if jlcpcb_mode and _is_passive(name):
            match = _lookup_basic(value, footprint)
            if match and match["lcsc"] != comp.get("LCSC", ""):
                new_price = match["unit_price_usd"]
                delta = (new_price - orig_price) * qty
                substitutions.append({
                    "ref":         ref,
                    "old_lcsc":    comp.get("LCSC", ""),
                    "new_lcsc":    match["lcsc"],
                    "old_price":   orig_price,
                    "new_price":   new_price,
                    "quantity":    qty,
                    "cost_delta":  round(delta, 6),
                    "note":        f"Substituted with JLCPCB basic {match['value']} {match['footprint']}",
                })
                optimized_cost += new_price * qty
                comp["LCSC"] = match["lcsc"]
                comp["Unit_Price_USD"] = new_price
                continue
            elif not match:
                warnings.append(f"{ref} ({value} {footprint}): no JLCPCB basic alternative found")

        optimized_cost += orig_price * qty

    return {
        "substitutions": substitutions,
        "savings_usd":   round(original_cost - optimized_cost, 4),
        "original_cost": round(original_cost, 4),
        "optimized_cost": round(optimized_cost, 4),
        "warnings":      warnings,
    }


# ---------------------------------------------------------------------------
# CSV I/O
# ---------------------------------------------------------------------------

REQUIRED_COLS = {"Ref", "Name", "Value", "Footprint", "LCSC", "Quantity", "Unit_Price_USD"}


def read_bom_csv(path: str) -> list[dict]:
    """Read a BOM CSV and return a list of row dicts."""
    with open(path, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        rows = list(reader)
    if not rows:
        raise ValueError(f"BOM file '{path}' is empty.")
    missing = REQUIRED_COLS - set(rows[0].keys())
    if missing:
        raise ValueError(f"BOM CSV missing columns: {', '.join(sorted(missing))}")
    return rows


def write_bom_csv(path: str, components: list[dict]) -> None:
    """Write optimised components back to a CSV file."""
    if not components:
        return
    fieldnames = list(components[0].keys())
    with open(path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(components)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="KiCad AI Copilot — BOM Optimizer",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--input",       required=True,  help="Input BOM CSV file")
    parser.add_argument("--instruction", required=True,  help="Optimisation instruction (e.g. 'JLCPCB basic only')")
    parser.add_argument("--output",      required=True,  help="Output optimised BOM CSV file")
    args = parser.parse_args()

    if not os.path.isfile(args.input):
        print(f"ERROR: input file '{args.input}' not found.", file=sys.stderr)
        sys.exit(1)

    print(f"[BOM Optimizer] Reading '{args.input}' …")
    components = read_bom_csv(args.input)
    print(f"  Loaded {len(components)} line items.")

    result = optimize_bom_data(components, args.instruction)

    # --- stdout diff summary ---
    print(f"\n{'='*60}")
    print(f"  Optimisation: {args.instruction}")
    print(f"  Timestamp   : {datetime.now().isoformat(timespec='seconds')}")
    print(f"{'='*60}")
    if result["substitutions"]:
        print(f"\n  Substitutions ({len(result['substitutions'])}):")
        for s in result["substitutions"]:
            arrow = "→"
            sign  = "-" if s["cost_delta"] <= 0 else "+"
            print(f"    {s['ref']:8s}  {s['old_lcsc'] or '(none)':10s} {arrow} {s['new_lcsc']:10s}  "
                  f"${s['old_price']:.4f} → ${s['new_price']:.4f}  "
                  f"Δ {sign}${abs(s['cost_delta']):.4f}  ({s['note']})")
    else:
        print("  No substitutions applied.")

    if result["warnings"]:
        print(f"\n  Warnings:")
        for w in result["warnings"]:
            print(f"    ⚠  {w}")

    print(f"\n  Original cost : ${result['original_cost']:.4f}")
    print(f"  Optimised cost: ${result['optimized_cost']:.4f}")
    savings = result["savings_usd"]
    sign = "-" if savings >= 0 else "+"
    print(f"  Savings       : {sign}${abs(savings):.4f}")
    print(f"{'='*60}\n")

    write_bom_csv(args.output, components)
    print(f"[BOM Optimizer] Written to '{args.output}'.")


if __name__ == "__main__":
    main()
