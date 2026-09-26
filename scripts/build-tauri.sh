#!/usr/bin/env bash
# Chronicle Tauri Desktop Application Build Script (Linux & macOS)

set -e

# Disable linuxdeploy strip on modern Linux distros (Fedora, Arch, Ubuntu) with .relr.dyn relocations
export NO_STRIP="${NO_STRIP:-true}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$SCRIPT_DIR/build-tauri.js" "$@"
