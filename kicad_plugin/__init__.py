"""
KiCad AI Copilot Plugin — Package Init
Supports: KiCad 7/8/9 (pcbnew ActionPlugin) and KiCad 10+ (IPC API)
"""

# Detect KiCad version and load the right plugin class
import sys

def register():
    """Called by KiCad scripting engine to register the plugin."""
    try:
        # Try KiCad 7-9 (pcbnew SWIG-based ActionPlugin)
        import pcbnew
        version_str = getattr(pcbnew, "GetMajorMinorVersion", lambda: "9.0")()
        major = int(str(version_str).split(".")[0])

        if major >= 10:
            # KiCad 10+ — IPC API based
            from .plugin_ipc import KiCadAICopilotIPC
            plugin = KiCadAICopilotIPC()
            plugin.register()
        else:
            # KiCad 7–9 — Legacy ActionPlugin
            from .plugin_action import KiCadAICopilotAction
            plugin = KiCadAICopilotAction()
            plugin.register()

    except ImportError:
        # Standalone mode (not inside KiCad)
        print("[KiCad AI Copilot] Running in standalone mode (no KiCad detected)")
