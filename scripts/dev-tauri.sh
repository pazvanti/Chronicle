#!/usr/bin/env bash
# Chronicle Tauri Desktop Application Dev Server (Linux & macOS)

set -e

# Disable WebKitGTK DMA-BUF renderer on modern Linux (Fedora, Wayland, NVIDIA) to prevent gray screen
export WEBKIT_DISABLE_DMABUF_RENDERER="${WEBKIT_DISABLE_DMABUF_RENDERER:-1}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$SCRIPT_DIR/dev-tauri.js" "$@"
