#!/usr/bin/env bash
# Chronicle Universal Linux Builder (Ubuntu 22.04 LTS Container)
# Produces AppImages and packages targeting GLIBC 2.35 for maximum Linux distribution compatibility.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
IMAGE_NAME="chronicle-builder:ubuntu22"

echo "=========================================================="
echo " Chronicle • Universal Linux Container Build (Ubuntu 22.04)"
echo " Target glibc: 2.35 (Runs on Ubuntu 22.04+, Debian 12+, Fedora, Mint)"
echo "=========================================================="

# 1. Detect Container Engine (podman or docker)
CONTAINER_CLI=""
if command -v podman &>/dev/null; then
  CONTAINER_CLI="podman"
elif command -v docker &>/dev/null; then
  CONTAINER_CLI="docker"
else
  echo "❌ Error: Neither 'podman' nor 'docker' was found on your system."
  echo "Please install Podman or Docker to build universal Linux packages."
  exit 1
fi

echo "[Engine] Using container runtime: $CONTAINER_CLI"

# 2. Build or verify the builder image
if ! "$CONTAINER_CLI" image exists "$IMAGE_NAME" 2>/dev/null && ! "$CONTAINER_CLI" inspect "$IMAGE_NAME" &>/dev/null; then
  echo "[Image] Builder image '$IMAGE_NAME' not found. Building now from scripts/Dockerfile.ubuntu22..."
  "$CONTAINER_CLI" build -t "$IMAGE_NAME" -f "$SCRIPT_DIR/Dockerfile.ubuntu22" "$SCRIPT_DIR"
  echo "✓ Builder image '$IMAGE_NAME' created successfully."
else
  echo "[Image] Using existing image: $IMAGE_NAME"
fi

# 3. Prepare Volume Mounts & Cache
# Use persistent container volumes for cargo cache to speed up subsequent builds
CARGO_REGISTRY_VOL="chronicle-cargo-registry"
CARGO_GIT_VOL="chronicle-cargo-git"

EXTRA_FLAGS=()
if [ "$CONTAINER_CLI" = "podman" ]; then
  # On Fedora/RHEL/SELinux, disable container label isolation on the mounted workspace
  EXTRA_FLAGS+=("--security-opt" "label=disable")
  EXTRA_FLAGS+=("--userns=keep-id")
fi

# Allocate TTY if running in an interactive terminal
if [ -t 0 ] && [ -t 1 ]; then
  EXTRA_FLAGS+=("-t")
fi

echo "[Build] Starting Tauri build inside Ubuntu 22.04 container..."
echo "=========================================================="

"$CONTAINER_CLI" run --rm -i \
  "${EXTRA_FLAGS[@]}" \
  -v "$PROJECT_ROOT":/app \
  -v "$CARGO_REGISTRY_VOL":/usr/local/cargo/registry \
  -v "$CARGO_GIT_VOL":/usr/local/cargo/git \
  -w /app \
  -e APPIMAGE_EXTRACT_AND_RUN=1 \
  -e NO_STRIP=true \
  "$IMAGE_NAME" \
  node scripts/build-tauri.js "$@"

echo "=========================================================="
echo " Universal Linux build completed successfully! 🎉"
echo "=========================================================="
