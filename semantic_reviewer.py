#!/usr/bin/env python3
"""
KiCad AI Copilot — Semantic Design Review Agent (Feature 1)
===========================================================
Reads a .kicad_pcb file and performs an electrical/semantic review
that standard DRC misses.

Usage:
    python semantic_reviewer.py my_board.kicad_pcb
"""

import sys
import os
import re
import math

def parse_kicad_pcb(filepath):
    """Extremely basic parser to extract component positions."""
    if not os.path.exists(filepath):
        print(f"Error: {filepath} not found.")
        sys.exit(1)

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    components = []
    # Match: (footprint "..." ... (at X Y) ... (property "Reference" "U1" ...))
    fp_pattern = re.compile(r'\(footprint\s+"[^"]*".*?\(at\s+([\d\.-]+)\s+([\d\.-]+).*?\(property\s+"Reference"\s+"([^"]+)"', re.DOTALL)
    
    for match in fp_pattern.finditer(content):
        x, y, ref = match.groups()
        components.append({
            'ref': ref,
            'x': float(x),
            'y': float(y)
        })
    return components

def distance(c1, c2):
    return math.sqrt((c1['x'] - c2['x'])**2 + (c1['y'] - c2['y'])**2)

def run_semantic_review(components):
    issues = []
    
    mcus = [c for c in components if c['ref'].startswith('U')]
    caps = [c for c in components if c['ref'].startswith('C')]
    inductors = [c for c in components if c['ref'].startswith('L')]
    
    # Check 1: Decoupling capacitors must be near ICs
    for c in caps:
        # If it's a small cap (assumed decoupling if named C...)
        nearest_mcu = None
        min_dist = float('inf')
        for mcu in mcus:
            d = distance(c, mcu)
            if d < min_dist:
                min_dist = d
                nearest_mcu = mcu
        
        if nearest_mcu and min_dist > 15.0: # 15mm is too far for decoupling
            issues.append(f"⚠️  WARNING: Capacitor {c['ref']} is {min_dist:.1f}mm away from nearest IC ({nearest_mcu['ref']}). Decoupling caps should be within 3-5mm!")

    # Check 2: Keep inductors away from sensitive analog/RF
    for l in inductors:
        for mcu in mcus:
            if distance(l, mcu) < 5.0:
                issues.append(f"⚠️  WARNING: Inductor {l['ref']} is very close ({distance(l, mcu):.1f}mm) to {mcu['ref']}. Ensure switching noise does not couple into sensitive pins.")

    return issues

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python semantic_reviewer.py <file.kicad_pcb>")
        sys.exit(1)
        
    pcb_file = sys.argv[1]
    print(f"🤖 KiCad AI Copilot - Semantic Design Review")
    print(f"Analyzing {pcb_file}...")
    
    comps = parse_kicad_pcb(pcb_file)
    print(f"Found {len(comps)} components.")
    
    issues = run_semantic_review(comps)
    
    if not issues:
        print("\n✅ All semantic checks passed! No critical layout issues detected.")
    else:
        print("\n❌ Semantic Issues Found:")
        for issue in issues:
            print(issue)
