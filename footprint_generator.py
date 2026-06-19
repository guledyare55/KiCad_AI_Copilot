#!/usr/bin/env python3
"""
KiCad AI Copilot — Footprint Synthesizer (Feature 3)
====================================================
Generates a valid .kicad_mod footprint file from a JSON spec.

Usage:
    python footprint_generator.py "SOIC-8" 1.27 0.6 1.5 5.4
"""

import sys
import uuid

def new_uuid():
    return str(uuid.uuid4())

def generate_footprint(name, pitch, pad_w, pad_h, row_spacing, pin_count):
    """
    Generates a basic dual-row SMD footprint (e.g. SOIC, TSSOP).
    """
    lines = []
    lines.append(f'(footprint "{name}" (version 20221018) (generator "kicad_ai_copilot")')
    lines.append('  (attr smd)')
    lines.append(f'  (fp_text reference "REF**" (at 0 -{(row_spacing/2)+2}) (layer "F.SilkS") (uuid "{new_uuid()}")')
    lines.append('    (effects (font (size 1 1) (thickness 0.15)))')
    lines.append('  )')
    lines.append(f'  (fp_text value "{name}" (at 0 {(row_spacing/2)+2}) (layer "F.Fab") (uuid "{new_uuid()}")')
    lines.append('    (effects (font (size 1 1) (thickness 0.15)))')
    lines.append('  )')

    # Basic silkscreen outline
    w = (pin_count/2 * pitch) + 1
    h = row_spacing - pad_h
    lines.append(f'  (fp_line (start {-w/2} {-h/2}) (end {w/2} {-h/2}) (layer "F.SilkS") (width 0.12) (uuid "{new_uuid()}"))')
    lines.append(f'  (fp_line (start {-w/2} {h/2}) (end {w/2} {h/2}) (layer "F.SilkS") (width 0.12) (uuid "{new_uuid()}"))')

    # Pads
    start_y = -row_spacing / 2
    start_x = -((pin_count/2 - 1) * pitch) / 2

    for i in range(int(pin_count / 2)):
        # Top row (pins 1 to N/2)
        px = start_x + (i * pitch)
        lines.append(f'  (pad "{i+1}" smd rect (at {px} {start_y}) (size {pad_w} {pad_h}) (layers "F.Cu" "F.Paste" "F.Mask"))')
        
        # Bottom row (pins N to N/2+1)
        pin_bottom = pin_count - i
        lines.append(f'  (pad "{pin_bottom}" smd rect (at {px} {-start_y}) (size {pad_w} {pad_h}) (layers "F.Cu" "F.Paste" "F.Mask"))')

    lines.append(')')
    return "\n".join(lines)

if __name__ == "__main__":
    if len(sys.argv) < 6:
        print("Usage: python footprint_generator.py <name> <pitch> <pad_w> <pad_h> <row_spacing> <pin_count>")
        print("Example: python footprint_generator.py SOIC-8 1.27 0.6 1.5 5.4 8")
        sys.exit(1)

    name = sys.argv[1]
    pitch = float(sys.argv[2])
    pad_w = float(sys.argv[3])
    pad_h = float(sys.argv[4])
    row_spacing = float(sys.argv[5])
    pin_count = int(sys.argv[6] if len(sys.argv) > 6 else 8)

    fp = generate_footprint(name, pitch, pad_w, pad_h, row_spacing, pin_count)
    filename = f"{name}.kicad_mod"
    
    with open(filename, "w") as f:
        f.write(fp)
        
    print(f"✅ Generated {filename}")
