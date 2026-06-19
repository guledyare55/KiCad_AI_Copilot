#!/usr/bin/env python3
"""
KiCad AI Copilot - 3D Enclosure Generator
Generates an OpenSCAD (.scad) parametric enclosure for a PCB design.
"""

import os
import json
import argparse

def generate_scad(design, output_file):
    width = 40
    length = 60
    
    constraints = design.get("constraints", {})
    size = constraints.get("size", "medium")
    
    if size == "smallest":
        width, length = 25, 35
    elif size == "small":
        width, length = 35, 50
    elif size == "medium":
        width, length = 50, 80
        
    height = 15
    wall = 2
    
    # Determine connectors for cutouts
    cutouts = []
    for comp in design.get("components", []):
        if "USB" in comp.get("name", ""):
            # Assume USB is at the top edge center
            cutouts.append("translate([0, length/2, 0]) cube([12, 10, 8], center=true);")

    cutout_str = "\n  ".join(cutouts)

    scad = f"""// Auto-generated 3D Enclosure for KiCad AI Copilot
// Use OpenSCAD (openscad.org) to render this to an STL file.

width = {width};
length = {length};
height = {height};
wall = {wall};

difference() {{
  // Main body
  cube([width + wall*2, length + wall*2, height], center=true);
  
  // Hollow interior
  translate([0, 0, wall])
    cube([width, length, height], center=true);
    
  // Cutouts
  {cutout_str}
}}
"""

    if output_file:
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(scad)
        print(f"Generated enclosure script at: {output_file}")
    else:
        print(scad)

    return scad

def main():
    parser = argparse.ArgumentParser(description="KiCad AI Copilot - Enclosure Generator")
    parser.add_argument("--input", required=True, help="Input design JSON file")
    parser.add_argument("--output", required=True, help="Output .scad file")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.input):
        print(f"Error: Input file '{args.input}' not found.")
        return
        
    with open(args.input, "r", encoding="utf-8") as f:
        design = json.load(f)
        
    generate_scad(design, args.output)

if __name__ == "__main__":
    main()
