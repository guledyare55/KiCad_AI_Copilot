#!/usr/bin/env python3
"""
KiCad AI Copilot — Python KiCad File Generator
================================================
Converts the JSON output from the KiCad AI Copilot web tool into
actual KiCad v7 project files:
  - project.kicad_pro    (project file)
  - project.kicad_sch    (schematic)
  - project.kicad_pcb    (PCB layout stubs)
  - bom.csv              (Bill of Materials)

Usage:
    python kicad_generator.py --input design.json --output ./output_dir/

Author: KiCad AI Copilot
"""

import json
import os
import sys
import uuid
import csv
import argparse
from datetime import datetime

# ─── KiCad UUID helper ────────────────────────────────────
def new_uuid():
    return str(uuid.uuid4())

def ts():
    return datetime.now().strftime("%Y%m%d_%H%M%S")

# ═══════════════════════════════════════════════════════════
# KICAD PROJECT FILE (.kicad_pro)
# ═══════════════════════════════════════════════════════════
def generate_project_file(design: dict, project_name: str) -> str:
    summary = design.get("project_summary", "KiCad AI Copilot Generated Design")
    
    # AI Constraint-Driven Routing Rules (Feature 5)
    custom_rules = design.get("custom_kicad_rules", [])
    custom_rules_str = ""
    if custom_rules:
        custom_rules_str = "version 1\n\n"
        for cr in custom_rules:
            custom_rules_str += f"# {cr.get('description', '')}\n"
            custom_rules_str += f"{cr.get('rule', '')}\n\n"

    return json.dumps({
        "board": {
            "design_settings": {
                "defaults": {
                    "board_outline_line_width": 0.05,
                    "copper_line_width": 0.25,
                    "copper_text_size_h": 1.5,
                    "copper_text_size_v": 1.5,
                    "copper_text_thickness": 0.3,
                    "courtyard_line_width": 0.05,
                    "dimension_precision": 4,
                    "dimension_units": 3,
                    "fab_line_width": 0.1,
                    "fab_text_size_h": 1.0,
                    "fab_text_size_v": 1.0,
                    "fab_text_thickness": 0.15,
                    "other_line_width": 0.1,
                    "silk_line_width": 0.1,
                    "silk_text_size_h": 1.0,
                    "silk_text_size_v": 1.0,
                    "silk_text_thickness": 0.15,
                },
                "rules": {
                    "custom_rules": custom_rules_str,
                    "min_clearance": 0.1,
                    "min_copper_edge_clearance": 0.2,
                    "min_hole_clearance": 0.1,
                    "min_hole_to_hole": 0.25,
                    "min_microvia_diameter": 0.1,
                    "min_microvia_drill": 0.05,
                    "min_resolved_spokes_count": 2,
                    "min_silk_clearance": 0.0,
                    "min_text_height": 0.5,
                    "min_text_thickness": 0.08,
                    "min_through_hole_diameter": 0.3,
                    "min_track_width": 0.1,
                    "min_via_annular_width": 0.1,
                    "min_via_diameter": 0.3,
                }
            }
        },
        "boards": [],
        "cvpcb": {"equivalence_files": []},
        "libraries": {
            "pinned_footprint_libs": [],
            "pinned_symbol_libs": []
        },
        "meta": {
            "filename": f"{project_name}.kicad_pro",
            "version": 1
        },
        "net_settings": {
            "classes": [
                {
                    "bus_width": 12,
                    "clearance": 0.2,
                    "diff_pair_gap": 0.25,
                    "diff_pair_via_gap": 0.25,
                    "diff_pair_width": 0.2,
                    "line_style": 0,
                    "microvia_diameter": 0.3,
                    "microvia_drill": 0.1,
                    "name": "Default",
                    "pcb_color": "rgba(0, 0, 0, 0.000)",
                    "schematic_color": "rgba(0, 0, 0, 0.000)",
                    "track_width": 0.25,
                    "via_diameter": 0.8,
                    "via_drill": 0.4,
                    "wire_width": 6
                },
                {
                    "bus_width": 12,
                    "clearance": 0.3,
                    "name": "Power",
                    "track_width": 0.5,
                    "via_diameter": 0.8,
                    "via_drill": 0.4
                },
                {
                    "bus_width": 12,
                    "clearance": 0.5,
                    "name": "RF",
                    "track_width": 0.28,
                    "via_diameter": 0.6,
                    "via_drill": 0.3
                }
            ]
        },
        "schematic": {
            "annotate_start_num": 0,
            "drawing": {
                "default_line_thickness": 6,
                "default_text_size": 50,
                "field_names": [],
                "intersheets_ref_own_page": False,
                "intersheets_ref_prefix": "",
                "intersheets_ref_short": False,
                "intersheets_ref_show": False,
                "intersheets_ref_suffix": "",
                "junction_size_choice": 3,
                "label_size_ratio": 0.375,
                "pin_symbol_size": 25,
                "text_offset_ratio": 0.08
            },
            "legacy_lib_dir": "",
            "legacy_lib_list": []
        },
        "sheets": [["page1", "Root"]],
        "text_variables": {
            "PROJECT_NAME": project_name,
            "AI_GENERATED": "KiCad AI Copilot",
            "GENERATED_ON": datetime.now().isoformat(),
            "SUMMARY": summary[:100]
        }
    }, indent=2)


# ═══════════════════════════════════════════════════════════
# KICAD SCHEMATIC (.kicad_sch) — S-Expression format
# ═══════════════════════════════════════════════════════════
def generate_schematic(design: dict, project_name: str) -> str:
    components = design.get("components", [])
    auto = design.get("auto_added_components", [])
    nets = design.get("nets", [])
    power_tree = design.get("power_tree", {})

    lines = []
    lines.append('(kicad_sch (version 20230121) (generator "kicad_ai_copilot")')
    lines.append(f'  (uuid "{new_uuid()}")')
    lines.append('  (paper "A3")')
    lines.append('  (title_block')
    lines.append(f'    (title "{project_name}")')
    lines.append(f'    (date "{datetime.now().strftime("%Y-%m-%d")}")')
    lines.append('    (rev "1.0")')
    lines.append('    (company "KiCad AI Copilot")')
    lines.append(f'    (comment 1 "{design.get("project_summary","")[:80]}")')
    lines.append('  )')
    lines.append('')

    # Power symbols (GND, VCC, etc.)
    power_x, power_y = 20, 20
    rail_names = [r["name"] for r in power_tree.get("rails", [])]
    for rail in rail_names:
        if rail == "GND":
            lines.append(f'  (global_label "{rail}" (shape input) (at {power_x} {power_y} 0) (uuid "{new_uuid()}")')
            lines.append(f'    (effects (font (size 1.27 1.27))))')
        else:
            lines.append(f'  (global_label "{rail}" (shape output) (at {power_x} {power_y-5} 0) (uuid "{new_uuid()}")')
            lines.append(f'    (effects (font (size 1.27 1.27))))')
        power_x += 30

    lines.append('')
    lines.append('  ; === USER COMPONENTS ===')

    # User components
    col, row = 50, 50
    col_w = 60
    row_h = 50
    for i, comp in enumerate(components):
        col_i = i % 4
        row_i = i // 4
        x = col + col_i * col_w
        y = row + row_i * row_h
        ref = comp.get("ref", f"U{i+1}")
        name = comp.get("name", "Component")
        fp = comp.get("footprint", "")
        val = comp.get("value", name)
        lcsc = comp.get("lcsc", "")

        lines.append(f'  (symbol')
        lines.append(f'    (lib_id "Device:{_symbol_for_type(comp.get("type","MCU"), name)}")')
        lines.append(f'    (at {x} {y} 0)')
        lines.append(f'    (unit 1)')
        lines.append(f'    (in_bom yes) (on_board yes)')
        lines.append(f'    (uuid "{new_uuid()}")')
        lines.append(f'    (property "Reference" "{ref}" (at {x} {y-8} 0) (effects (font (size 1.27 1.27))))')
        lines.append(f'    (property "Value" "{val}" (at {x} {y-5} 0) (effects (font (size 1.27 1.27))))')
        lines.append(f'    (property "Footprint" "{fp}" (at {x} {y-2} 0) (effects (font (size 1.27 1.27)) (hide yes)))')
        if lcsc:
            lines.append(f'    (property "LCSC" "{lcsc}" (at {x} {y+2} 0) (effects (font (size 1.27 1.27)) (hide yes)))')
        lines.append(f'    (property "Description" "{comp.get("reason","")[:60]}" (at {x} {y+5} 0) (effects (font (size 1.0 1.0)) (hide yes)))')
        lines.append(f'  )')
        lines.append('')

    # Nets (as labels in schematic)
    lines.append('  ; === NET LABELS ===')
    nlx, nly = 20, 200
    for net in nets[:20]:  # Cap at 20 for readability
        net_name = net.get("name", "")
        lines.append(f'  (net_label "{net_name}" (at {nlx} {nly} 0) (uuid "{new_uuid()}")')
        lines.append(f'    (effects (font (size 1.27 1.27))))')
        nly += 8

    lines.append('')
    lines.append('  ; === AUTO-ADDED SUPPORT COMPONENTS ===')
    lines.append(f'  ; {len(auto)} support components auto-added by KiCad AI Copilot')
    for i, a in enumerate(auto[:30]):
        lines.append(f'  ; [{a.get("ref","AUTO")}] {a.get("name","")} -> {", ".join(a.get("connected_to", []))}')

    lines.append('')
    lines.append(') ; end kicad_sch')
    return "\n".join(lines)


def _symbol_for_type(comp_type: str, name: str) -> str:
    t = comp_type.lower()
    n = name.lower()
    if "led" in n or "led" in t: return "LED"
    if "button" in n or "sw" in n: return "SW_Push"
    if "battery" in n or "cr2032" in n: return "Battery"
    if "cap" in n or t == "passive" and "c" in n: return "C"
    if "resistor" in n or t == "passive" and "r" in n: return "R"
    if t == "connector": return "Conn_01x04"
    if t == "sensor": return "Sensor"
    if t == "power": return "PWR_FLAG"
    return "IC"


# ═══════════════════════════════════════════════════════════
# KICAD PCB (.kicad_pcb) — Board stub
# ═══════════════════════════════════════════════════════════
def generate_pcb(design: dict, project_name: str) -> str:
    components = design.get("components", [])
    nets = design.get("nets", [])
    rules = design.get("pcb_placement_rules", [])

    # Estimate board size
    total_comps = len(components) + len(design.get("auto_added_components", []))
    size_constraint = "smallest"
    board_w = max(30, min(100, total_comps * 4))
    board_h = max(25, min(80, total_comps * 3))

    lines = []
    lines.append('(kicad_pcb (version 20230121) (generator "kicad_ai_copilot")')
    lines.append('')
    lines.append('  (general')
    lines.append(f'    (thickness 1.6)')
    lines.append('    (legacy_teardrops no)')
    lines.append('  )')
    lines.append('')
    lines.append('  (paper "A4")')
    lines.append('')
    lines.append('  (title_block')
    lines.append(f'    (title "{project_name}")')
    lines.append(f'    (date "{datetime.now().strftime("%Y-%m-%d")}")')
    lines.append('    (rev "1.0")')
    lines.append('    (company "KiCad AI Copilot")')
    lines.append('  )')
    lines.append('')

    # Layers
    lines.append('  (layers')
    layers = [
        ('0', 'F.Cu', 'signal'), ('31', 'B.Cu', 'signal'),
        ('32', 'B.Adhes', 'user'), ('33', 'F.Adhes', 'user'),
        ('34', 'B.Paste', 'user'), ('35', 'F.Paste', 'user'),
        ('36', 'B.SilkS', 'user'), ('37', 'F.SilkS', 'user'),
        ('38', 'B.Mask', 'user'), ('39', 'F.Mask', 'user'),
        ('40', 'Dwgs.User', 'user'), ('41', 'Cmts.User', 'user'),
        ('42', 'Eco1.User', 'user'), ('43', 'Eco2.User', 'user'),
        ('44', 'Edge.Cuts', 'user'), ('45', 'Margin', 'user'),
        ('46', 'B.CrtYd', 'user'), ('47', 'F.CrtYd', 'user'),
        ('48', 'B.Fab', 'user'), ('49', 'F.Fab', 'user'),
    ]
    for num, name, ltype in layers:
        lines.append(f'    ({num} "{name}" {ltype})')
    lines.append('  )')
    lines.append('')

    # Setup / design rules
    lines.append('  (setup')
    lines.append('    (pad_to_mask_clearance 0.05)')
    lines.append('    (solder_mask_min_width 0)')
    lines.append('    (allow_soldermask_bridges_in_footprints no)')
    lines.append('    (pcbplotparams')
    lines.append('      (layerselection 0x00010fc_ffffffff)')
    lines.append('      (plot_on_all_layers_selection 0x0000000_00000000)')
    lines.append('      (disableapertmacros false)')
    lines.append('      (usegerberextensions false)')
    lines.append('      (usegerberattributes true)')
    lines.append('      (usegerberadvancedattributes true)')
    lines.append('      (creategerberjobfile true)')
    lines.append('      (dashed_line_dash_ratio 12.000000)')
    lines.append('      (dashed_line_gap_ratio 3.000000)')
    lines.append('      (svgprecision 4)')
    lines.append('      (plotframeref false)')
    lines.append('      (viasonmask false)')
    lines.append('      (mode 1)')
    lines.append('      (useauxorigin false)')
    lines.append('      (hpglpennumber 1)')
    lines.append('      (hpglpenspeed 20)')
    lines.append('      (hpglpendiameter 15.000000)')
    lines.append('      (pdf_front_fp_property_popups true)')
    lines.append('      (pdf_back_fp_property_popups true)')
    lines.append('      (dxfpolygonmode true)')
    lines.append('      (dxfimperialunits true)')
    lines.append('      (dxfusepcbnewfont true)')
    lines.append('      (psnegative false)')
    lines.append('      (psa4output false)')
    lines.append('      (plotreference true)')
    lines.append('      (plotvalue true)')
    lines.append('      (plotfptext true)')
    lines.append('      (plotinvisibletext false)')
    lines.append('      (sketchpadsonfab false)')
    lines.append('      (subtractmaskfromsilk false)')
    lines.append('      (outputformat 1)')
    lines.append('      (mirror false)')
    lines.append('      (drillshape 1)')
    lines.append('      (scaleselection 1)')
    lines.append('      (outputdirectory "gerbers/")')
    lines.append('    )')
    lines.append('  )')
    lines.append('')

    # Net declarations
    lines.append('  ; === NET DECLARATIONS ===')
    lines.append('  (net 0 "")')
    for i, net in enumerate(nets, 1):
        lines.append(f'  (net {i} "{net["name"]}")')
    lines.append('')

    # Design Rules from AI
    lines.append('  ; === AI-GENERATED PLACEMENT NOTES (Eco1.User layer) ===')
    ry = 5
    for rule in rules:
        lines.append(f'  (gr_text "{rule["rule"]}: {rule["description"][:60]}" (at 0 {ry}) (layer "Cmts.User") (uuid "{new_uuid()}")')
        lines.append(f'    (effects (font (size 1.0 1.0))))')
        ry += 3

    lines.append('')
    lines.append('  ; === BOARD OUTLINE ===')
    # Board outline rectangle
    lines.append(f'  (gr_rect (start 0 0) (end {board_w} {board_h}) (layer "Edge.Cuts") (width 0.05) (uuid "{new_uuid()}"))')
    lines.append('')

    # Component footprint stubs
    lines.append('  ; === COMPONENT FOOTPRINTS (Stubs — place with KiCad auto-placer) ===')
    x, y = 5, 5
    x_step = 12
    y_step = 12
    per_row = max(1, board_w // x_step)

    for i, comp in enumerate(components):
        col_i = i % per_row
        row_i = i // per_row
        cx = x + col_i * x_step
        cy = y + row_i * y_step
        ref = comp.get("ref", f"U{i}")
        fp = comp.get("footprint", "")
        val = comp.get("value", "")

        lines.append(f'  (footprint "{fp}" (layer "F.Cu")')
        lines.append(f'    (at {cx:.2f} {cy:.2f})')
        lines.append(f'    (descr "{comp.get("reason","")[:60]}")')
        lines.append(f'    (tags "{comp.get("type","")}")')
        lines.append(f'    (property "Reference" "{ref}" (at 0 -3) (layer "F.SilkS") (uuid "{new_uuid()}")')
        lines.append(f'      (effects (font (size 1 1) (thickness 0.15))))')
        lines.append(f'    (property "Value" "{val}" (at 0 3) (layer "F.Fab") (uuid "{new_uuid()}")')
        lines.append(f'      (effects (font (size 1 1) (thickness 0.15))))')
        lines.append(f'    (property "Footprint" "{fp}" (at 0 0) (layer "F.Fab") (uuid "{new_uuid()}")')
        lines.append(f'      (effects (font (size 1 1) (thickness 0.15)) (hide yes)))')
        lines.append(f'    (uuid "{new_uuid()}")')
        lines.append(f'  )')
        lines.append('')

    lines.append(') ; end kicad_pcb')
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════
# BILL OF MATERIALS (BOM CSV)
# ═══════════════════════════════════════════════════════════
def generate_bom(design: dict) -> str:
    import io
    buf = io.StringIO()
    writer = csv.writer(buf)

    writer.writerow(["#", "Reference", "Name", "Value", "Type", "Footprint", "LCSC", "Reason", "Source"])

    for i, comp in enumerate(design.get("components", []), 1):
        writer.writerow([
            i,
            comp.get("ref", ""),
            comp.get("name", ""),
            comp.get("value", ""),
            comp.get("type", ""),
            comp.get("footprint", ""),
            comp.get("lcsc", ""),
            comp.get("reason", "")[:80],
            "User Specified"
        ])

    writer.writerow([])
    writer.writerow(["# AUTO-ADDED SUPPORT COMPONENTS"])
    writer.writerow(["#", "Reference", "Name", "Value", "Type", "Footprint", "LCSC", "Reason", "Source"])

    base = len(design.get("components", []))
    for i, comp in enumerate(design.get("auto_added_components", []), base + 1):
        writer.writerow([
            i,
            comp.get("ref", f"AUTO{i}"),
            comp.get("name", "")[:40],
            comp.get("value", ""),
            "Auto",
            comp.get("footprint", ""),
            "",
            comp.get("reason", "")[:80],
            "AI Auto-Added"
        ])

    return buf.getvalue()


# ═══════════════════════════════════════════════════════════
# PLACEMENT HINTS (JSON)
# ═══════════════════════════════════════════════════════════
def generate_placement_hints(design: dict) -> str:
    rules = design.get("pcb_placement_rules", [])
    rf_rules = design.get("rf_or_critical_rules", [])
    actions = design.get("kiCad_actions", [])

    hints = {
        "generator": "KiCad AI Copilot",
        "timestamp": datetime.now().isoformat(),
        "placement_rules": rules,
        "rf_critical_rules": rf_rules,
        "route_hints": [a for a in actions if a.get("action") == "route_hint"],
        "summary": design.get("project_summary", "")
    }
    return json.dumps(hints, indent=2)


# ═══════════════════════════════════════════════════════════
# MAIN GENERATOR
# ═══════════════════════════════════════════════════════════
def generate_kicad_project(design: dict, output_dir: str):
    """
    Generate complete KiCad project files from AI Copilot JSON output.
    """
    # Determine project name
    summary = design.get("project_summary", "kicad_project")
    # Try to extract short name
    project_name = summary.split(":")[0].strip().replace(" ", "_")[:30] or "kicad_ai_design"
    project_name = "".join(c if c.isalnum() or c == "_" else "_" for c in project_name)

    os.makedirs(output_dir, exist_ok=True)

    files = {
        f"{project_name}.kicad_pro": generate_project_file(design, project_name),
        f"{project_name}.kicad_sch": generate_schematic(design, project_name),
        f"{project_name}.kicad_pcb": generate_pcb(design, project_name),
        f"{project_name}_bom.csv": generate_bom(design),
        f"{project_name}_placement_hints.json": generate_placement_hints(design),
    }

    written = []
    for filename, content in files.items():
        path = os.path.join(output_dir, filename)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        written.append(path)
        print(f"  ✓ Written: {path}")

    print(f"\n✅ KiCad project generated: {len(written)} files in '{output_dir}'")
    print(f"   Project name: {project_name}")
    print(f"   Components: {len(design.get('components',[]))} user + {len(design.get('auto_added_components',[]))} auto-added")
    print(f"   Nets: {len(design.get('nets',[]))}")
    print(f"   PCB rules: {len(design.get('pcb_placement_rules',[]))} placement + {len(design.get('rf_or_critical_rules',[]))} RF")
    print(f"\n📋 Next steps:")
    print(f"   1. Open {project_name}.kicad_pro in KiCad v7+")
    print(f"   2. Review schematic and run ERC (Electrical Rules Check)")
    print(f"   3. Import netlist into PCB editor")
    print(f"   4. Run auto-placer, then follow placement_hints.json")
    print(f"   5. Route PCB following RF critical rules")
    print(f"   6. Run DRC (Design Rules Check) before fabrication")

    return written


# ═══════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════
def main():
    parser = argparse.ArgumentParser(
        description="KiCad AI Copilot — Generate KiCad project files from AI design JSON",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python kicad_generator.py --input ble_sensor_kicad_copilot.json --output ./my_ble_project/
  python kicad_generator.py --input design.json --output ./output/ --validate
        """
    )
    parser.add_argument("--input", "-i", required=True, help="Input JSON file from KiCad AI Copilot")
    parser.add_argument("--output", "-o", default="./kicad_output/", help="Output directory (default: ./kicad_output/)")
    parser.add_argument("--validate", "-v", action="store_true", help="Run validation check and report")
    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(f"❌ Error: Input file not found: {args.input}")
        sys.exit(1)

    print(f"\n🔌 KiCad AI Copilot — File Generator")
    print(f"   Input:  {args.input}")
    print(f"   Output: {args.output}")
    print()

    with open(args.input, "r", encoding="utf-8") as f:
        design = json.load(f)

    if args.validate:
        print("🔍 Validation Results:")
        checklist = design.get("validation_checklist", [])
        passed = 0
        for check in checklist:
            status = "✓" if check.get("pass") else "✗"
            print(f"  {status} {check.get('item','')}: {check.get('note','')}")
            if check.get("pass"): passed += 1
        print(f"\n  {passed}/{len(checklist)} checks passed")
        print()

    print("📁 Generating KiCad project files...")
    generate_kicad_project(design, args.output)


if __name__ == "__main__":
    main()
