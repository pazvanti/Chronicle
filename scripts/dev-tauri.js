#!/usr/bin/env node

/**
 * Chronicle Native Desktop Application Dev Server (Tauri)
 * 
 * Works cross-platform on Windows and macOS.
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const platform = process.platform;
const isWindows = platform === 'win32';

console.log('\n========================================================');
console.log('   Chronicle • Starting Tauri Desktop Dev Server');
console.log('========================================================\n');

// Ensure Cargo / Rust is in PATH
const homeDir = process.env.USERPROFILE || process.env.HOME || '';
const cargoBinCandidates = [
  path.join(homeDir, '.cargo', 'bin'),
  '/opt/homebrew/bin',
  '/usr/local/bin',
];

for (const candidate of cargoBinCandidates) {
  if (fs.existsSync(candidate)) {
    if (!process.env.PATH.includes(candidate)) {
      process.env.PATH = `${candidate}${path.delimiter}${process.env.PATH}`;
    }
  }
}

const npxCmd = isWindows ? 'npx.cmd' : 'npx';
const child = spawn(npxCmd, ['@tauri-apps/cli', 'dev'], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
