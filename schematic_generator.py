#!/usr/bin/env python3
"""
KiCad AI Copilot - Auto Schematic Generator
Converts a KiCad AI Copilot JSON design file into a valid KiCad 7/8
schematic file (.kicad_sch) using Global Labels for net connections.

Usage:
  python schematic_generator.py --input design.json --output my_design.kicad_sch

How it works:
  1. Reads the AI-generated JSON (from the Web App "Export JSON" button).
  2. Places all components in a neat grid layout.
  3. Connects them using "Global Labels" instead of literal wires.
     (e.g. both the MCU pin and sensor pin get labelled "I2C_SDA")
  4. Saves a valid .kicad_sch file you can open directly in KiCad.
"""

import os
import json
import uuid
import argparse
import math

# ─── Symbol Library Mapping ──────────────────────────────────
# Maps our engine component names to KiCad standard symbol lib refs.
# Format: "component_name_keyword": "LibName:SymbolName"
SYMBOL_MAP = {
    "nRF52810":      "RF_Bluetooth:nRF52810-QCAA",
    "nRF52833":      "RF_Bluetooth:nRF52833-QIAA",
    "nRF52840":      "RF_Bluetooth:nRF52840-QIAA",
    "STM32G031":     "MCU_ST_STM32G0:STM32G031K8Tx",
    "STM32F103":     "MCU_ST_STM32F1:STM32F103C8Tx",
    "ATMEGA328P":    "MCU_Microchip_ATmega:ATmega328P-AU",
    "ESP32-S3":      "RF_Module:ESP32-S3-WROOM-1",
    "ESP32":         "RF_Module:ESP32-WROOM-32D",
    "SX1262":        "RF_Module:SX1262",
    "BME280":        "Sensor_Pressure:BME280",
    "SHTC3":         "Sensor_Humidity:SHTC3",
    "ICM-42688":     "Sensor_Motion:ICM-42688-P",
    "CH340C":        "Interface_USB:CH340C",
    "MCP73831":      "Battery_Management:MCP73831",
    "USB-C":         "Connector:USB_C_Receptacle_USB2.0",
    "CR2032":        "Device:Battery_Cell",
    "LDO":           "Device:Regulator_Linear",
    "AMS1117":       "Regulator_Linear:AMS1117-3.3",
    "LED":           "Device:LED",
    "BUTTON":        "Device:SW_Push",
    # Passives — always use Device lib
    "Cap":           "Device:C",
    "Res":           "Device:R",
    "Pull-up":       "Device:R",
    "Inductor":      "Device:L",
}

# ─── Net label templates by component type ───────────────────
NET_LABELS = {
    "MCU":       ["3V3", "GND", "I2C_SDA", "I2C_SCL", "SPI_MOSI", "SPI_MISO", "SPI_CLK"],
    "sensor":    ["3V3", "GND", "I2C_SDA", "I2C_SCL"],
    "passive":   ["GND", "3V3"],
    "power":     ["VBAT", "GND", "3V3"],
    "connector": ["VBUS", "GND", "USB_DP", "USB_DM"],
    "radio":     ["3V3", "GND", "SPI_MOSI", "SPI_MISO", "SPI_CLK", "ANT"],
    "default":   ["3V3", "GND"],
}

def make_uuid():
    return str(uuid.uuid4())

def resolve_lib_id(comp):
    """Return the best matching KiCad symbol lib_id for this component."""
    name = comp.get("name", "")
    for key, lib_id in SYMBOL_MAP.items():
        if key.lower() in name.lower():
            return lib_id
    # Fallback: generic box IC using Device:R as a placeholder for unknown parts
    return "Device:R"

def mm_to_mil(mm):
    """KiCad schematics use mm natively in v7+."""
    return mm

def build_lib_symbols_header():
    """
    Embed definitions for Device:R, Device:C, Device:L and Device:LED
    so the schematic parses correctly even without external libraries.
    """
    return """  (lib_symbols
    (symbol "Device:R" (pin_names (offset 0)) (in_bom yes) (on_board yes)
      (property "Reference" "R" (at 2.032 0 90) (effects (font (size 1.27 1.27))))
      (property "Value" "R" (at 0 0 90) (effects (font (size 1.27 1.27))))
      (symbol "R_0_1"
        (rectangle (start -1.016 -2.54) (end 1.016 2.54) (stroke (width 0.254) (type default)) (fill (type none)))
      )
      (symbol "R_1_1"
        (pin passive line (at 0 5.08 270) (length 2.54) (name "~" (effects (font (size 1.27 1.27)))) (number "1"))
        (pin passive line (at 0 -5.08 90) (length 2.54) (name "~" (effects (font (size 1.27 1.27)))) (number "2"))
      )
    )
    (symbol "Device:C" (pin_names (offset 0)) (in_bom yes) (on_board yes)
      (property "Reference" "C" (at 2.032 0 90) (effects (font (size 1.27 1.27))))
      (property "Value" "C" (at 0 0 90) (effects (font (size 1.27 1.27))))
      (symbol "C_0_1"
        (polyline (pts (xy -2.032 -0.762) (xy 2.032 -0.762)) (stroke (width 0.508) (type default)) (fill (type none)))
        (polyline (pts (xy -2.032 0.762) (xy 2.032 0.762)) (stroke (width 0.508) (type default)) (fill (type none)))
      )
      (symbol "C_1_1"
        (pin passive line (at 0 3.81 270) (length 3.048) (name "~" (effects (font (size 1.27 1.27)))) (number "1"))
        (pin passive line (at 0 -3.81 90) (length 3.048) (name "~" (effects (font (size 1.27 1.27)))) (number "2"))
      )
    )
    (symbol "Device:LED" (pin_names (offset 1.016)) (in_bom yes) (on_board yes)
      (property "Reference" "D" (at 0 2.54 0) (effects (font (size 1.27 1.27))))
      (property "Value" "LED" (at 0 -2.54 0) (effects (font (size 1.27 1.27))))
      (symbol "LED_0_1"
        (polyline (pts (xy -1.27 -1.27) (xy -1.27 1.27)) (stroke (width 0.254) (type default)) (fill (type none)))
        (polyline (pts (xy -1.27 0) (xy 1.27 0)) (stroke (width 0.254) (type default)) (fill (type none)))
        (polyline (pts (xy 1.27 -1.27) (xy -1.27 0) (xy 1.27 1.27) (xy 1.27 -1.27)) (stroke (width 0.254) (type default)) (fill (type none)))
      )
      (symbol "LED_1_1"
        (pin passive line (at -3.81 0 0) (length 2.54) (name "K" (effects (font (size 1.27 1.27)))) (number "1"))
        (pin passive line (at 3.81 0 180) (length 2.54) (name "A" (effects (font (size 1.27 1.27)))) (number "2"))
      )
    )
  )
"""

def build_power_symbol(net_name, x, y):
    """Create a power flag or GND/VCC symbol at given position."""
    uid = make_uuid()
    if net_name == "GND":
        return f"""  (symbol (lib_id "power:GND") (at {x:.2f} {y:.2f} 0) (unit 1)
    (in_bom yes) (on_board yes) (dnp no)
    (uuid "{uid}")
    (property "Reference" "#PWR" (at {x:.2f} {y+2:.2f} 0) (effects (font (size 1.27 1.27)) hide))
    (property "Value" "GND" (at {x:.2f} {y-2:.2f} 0) (effects (font (size 1.27 1.27))))
    (pin "1" (uuid "{make_uuid()}"))
  )
"""
    else:
        return f"""  (symbol (lib_id "power:{net_name}") (at {x:.2f} {y:.2f} 0) (unit 1)
    (in_bom yes) (on_board yes) (dnp no)
    (uuid "{uid}")
    (property "Reference" "#PWR" (at {x:.2f} {y+2:.2f} 0) (effects (font (size 1.27 1.27)) hide))
    (property "Value" "{net_name}" (at {x:.2f} {y-2:.2f} 0) (effects (font (size 1.27 1.27))))
    (pin "1" (uuid "{make_uuid()}"))
  )
"""

def build_global_label(net_name, x, y, angle=0):
    """Create a global label at position (x, y)."""
    uid = make_uuid()
    return f"""  (global_label "{net_name}" (shape input) (at {x:.2f} {y:.2f} {angle})
    (effects (font (size 1.27 1.27)))
    (uuid "{uid}")
    (property "Intersheetrefs" "" (at {x:.2f} {y:.2f} 0) (effects (font (size 1.27 1.27)) hide))
  )
"""

def build_component_symbol(comp, ref, x, y):
    """Build the S-expression for a single component placed at (x, y)."""
    lib_id = resolve_lib_id(comp)
    uid = make_uuid()
    value = comp.get("value", comp.get("name", "?"))
    footprint = comp.get("footprint", "")

    return f"""  (symbol (lib_id "{lib_id}") (at {x:.2f} {y:.2f} 0) (unit 1)
    (in_bom yes) (on_board yes) (dnp no)
    (uuid "{uid}")
    (property "Reference" "{ref}" (at {x:.2f} {y-4:.2f} 0) (effects (font (size 1.27 1.27))))
    (property "Value" "{value}" (at {x:.2f} {y+4:.2f} 0) (effects (font (size 1.27 1.27))))
    (property "Footprint" "{footprint}" (at {x:.2f} {y+6:.2f} 0) (effects (font (size 1.27 1.27)) hide))
    (property "Datasheet" "" (at {x:.2f} {y:.2f} 0) (effects (font (size 1.27 1.27)) hide))
  )
"""

def get_net_labels_for_comp(comp):
    """Return a list of net labels appropriate for this component type."""
    ctype = comp.get("type", "default")
    name = comp.get("name", "")
    
    if "MCU" in ctype or any(k in name for k in ["nRF52", "STM32", "ATMEGA", "ESP32"]):
        return NET_LABELS["MCU"]
    elif "sensor" in ctype or any(k in name for k in ["BME280", "SHTC3", "ICM"]):
        return NET_LABELS["sensor"]
    elif "passive" in ctype:
        return NET_LABELS["passive"]
    elif "power" in ctype or any(k in name for k in ["CR2032", "LiPo", "Battery"]):
        return NET_LABELS["power"]
    elif "connector" in ctype or "USB" in name:
        return NET_LABELS["connector"]
    elif any(k in name for k in ["SX1262", "LoRa", "BLE"]):
        return NET_LABELS["radio"]
    return NET_LABELS["default"]

def generate_schematic(design, project_name="AI_Design"):
    """
    Main generator function. Returns the full .kicad_sch file content as a string.
    """
    sch = f"""(kicad_sch (version 20230121) (generator kicad_ai_copilot)
  (uuid "{make_uuid()}")
  (paper "A4")
  (title_block
    (title "{project_name} — Auto-Generated by KiCad AI Copilot")
    (comment 1 "Generated automatically — open in KiCad and run Update PCB to place components")
  )
"""

    sch += build_lib_symbols_header()

    # ── Grid Layout ─────────────────────────────────────────
    # Row 1 (y=30): Power components (LDO, Battery, charger)
    # Row 2 (y=80): Main MCU / Brain
    # Row 3 (y=130): Sensors / Radios
    # Row 4 (y=180): Connectors / IO
    # Row 5 (y=230): Passives (decoupling, pull-ups)

    ROW_Y = {
        "power":     30,
        "MCU":       80,
        "sensor":    130,
        "connector": 180,
        "passive":   230,
    }
    col_x = {k: 30 for k in ROW_Y}  # starting X for each row

    all_comps = list(design.get("components", [])) + list(design.get("auto_added_components", []))

    ref_counters = {}

    for comp in all_comps:
        ctype = comp.get("type", "passive")
        name = comp.get("name", "")

        # Determine row
        if any(k in name for k in ["nRF52", "STM32", "ATMEGA", "ESP32"]) or ctype == "MCU":
            row = "MCU"
        elif ctype == "sensor" or any(k in name for k in ["BME280", "SHTC3", "ICM"]):
            row = "sensor"
        elif ctype in ("power",) or any(k in name for k in ["CR2032", "LiPo", "Battery", "LDO", "AMS1117", "MCP73831"]):
            row = "power"
        elif ctype == "connector" or "USB" in name:
            row = "connector"
        else:
            row = "passive"

        x = col_x[row]
        y = ROW_Y[row]

        # Build ref designator
        prefix = comp.get("ref_prefix", "U")
        ref_counters.setdefault(prefix, 0)
        ref_counters[prefix] += 1
        ref = f"{prefix}{ref_counters[prefix]}"

        # Emit the symbol
        sch += build_component_symbol(comp, ref, x, y)

        # Emit global labels for each net
        net_labels = get_net_labels_for_comp(comp)
        label_y = y + 10
        for i, net in enumerate(net_labels):
            lx = x + (i * 15) - (len(net_labels) * 7.5)
            sch += build_global_label(net, lx, label_y, angle=270)

        col_x[row] += 35

    # Close schematic
    sch += ")\n"
    return sch


def main():
    parser = argparse.ArgumentParser(
        description="KiCad AI Copilot — Auto Schematic Generator",
        epilog="Example: python schematic_generator.py --input design.json --output my_board.kicad_sch"
    )
    parser.add_argument("--input",  required=True, help="Input JSON file (exported from Web App)")
    parser.add_argument("--output", required=True, help="Output .kicad_sch file path")
    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(f"❌ Error: '{args.input}' not found.")
        return

    with open(args.input, "r", encoding="utf-8") as f:
        design = json.load(f)

    project_name = design.get("project_name", os.path.splitext(os.path.basename(args.input))[0])
    print(f"📐 KiCad AI Copilot — Schematic Generator")
    print(f"   Project: {project_name}")
    print(f"   Components: {len(design.get('components', []))} + {len(design.get('auto_added_components', []))} auto-added")

    schem = generate_schematic(design, project_name)

    with open(args.output, "w", encoding="utf-8") as f:
        f.write(schem)

    print(f"✅ Schematic written to: {args.output}")
    print(f"   → Open this file in KiCad Schematic Editor")
    print(f"   → Then run: Tools → Update PCB from Schematic")


if __name__ == "__main__":
    main()
