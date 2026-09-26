#!/usr/bin/env node

/**
 * Chronicle Native Desktop Application Dev Server (Tauri)
 * 
 * Works cross-platform on Windows, macOS, and Linux.
 */

import { spawn } from 'child_process';
import { syncVersion } from './sync-version.js';
import { isWindows, isLinux, ensureCargoInPath, checkLinuxPrerequisites } from './build-tauri.js';

syncVersion();

console.log('\n========================================================');
console.log('   Chronicle • Starting Tauri Desktop Dev Server');
console.log('========================================================\n');

// Ensure Cargo / Rust is in PATH
ensureCargoInPath({ exitOnError: true });

// Check Linux system dependencies if on Linux
if (isLinux) {
  checkLinuxPrerequisites();
  if (!process.env.WEBKIT_DISABLE_DMABUF_RENDERER) {
    process.env.WEBKIT_DISABLE_DMABUF_RENDERER = '1';
  }
}

const npxCmd = isWindows ? 'npx.cmd' : 'npx';
const child = spawn(npxCmd, ['@tauri-apps/cli', 'dev'], {
  stdio: 'inherit',
  shell: isWindows,
  env: process.env,
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
