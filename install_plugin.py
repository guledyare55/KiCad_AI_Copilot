#!/usr/bin/env python3
"""
KiCad AI Copilot — Install Script
==================================
Automatically installs the KiCad AI Copilot plugin into KiCad
by copying files to the correct KiCad scripting/plugins directory.

Supports: KiCad 7, 8, 9, 10+ (Windows, macOS, Linux)

Usage:
    python install_plugin.py
    python install_plugin.py --kicad-version 10
    python install_plugin.py --uninstall
"""

import os
import sys
import shutil
import platform
import argparse
import zipfile
from pathlib import Path


# ── Detect KiCad Plugin Directory ─────────────────────────
def find_kicad_plugin_dir(kicad_version=None) -> Path:
    """
    Find the KiCad scripting/plugins directory for the current OS.
    Returns the Path to install into.
    """
    system = platform.system()

    # Try common KiCad versions (newest first)
    versions_to_try = [kicad_version] if kicad_version else ["10", "9", "8", "7"]

    candidates = []

    if system == "Windows":
        appdata = Path(os.environ.get("APPDATA", "C:/Users/Default/AppData/Roaming"))
        for v in versions_to_try:
            candidates.extend([
                appdata / f"kicad" / f"{v}.0" / "scripting" / "plugins",
                appdata / f"kicad" / f"{v}" / "scripting" / "plugins",
                Path(f"C:/Program Files/KiCad/{v}.0/share/kicad/scripting/plugins"),
                Path(f"C:/Users/{os.environ.get('USERNAME','user')}/Documents/KiCad/{v}.0/scripting/plugins"),
            ])
        # Also try generic
        candidates.extend([
            appdata / "kicad" / "scripting" / "plugins",
            Path("C:/Program Files/KiCad/scripting/plugins"),
        ])

    elif system == "Darwin":  # macOS
        home = Path.home()
        for v in versions_to_try:
            candidates.extend([
                home / "Library" / "Preferences" / "kicad" / f"{v}.0" / "scripting" / "plugins",
                home / "Library" / "Application Support" / "kicad" / f"{v}.0" / "scripting" / "plugins",
                Path(f"/Applications/KiCad/KiCad.app/Contents/SharedSupport/scripting/plugins"),
            ])

    else:  # Linux
        home = Path.home()
        for v in versions_to_try:
            candidates.extend([
                home / ".local" / "share" / "kicad" / f"{v}.0" / "scripting" / "plugins",
                home / ".config" / "kicad" / f"{v}.0" / "scripting" / "plugins",
                Path(f"/usr/share/kicad/scripting/plugins"),
            ])

    # Return first directory that exists (or its parent)
    for candidate in candidates:
        if candidate.exists():
            return candidate
        # If parent exists, we can create it
        if candidate.parent.exists():
            return candidate

    # Fallback: return best guess
    if system == "Windows":
        appdata = Path(os.environ.get("APPDATA", ""))
        return appdata / "kicad" / "10.0" / "scripting" / "plugins"
    elif system == "Darwin":
        return Path.home() / "Library" / "Preferences" / "kicad" / "10.0" / "scripting" / "plugins"
    else:
        return Path.home() / ".local" / "share" / "kicad" / "10.0" / "scripting" / "plugins"


def install_plugin(kicad_dir: Path, script_dir: Path):
    """Copy plugin files to KiCad plugin directory."""
    plugin_dest = kicad_dir / "kicad_ai_copilot"

    print(f"\n📁 Installing to: {plugin_dest}")
    plugin_dest.mkdir(parents=True, exist_ok=True)

    # Files to copy from the kicad_plugin/ subfolder
    plugin_src = script_dir / "kicad_plugin"
    if not plugin_src.exists():
        print(f"  ⚠️  Plugin source folder not found: {plugin_src}")
        print(f"      Make sure you run this from the KiCad_AI_Copilot directory.")
        return False

    files_copied = 0
    for f in plugin_src.rglob("*"):
        if f.is_file():
            dest = plugin_dest / f.relative_to(plugin_src)
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(f, dest)
            print(f"  ✓ {f.name}")
            files_copied += 1

    # Also copy kicad_generator.py (the main generator)
    gen_src = script_dir / "kicad_generator.py"
    if gen_src.exists():
        shutil.copy2(gen_src, plugin_dest / "kicad_generator.py")
        print(f"  ✓ kicad_generator.py")
        files_copied += 1

    print(f"\n✅ Plugin installed: {files_copied} files copied")
    print(f"\n📋 Next steps in KiCad:")
    print(f"   1. Open KiCad")
    print(f"   2. Go to: Tools → Scripting Console → Restart Python Interpreter")
    print(f"   3. Or: close and reopen KiCad")
    print(f"   4. The plugin will appear in: Tools → External Plugins → KiCad AI Copilot")
    print(f"\n💡 For KiCad 10+ IPC API mode:")
    print(f"   Go to: Preferences → Plugins → Enable API Server")
    return True


def create_pcm_zip(script_dir: Path, output_dir: Path):
    """
    Create a PCM-compatible ZIP for manual installation via
    KiCad Plugin and Content Manager.
    """
    zip_path = output_dir / "kicad_ai_copilot_pcm.zip"
    output_dir.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        plugin_src = script_dir / "kicad_plugin"
        if plugin_src.exists():
            for f in plugin_src.rglob("*"):
                if f.is_file():
                    arcname = "plugins/kicad_ai_copilot/" + str(f.relative_to(plugin_src))
                    zf.write(f, arcname)

        # Generator
        gen = script_dir / "kicad_generator.py"
        if gen.exists():
            zf.write(gen, "plugins/kicad_ai_copilot/kicad_generator.py")

        # metadata.json (must be at the ROOT of the zip)
        meta_src = script_dir / "kicad_plugin" / "resources" / "metadata.json"
        if meta_src.exists():
            zf.write(meta_src, "metadata.json")
            # Keep a copy in resources/ just in case older KiCad versions expect it there
            zf.write(meta_src, "resources/metadata.json")

    print(f"\n✅ PCM ZIP created: {zip_path}")
    print(f"\n📋 Install via KiCad Plugin Manager:")
    print(f"   1. KiCad → Tools → Plugin and Content Manager")
    print(f"   2. Click 'Install from File...'")
    print(f"   3. Select: {zip_path}")
    return zip_path


def uninstall_plugin(kicad_dir: Path):
    """Remove the plugin from KiCad."""
    plugin_dest = kicad_dir / "kicad_ai_copilot"
    if plugin_dest.exists():
        shutil.rmtree(plugin_dest)
        print(f"✅ Plugin removed from: {plugin_dest}")
    else:
        print(f"Plugin not found at: {plugin_dest}")


def main():
    parser = argparse.ArgumentParser(
        description="Install KiCad AI Copilot plugin",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--kicad-version", default=None, help="KiCad version (e.g. 10)")
    parser.add_argument("--kicad-dir", default=None, help="Manual path to KiCad plugins directory")
    parser.add_argument("--uninstall", action="store_true", help="Uninstall the plugin")
    parser.add_argument("--create-pcm-zip", action="store_true", help="Create PCM ZIP package only")
    args = parser.parse_args()

    script_dir = Path(__file__).parent.resolve()

    if args.kicad_dir:
        kicad_dir = Path(args.kicad_dir)
    else:
        kicad_dir = find_kicad_plugin_dir(args.kicad_version)

    print(f"🔌 KiCad AI Copilot Installer")
    print(f"   OS: {platform.system()} {platform.release()}")
    print(f"   KiCad plugins dir: {kicad_dir}")

    if args.uninstall:
        uninstall_plugin(kicad_dir)
    elif args.create_pcm_zip:
        create_pcm_zip(script_dir, script_dir / "dist")
    else:
        ok = install_plugin(kicad_dir, script_dir)
        if ok:
            # Also offer to create PCM zip
            print(f"\n💡 To also create a PCM ZIP for sharing:")
            print(f"   python install_plugin.py --create-pcm-zip")


if __name__ == "__main__":
    main()
