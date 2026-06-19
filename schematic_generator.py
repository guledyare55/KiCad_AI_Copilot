#!/usr/bin/env python3
"""
KiCad AI Copilot - Auto-Schematic Generator
Reads the design.json and generates a generic .kicad_sch file using Global Labels.
"""

import os
import json
import argparse
import uuid

def generate_schematic(design, output_file):
    sch = []
    sch.append('(kicad_sch (version 20230121) (generator kicad_ai_copilot)')
    sch.append(f'  (uuid "{str(uuid.uuid4())}")')
    sch.append('  (paper "A4")')
    sch.append('  (title_block (title "AI Generated Schematic"))')
    
    # Generic Libraries
    sch.append('  (lib_symbols')
    sch.append('    (symbol "Device:R" (pin_names (offset 0)) (in_bom yes) (on_board yes)')
    sch.append('      (property "Reference" "R" (at 2.032 0 90) (effects (font (size 1.27 1.27))))')
    sch.append('      (property "Value" "R" (at 0 0 90) (effects (font (size 1.27 1.27))))')
    sch.append('      (symbol "R_0_1"')
    sch.append('        (rectangle (start -1.016 -2.54) (end 1.016 2.54) (stroke (width 0.254) (type default)) (fill (type none)))')
    sch.append('      )')
    sch.append('      (symbol "R_1_1"')
    sch.append('        (pin passive line (at 0 5.08 270) (length 2.54) (name "~" (effects (font (size 1.27 1.27)))) (number "1"))')
    sch.append('        (pin passive line (at 0 -5.08 90) (length 2.54) (name "~" (effects (font (size 1.27 1.27)))) (number "2"))')
    sch.append('      )')
    sch.append('    )')
    sch.append('    (symbol "Device:C" (pin_names (offset 0)) (in_bom yes) (on_board yes)')
    sch.append('      (property "Reference" "C" (at 2.032 0 90) (effects (font (size 1.27 1.27))))')
    sch.append('      (property "Value" "C" (at 0 0 90) (effects (font (size 1.27 1.27))))')
    sch.append('      (symbol "C_0_1"')
    sch.append('        (polyline (pts (xy -2.032 -0.762) (xy 2.032 -0.762)) (stroke (width 0.508) (type default)) (fill (type none)))')
    sch.append('        (polyline (pts (xy -2.032 0.762) (xy 2.032 0.762)) (stroke (width 0.508) (type default)) (fill (type none)))')
    sch.append('      )')
    sch.append('      (symbol "C_1_1"')
    sch.append('        (pin passive line (at 0 3.81 270) (length 3.048) (name "~" (effects (font (size 1.27 1.27)))) (number "1"))')
    sch.append('        (pin passive line (at 0 -3.81 90) (length 3.048) (name "~" (effects (font (size 1.27 1.27)))) (number "2"))')
    sch.append('      )')
    sch.append('    )')
    
    components = design.get("components", []) + design.get("auto_added_components", [])
    
    # Generate generic IC symbols
    for c in components:
        if c.get("type") != "passive":
            ic_name = "".join(x for x in c.get("name", "U") if x.isalnum())
            lib_id = f"CopilotLocal:IC_{ic_name}"
            sch.append(f'    (symbol "{lib_id}" (pin_names (offset 1.016)) (in_bom yes) (on_board yes)')
            sch.append('      (property "Reference" "U" (at 0 7.62 0) (effects (font (size 1.27 1.27))))')
            sch.append(f'      (property "Value" "{c.get("name")}" (at 0 -7.62 0) (effects (font (size 1.27 1.27))))')
            sch.append(f'      (symbol "IC_{ic_name}_0_1"')
            sch.append('        (rectangle (start -10.16 5.08) (end 10.16 -5.08) (stroke (width 0.254) (type default)) (fill (type background)))')
            sch.append('      )')
            sch.append(f'      (symbol "IC_{ic_name}_1_1"')
            sch.append('        (pin input line (at -12.7 2.54 0) (length 2.54) (name "PIN1" (effects (font (size 1.27 1.27)))) (number "1"))')
            sch.append('        (pin output line (at 12.7 2.54 180) (length 2.54) (name "PIN2" (effects (font (size 1.27 1.27)))) (number "2"))')
            sch.append('        (pin power_in line (at 0 7.62 270) (length 2.54) (name "VCC" (effects (font (size 1.27 1.27)))) (number "3"))')
            sch.append('        (pin power_in line (at 0 -7.62 90) (length 2.54) (name "GND" (effects (font (size 1.27 1.27)))) (number "4"))')
            sch.append('      )')
            sch.append('    )')
            
    sch.append('  )')
    
    pos_x = 50
    pos_y = 50
    comp_id = 100
    
    for c in components:
        is_passive = c.get("type") == "passive"
        name = c.get("name", "")
        
        lib_id = "Device:R"
        if is_passive:
            if "Cap" in name: lib_id = "Device:C"
            if "Res" in name or "Pull-up" in name: lib_id = "Device:R"
        else:
            ic_name = "".join(x for x in name if x.isalnum())
            lib_id = f"CopilotLocal:IC_{ic_name}"
            
        ref = f"{c.get('ref_prefix', 'U')}{comp_id}"
        
        # Instance
        sch.append(f'  (symbol (lib_id "{lib_id}") (at {pos_x} {pos_y} 0) (unit 1)')
        sch.append('    (in_bom yes) (on_board yes) (dnp no)')
        sch.append(f'    (uuid "{str(uuid.uuid4())}")')
        sch.append(f'    (property "Reference" "{ref}" (at {pos_x} {pos_y-5} 0))')
        sch.append(f'    (property "Value" "{c.get("value", name)}" (at {pos_x} {pos_y+5} 0))')
        sch.append(f'    (property "Footprint" "{c.get("footprint", "")}" (at {pos_x} {pos_y+7} 0) (effects (font (size 1.27 1.27)) hide))')
        sch.append('  )')
        
        # Mock global label attached to it
        sch.append(f'  (global_label "GND" (shape input) (at {pos_x-2.54} {pos_y+10} 180)')
        sch.append(f'    (uuid "{str(uuid.uuid4())}")')
        sch.append(f'    (property "Intersheetrefs" "{ref}" (at {pos_x-5} {pos_y+10} 0) (effects (font (size 1.27 1.27)) hide))')
        sch.append('  )')
        
        pos_x += 40
        if pos_x > 250:
            pos_x = 50
            pos_y += 40
        comp_id += 1
        
    sch.append(')')
    
    sch_text = "\n".join(sch)
    if output_file:
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(sch_text)
        print(f"Generated schematic: {output_file}")
    else:
        print(sch_text)
        
    return sch_text

def main():
    parser = argparse.ArgumentParser(description="KiCad AI Copilot - Schematic Generator")
    parser.add_argument("--input", required=True, help="Input design JSON file")
    parser.add_argument("--output", required=True, help="Output .kicad_sch file")
    args = parser.parse_args()
    
    if not os.path.exists(args.input):
        print(f"Error: Input file '{args.input}' not found.")
        return
        
    with open(args.input, "r", encoding="utf-8") as f:
        design = json.load(f)
        
    generate_schematic(design, args.output)

if __name__ == "__main__":
    main()
