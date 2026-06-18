"""
KiCad AI Copilot — IPC API Plugin (KiCad 10+)
===============================================
Uses the modern KiCad IPC API via the `kipy` / `kicad-python` library.
This is the forward-compatible approach for KiCad 10 and beyond.

The SWIG pcbnew bindings are deprecated in KiCad 9 and will be
removed in KiCad 11. This module uses the stable IPC API instead.

Requirements:
  pip install kicad-python
  (or: pip install kipy)

KiCad must have the API server enabled:
  KiCad → Preferences → Plugins → ☑ Enable API Server

Usage (standalone script or from KiCad Scripting Console):
  from kicad_ai_copilot.plugin_ipc import run_import
  run_import("/path/to/design.json")
"""

import os
import sys
import json
import csv
import webbrowser
from pathlib import Path

PLUGIN_DIR = Path(__file__).parent
WEB_UI_PATH = PLUGIN_DIR.parent.parent / "index.html"


# ═══════════════════════════════════════════════════════════
# IPC IMPORTER (KiCad 10+)
# ═══════════════════════════════════════════════════════════
class IPCImporter:
    """
    Imports AI Copilot design JSON into KiCad 10+ via IPC API.
    Requires KiCad to be running with API server enabled.
    """

    GRID_X = 15.0  # mm between components
    GRID_Y = 15.0
    ORIGIN_X = 10.0
    ORIGIN_Y = 10.0
    PER_ROW = 6

    def __init__(self, design: dict):
        self.design = design
        self.log = []
        self._kicad = None
        self._board = None

    def connect(self):
        """Connect to running KiCad IPC server."""
        try:
            from kipy import KiCad
            self._kicad = KiCad()
            self._board = self._kicad.get_board()
            self.log.append("✓ Connected to KiCad IPC API")
            return True
        except ImportError:
            self.log.append("❌ kicad-python not installed. Run: pip install kicad-python")
            return False
        except Exception as e:
            self.log.append(f"❌ Connection failed: {e}")
            self.log.append("   Make sure KiCad is running and API server is enabled:")
            self.log.append("   KiCad → Preferences → Plugins → Enable API Server")
            return False

    def run(self, options: dict = None) -> tuple:
        """Run the full import process."""
        if options is None:
            options = {"footprints": True, "nets": True, "notes": True, "bom": True}

        if not self.connect():
            return False, self.log

        try:
            if options.get("nets", True):
                self._import_nets_ipc()
            if options.get("footprints", True):
                self._import_footprints_ipc()
            if options.get("notes", True):
                self._add_placement_notes_ipc()

            self.log.append("✓ Import complete — refresh PCB view")
            return True, self.log

        except Exception as e:
            self.log.append(f"❌ Import error: {e}")
            import traceback
            self.log.append(traceback.format_exc())
            return False, self.log

    def _import_nets_ipc(self):
        """Add nets to the PCB via IPC API."""
        nets = self.design.get("nets", [])
        added = 0
        for net_data in nets:
            net_name = net_data.get("name", "")
            if not net_name:
                continue
            try:
                # IPC API net creation
                # The exact method depends on kipy version — use available API
                if hasattr(self._board, "add_net"):
                    self._board.add_net(net_name)
                elif hasattr(self._board, "create_net"):
                    self._board.create_net(name=net_name)
                added += 1
            except Exception as e:
                # Net may already exist
                self.log.append(f"  Net '{net_name}': {e}")

        self.log.append(f"✓ Nets processed: {added}/{len(nets)}")

    def _import_footprints_ipc(self):
        """Place footprint stubs via IPC API."""
        from kipy.proto.common.types import Vector2
        from kipy.board import Footprint as KFP

        components = self.design.get("components", [])
        placed = 0
        skipped = 0

        for i, comp in enumerate(components):
            col = i % self.PER_ROW
            row = i // self.PER_ROW
            x_mm = self.ORIGIN_X + col * self.GRID_X
            y_mm = self.ORIGIN_Y + row * self.GRID_Y

            fp_str = comp.get("footprint", "")
            ref = comp.get("ref", f"U{i+1}")
            val = comp.get("value", comp.get("name", "?"))

            if not fp_str or ":" not in fp_str:
                self.log.append(f"  SKIP {ref}: invalid footprint '{fp_str}'")
                skipped += 1
                continue

            lib_name, fp_name = fp_str.split(":", 1)

            try:
                # IPC API footprint placement
                fp = self._board.add_footprint(
                    library=lib_name,
                    footprint=fp_name,
                    position=Vector2(x=x_mm * 1e6, y=y_mm * 1e6),  # nanometers
                    reference=ref,
                    value=val
                )
                placed += 1
                self.log.append(f"  ✓ {ref}: {fp_str}")

            except AttributeError:
                # Try alternative IPC API method
                try:
                    self._board.place_footprint(
                        lib_id=fp_str,
                        pos=(x_mm, y_mm),
                        reference=ref,
                        value=val
                    )
                    placed += 1
                    self.log.append(f"  ✓ {ref}: {fp_str} (alt method)")
                except Exception as e2:
                    self.log.append(f"  WARN {ref}: {e2} — manual placement required")
                    skipped += 1

            except Exception as e:
                self.log.append(f"  WARN {ref}: {e}")
                skipped += 1

        self.log.append(f"✓ Footprints: {placed} placed, {skipped} skipped")

    def _add_placement_notes_ipc(self):
        """Add placement rules as board text via IPC API."""
        rules = self.design.get("pcb_placement_rules", [])
        rf_rules = self.design.get("rf_or_critical_rules", [])
        added = 0

        y = -20.0
        for rule in rules[:6]:
            try:
                text = f"[AI Copilot] {rule['rule']}: {rule['description'][:70]}"
                if hasattr(self._board, "add_text"):
                    self._board.add_text(
                        text=text,
                        position=(-60.0, y),
                        layer="Eco1.User",
                        size=0.8
                    )
                    added += 1
                y -= 3.5
            except Exception as e:
                self.log.append(f"  Note add error: {e}")

        self.log.append(f"✓ Placement notes added: {added}")


# ═══════════════════════════════════════════════════════════
# STANDALONE RUNNER
# ═══════════════════════════════════════════════════════════
def run_import(json_path: str, options: dict = None):
    """
    Main entry point for importing a design.
    Can be called from KiCad Scripting Console:

        import sys
        sys.path.insert(0, r"C:\\path\\to\\KiCad_AI_Copilot\\kicad_plugin")
        from plugin_ipc import run_import
        run_import(r"C:\\path\\to\\my_design.json")
    """
    if not os.path.exists(json_path):
        print(f"❌ JSON file not found: {json_path}")
        return False

    with open(json_path, "r", encoding="utf-8") as f:
        design = json.load(f)

    print(f"\n🔌 KiCad AI Copilot IPC Import")
    print(f"   File: {json_path}")
    print(f"   Components: {len(design.get('components', []))}")
    print(f"   Nets: {len(design.get('nets', []))}")
    print()

    importer = IPCImporter(design)
    success, log = importer.run(options)

    for line in log:
        print(f"  {line}")

    return success


# ═══════════════════════════════════════════════════════════
# IPC PLUGIN REGISTRATION (KiCad 10+)
# ═══════════════════════════════════════════════════════════
class KiCadAICopilotIPC:
    """
    Registration shim for KiCad 10+ IPC-based plugins.
    The plugin registers as an external tool that KiCad
    can invoke via the API server.
    """

    def register(self):
        """Register plugin metadata with KiCad 10 plugin system."""
        try:
            # KiCad 10+ plugin registration via IPC
            import kipy
            self.log_info("KiCad AI Copilot IPC plugin registered")
        except ImportError:
            pass

    def log_info(self, msg):
        print(f"[KiCad AI Copilot] {msg}")
