"""
block_diagram_exporter.py — Block Diagram → KiCad Schematic Exporter
=====================================================================
Converts a KiCad AI Copilot block diagram JSON into a KiCad v7 hierarchical
schematic set (top-level + one stub sub-schematic per block).

Usage:
    python block_diagram_exporter.py --input block_diagram.json --output ./schematic/
"""

import argparse
import json
import os
import sys
import uuid
from datetime import datetime
from typing import Any

# ---------------------------------------------------------------------------
# KiCad v7 S-expression helpers
# ---------------------------------------------------------------------------

KICAD_SCH_VERSION = 20230121   # KiCad 7.x schema version


def _uuid() -> str:
    return str(uuid.uuid4())


def _now_ts() -> str:
    return datetime.now().strftime("%Y%m%dT%H%M%S")


def _indent(text: str, spaces: int) -> str:
    pad = " " * spaces
    return "\n".join(pad + line if line.strip() else line for line in text.splitlines())


# ---------------------------------------------------------------------------
# Block-type → sheet fill colour (ARGB hex)
# ---------------------------------------------------------------------------

BLOCK_COLORS: dict[str, str] = {
    "MCU":         "\"#FFE0B2\"",
    "Power":       "\"#C8E6C9\"",
    "Sensor":      "\"#BBDEFB\"",
    "Radio":       "\"#E1BEE7\"",
    "Memory":      "\"#FFF9C4\"",
    "Connector":   "\"#F0F4C3\"",
    "Display":     "\"#FCE4EC\"",
    "Amplifier":   "\"#E0F7FA\"",
    "Default":     "\"#F5F5F5\"",
}


def _sheet_color(block_type: str) -> str:
    return BLOCK_COLORS.get(block_type, BLOCK_COLORS["Default"])


# ---------------------------------------------------------------------------
# Connection/label type helpers
# ---------------------------------------------------------------------------

CONNECTION_SHAPES: dict[str, str] = {
    "power":  "power_in",
    "signal": "input",
    "data":   "bidirectional",
    "clock":  "input",
    "gpio":   "bidirectional",
}


def _pin_shape(conn_type: str) -> str:
    return CONNECTION_SHAPES.get(conn_type.lower(), "bidirectional")


# ---------------------------------------------------------------------------
# Sub-schematic generator (stub with title frame)
# ---------------------------------------------------------------------------

def _sub_schematic(block: dict, connections_for_block: list[dict]) -> str:
    """Generate a stub sub-schematic for a single block."""
    label   = block.get("label", block.get("id", "Sheet"))
    btype   = block.get("type", "Generic")
    bid     = block.get("id", "b0")
    ts      = _now_ts()

    # Build hierarchical labels (one per connection touching this block)
    hier_labels = []
    seen_labels: set[str] = set()
    for conn in connections_for_block:
        lbl = conn.get("label", f"NET_{_uuid()[:4]}")
        if lbl in seen_labels:
            continue
        seen_labels.add(lbl)
        shape    = _pin_shape(conn.get("type", "signal"))
        at_y     = 50 + len(hier_labels) * 20
        hl_uuid  = _uuid()
        hier_labels.append(
            f'  (hierarchical_label "{lbl}"\n'
            f'    (shape {shape})\n'
            f'    (at 50 {at_y} 0)\n'
            f'    (fields_autoplaced)\n'
            f'    (effects (font (size 1.27 1.27)))\n'
            f'    (uuid "{hl_uuid}")\n'
            f'  )'
        )

    hl_block = "\n".join(hier_labels)

    sch = f"""\
(kicad_sch
  (version {KICAD_SCH_VERSION})
  (generator "kicad_ai_copilot_block_exporter")
  (uuid "{_uuid()}")
  (paper "A4")
  (title_block
    (title "{label}")
    (date "{ts}")
    (rev "1")
    (company "KiCad AI Copilot")
    (comment 1 "Type: {btype}")
    (comment 2 "ID: {bid}")
  )
{hl_block}
)
"""
    return sch


# ---------------------------------------------------------------------------
# Top-level schematic generator
# ---------------------------------------------------------------------------

def _sheet_symbol(block: dict, connections_for_block: list[dict], filename: str) -> str:
    """Render one (sheet …) S-expression for the top-level schematic."""
    label   = block.get("label", block.get("id", "Sheet"))
    x       = float(block.get("x", 100))
    y       = float(block.get("y", 100))
    width   = 60.0
    height  = max(20.0, len(connections_for_block) * 10.0 + 10.0)
    color   = _sheet_color(block.get("type", "Default"))
    sh_uuid = _uuid()

    pins: list[str] = []
    seen_labels: set[str] = set()
    pin_y = y + 10.0
    for conn in connections_for_block:
        lbl = conn.get("label", f"NET")
        if lbl in seen_labels:
            continue
        seen_labels.add(lbl)
        side  = "input" if conn.get("to") == block.get("id") else "output"
        shape = _pin_shape(conn.get("type", "signal"))
        pin_uuid = _uuid()
        # Pins on the right edge of the sheet box
        pins.append(
            f'    (pin "{lbl}" {side}\n'
            f'      (at {x + width} {pin_y:.3f} 0)\n'
            f'      (effects (font (size 1.27 1.27)))\n'
            f'      (uuid "{pin_uuid}")\n'
            f'    )'
        )
        pin_y += 10.0

    pin_block = "\n".join(pins)

    return (
        f'  (sheet\n'
        f'    (at {x:.3f} {y:.3f})\n'
        f'    (size {width:.3f} {height:.3f})\n'
        f'    (fields_autoplaced)\n'
        f'    (stroke (width 0.15) (type solid))\n'
        f'    (fill (color {color}))\n'
        f'    (uuid "{sh_uuid}")\n'
        f'    (property "Sheetname" "{label}" (at {x:.3f} {y - 1.27:.3f} 0)\n'
        f'      (effects (font (size 1.27 1.27)) (justify left bottom))\n'
        f'    )\n'
        f'    (property "Sheetfile" "{filename}" (at {x:.3f} {y + height + 1.27:.3f} 0)\n'
        f'      (effects (font (size 1.27 1.27)) (justify left top))\n'
        f'    )\n'
        f'{pin_block}\n'
        f'  )'
    )


def _wire_for_connection(conn: dict, blocks_by_id: dict) -> str:
    """Generate a simple wire S-expression between two sheet pins."""
    src   = blocks_by_id.get(conn.get("from", ""), {})
    dst   = blocks_by_id.get(conn.get("to", ""), {})
    sx    = float(src.get("x", 100)) + 60.0
    sy    = float(src.get("y", 100)) + 15.0
    dx    = float(dst.get("x", 200)) + 60.0
    dy    = float(dst.get("y", 100)) + 15.0
    mid_x = (sx + dx) / 2.0
    w_uuid = _uuid()
    # Simplified L-shaped wire (two segments)
    seg1 = (
        f'  (wire\n'
        f'    (pts (xy {sx:.3f} {sy:.3f}) (xy {mid_x:.3f} {sy:.3f}))\n'
        f'    (stroke (width 0) (type default))\n'
        f'    (uuid "{_uuid()}")\n'
        f'  )'
    )
    seg2 = (
        f'  (wire\n'
        f'    (pts (xy {mid_x:.3f} {sy:.3f}) (xy {dx:.3f} {dy:.3f}))\n'
        f'    (stroke (width 0) (type default))\n'
        f'    (uuid "{_uuid()}")\n'
        f'  )'
    )
    lbl_x = mid_x
    lbl_y = (sy + dy) / 2.0
    net_lbl = conn.get("label", "")
    net_label = ""
    if net_lbl:
        net_label = (
            f'  (net_label "{net_lbl}"\n'
            f'    (at {lbl_x:.3f} {lbl_y:.3f} 0)\n'
            f'    (fields_autoplaced)\n'
            f'    (effects (font (size 1.27 1.27)))\n'
            f'    (uuid "{_uuid()}")\n'
            f'  )'
        )
    return "\n".join(filter(None, [seg1, seg2, net_label]))


def _top_schematic(blocks: list[dict], connections: list[dict],
                   block_to_file: dict[str, str]) -> str:
    """Generate the top-level top.kicad_sch."""
    ts            = _now_ts()
    blocks_by_id  = {b["id"]: b for b in blocks}

    # Map each block id → list of connections touching it
    conns_for: dict[str, list[dict]] = {b["id"]: [] for b in blocks}
    for conn in connections:
        src = conn.get("from", "")
        dst = conn.get("to", "")
        if src in conns_for:
            conns_for[src].append(conn)
        if dst in conns_for and dst != src:
            conns_for[dst].append(conn)

    sheet_symbols  = []
    for block in blocks:
        bid      = block["id"]
        filename = block_to_file[bid]
        sym      = _sheet_symbol(block, conns_for[bid], filename)
        sheet_symbols.append(sym)

    wires = []
    for conn in connections:
        wires.append(_wire_for_connection(conn, blocks_by_id))

    sheets_block = "\n".join(sheet_symbols)
    wires_block  = "\n".join(wires)

    return f"""\
(kicad_sch
  (version {KICAD_SCH_VERSION})
  (generator "kicad_ai_copilot_block_exporter")
  (uuid "{_uuid()}")
  (paper "A3")
  (title_block
    (title "Top Level — KiCad AI Copilot")
    (date "{ts}")
    (rev "1")
    (company "KiCad AI Copilot")
  )
{sheets_block}
{wires_block}
)
"""


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def export_block_diagram(diagram: dict) -> dict:
    """
    Convert a block diagram dict into KiCad v7 schematic strings.

    Parameters
    ----------
    diagram : dict
        Must contain 'blocks' (list) and 'connections' (list).

    Returns
    -------
    dict with keys:
        top_sch        str   — content of top.kicad_sch
        sub_schematics dict  — {filename: content} for each block
    """
    blocks      = diagram.get("blocks", [])
    connections = diagram.get("connections", [])

    if not blocks:
        raise ValueError("Diagram contains no blocks.")

    # Assign filenames — sanitise label for filesystem safety
    block_to_file: dict[str, str] = {}
    for block in blocks:
        safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in block.get("label", block["id"]))
        block_to_file[block["id"]] = f"{safe}.kicad_sch"

    # Map each block → connections touching it
    conns_for: dict[str, list[dict]] = {b["id"]: [] for b in blocks}
    for conn in connections:
        src = conn.get("from", "")
        dst = conn.get("to", "")
        if src in conns_for:
            conns_for[src].append(conn)
        if dst in conns_for and dst != src:
            conns_for[dst].append(conn)

    sub_schematics: dict[str, str] = {}
    for block in blocks:
        bid      = block["id"]
        filename = block_to_file[bid]
        content  = _sub_schematic(block, conns_for[bid])
        sub_schematics[filename] = content

    top_sch = _top_schematic(blocks, connections, block_to_file)

    return {
        "top_sch":        top_sch,
        "sub_schematics": sub_schematics,
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="KiCad AI Copilot — Block Diagram → KiCad Schematic Exporter",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--input",  required=True, help="Block diagram JSON file")
    parser.add_argument("--output", required=True, help="Output directory for schematic files")
    args = parser.parse_args()

    if not os.path.isfile(args.input):
        print(f"ERROR: input file '{args.input}' not found.", file=sys.stderr)
        sys.exit(1)

    with open(args.input, encoding="utf-8") as fh:
        diagram = json.load(fh)

    print(f"[Block Exporter] Exporting {len(diagram.get('blocks', []))} blocks, "
          f"{len(diagram.get('connections', []))} connections …")

    result = export_block_diagram(diagram)

    os.makedirs(args.output, exist_ok=True)

    # Write top-level schematic
    top_path = os.path.join(args.output, "top.kicad_sch")
    with open(top_path, "w", encoding="utf-8") as fh:
        fh.write(result["top_sch"])
    print(f"  ✔  top.kicad_sch")

    # Write sub-schematics
    for filename, content in result["sub_schematics"].items():
        dest = os.path.join(args.output, filename)
        with open(dest, "w", encoding="utf-8") as fh:
            fh.write(content)
        print(f"  ✔  {filename}")

    total = 1 + len(result["sub_schematics"])
    print(f"[Block Exporter] Done — {total} files written to '{args.output}'.")


if __name__ == "__main__":
    main()
