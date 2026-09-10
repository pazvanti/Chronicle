#!/usr/bin/env node

/**
 * Chronicle Native Desktop Application Builder (Tauri)
 * 
 * Capabilities:
 * 1. Detects host operating system (Windows or macOS).
 * 2. Verifies Cargo/Rust toolchain environment and configures PATH.
 * 3. Compiles the native desktop application and production bundles.
 * 4. Optionally copies generated distributables into docs/downloads/ when --copy-to-docs is specified.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const isDebug = process.argv.includes('--debug');
const shouldCopyToDocs = process.argv.includes('--copy-to-docs');
const targetMode = isDebug ? 'debug' : 'release';

// 1. Platform Detection
const platform = process.platform;
const isWindows = platform === 'win32';
const isMac = platform === 'darwin';

console.log('\n========================================================');
console.log('   Chronicle • Building Native Tauri Desktop App');
console.log('========================================================');
console.log(` Host Platform : ${isWindows ? 'Windows (win32)' : isMac ? 'macOS (darwin)' : platform}`);
console.log(` Target Mode   : ${targetMode}`);
console.log(` Copy to Docs  : ${shouldCopyToDocs ? 'Yes (docs/downloads/)' : 'No (src-tauri/target only)'}`);
console.log('========================================================\n');

if (!isWindows && !isMac) {
  console.warn(`⚠️ Warning: Chronicle desktop app is officially supported on Windows and macOS.`);
  console.warn(`Proceeding with build attempt for platform: ${platform}...\n`);
}

// 2. Ensure Cargo / Rust is in PATH
export function ensureCargoInPath() {
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
        console.log(`[Env] Added Cargo/Rust to PATH: ${candidate}`);
      }
    }
  }

  // Verify cargo is executable
  const check = spawnSync('cargo', ['--version'], {
    shell: true,
    encoding: 'utf8',
  });

  if (check.status !== 0) {
    console.error('\n❌ ERROR: Rust / Cargo was not found in PATH.');
    console.error('Please ensure Rust is installed:');
    if (isMac) {
      console.error('  macOS: Run "curl --proto \'=https\' --tlsv1.2 -sSf https://sh.rustup.rs | sh"');
    } else {
      console.error('  Windows: Download and run rustup-init from https://rustup.rs');
    }
    process.exit(1);
  }

  console.log(`[Toolchain] Found Rust: ${check.stdout.trim()}`);
}

ensureCargoInPath();

// 3. Build Tauri App
console.log('\n[1/2] Compiling Tauri Rust Standalone Executable...');
const tauriArgs = ['@tauri-apps/cli', 'build'];
if (isDebug) {
  tauriArgs.push('--debug');
}
if (isWindows) {
  // We only want the standalone executable, not the installer bundles
  tauriArgs.push('--no-bundle');
}

const npxCmd = isWindows ? 'npx.cmd' : 'npx';
const buildResult = spawnSync(npxCmd, tauriArgs, {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

if (buildResult.status !== 0) {
  console.error('\n❌ ERROR: Tauri desktop build failed.');
  process.exit(buildResult.status || 1);
}

const targetDir = path.resolve(projectRoot, 'src-tauri', 'target', targetMode);
const bundleDir = path.join(targetDir, 'bundle');

// 4. Locate and Copy Standalone Executables (ONLY if requested)
export function copyDistributablesToDocs() {
  console.log('\n[2/2] Gathering and Staging Standalone Executables to docs/downloads/ ...');
  const downloadsDir = path.resolve(projectRoot, 'docs', 'downloads');

  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
  }

  // Purge any legacy installer files from docs/downloads
  const legacyInstallers = [
    'Chronicle-Setup.exe',
    'Chronicle-Setup.msi',
    'Chronicle-Standalone.exe',
    'Chronicle_0.1.0_x64-setup.exe',
    'Chronicle_0.1.0_x64_en-US.msi'
  ];
  for (const file of legacyInstallers) {
    const legacyPath = path.join(downloadsDir, file);
    if (fs.existsSync(legacyPath)) {
      try {
        fs.unlinkSync(legacyPath);
        console.log(`  🗑️ Removed legacy installer: ${file}`);
      } catch {}
    }
  }

  const copiedDistributables = [];

  // 1. Windows: Direct Portable Executable Chronicle.exe (NO installer)
  if (isWindows) {
    const standaloneExe = path.join(targetDir, 'Chronicle.exe');
    if (fs.existsSync(standaloneExe)) {
      const destPath = path.join(downloadsDir, 'Chronicle.exe');
      fs.copyFileSync(standaloneExe, destPath);

      const stats = fs.statSync(destPath);
      copiedDistributables.push({
        name: 'Chronicle.exe',
        platform: 'windows',
        type: 'standalone-executable',
        destPath,
        sizeBytes: stats.size,
        sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
        description: 'Windows Standalone Executable (Direct Run, No Install)',
      });
    } else {
      console.warn(`⚠️ Standalone executable not found at: ${standaloneExe}`);
    }
  }

  // 2. macOS: Standalone disk image Chronicle.dmg
  if (isMac) {
    const dmgCandidates = [
      path.join(bundleDir, 'dmg', 'Chronicle.dmg'),
      path.join(bundleDir, 'dmg', 'Chronicle_0.1.0_x64.dmg'),
      path.join(bundleDir, 'Chronicle.dmg'),
      path.join(targetDir, 'Chronicle.dmg'),
    ];
    for (const candidate of dmgCandidates) {
      if (fs.existsSync(candidate)) {
        const destPath = path.join(downloadsDir, 'Chronicle.dmg');
        fs.copyFileSync(candidate, destPath);

        const stats = fs.statSync(destPath);
        copiedDistributables.push({
          name: 'Chronicle.dmg',
          platform: 'macos',
          type: 'standalone-image',
          destPath,
          sizeBytes: stats.size,
          sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
          description: 'macOS Standalone Disk Image (Intel & Apple Silicon)',
        });
        break;
      }
    }
  }

  // Preserve existing other-platform binaries in manifest if present on disk
  const manifestPath = path.join(downloadsDir, 'manifest.json');
  let existingItems = [];
  if (fs.existsSync(manifestPath)) {
    try {
      const oldManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (Array.isArray(oldManifest.distributables)) {
        existingItems = oldManifest.distributables.filter(item => {
          const isOverwritten = copiedDistributables.some(c => c.name === item.name);
          const exists = fs.existsSync(path.join(downloadsDir, item.name));
          return !isOverwritten && exists;
        });
      }
    } catch {}
  }

  const allItems = [...copiedDistributables, ...existingItems];

  // Write manifest.json
  const manifestData = {
    buildDate: new Date().toISOString(),
    platform: isWindows ? 'windows' : isMac ? 'macos' : platform,
    targetMode,
    distributables: allItems.map(d => ({
      name: d.name,
      platform: d.platform,
      sizeBytes: d.sizeBytes,
      sizeMB: Number(d.sizeMB),
      type: d.type || 'standalone-executable',
      description: d.description || 'Portable executable',
    })),
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2), 'utf8');

  console.log('\n========================================================');
  console.log('   Standalone Executables Staged to docs/downloads/ 🎉');
  console.log('========================================================');
  console.log(` Directory: ${downloadsDir}\n`);

  if (copiedDistributables.length === 0) {
    console.warn('⚠️ No executable binary files were found to copy.');
  } else {
    for (const item of copiedDistributables) {
      console.log(`  ✓ ${item.name} (${item.sizeMB} MB) [${item.description}]`);
    }
    console.log(`  ✓ manifest.json (Build metadata & direct binary catalog)`);
  }
}

if (shouldCopyToDocs) {
  copyDistributablesToDocs();
} else {
  console.log('\n========================================================');
  console.log('   Chronicle Desktop App Build Succeeded! 🎉');
  console.log('========================================================');
  console.log(` Target output directory: ${targetDir}`);
  console.log(' Note: Executable was NOT copied to docs/downloads/.');
  console.log(' (Run "npm run build:docs:all" to compile web app & stage standalone executables)');
}

console.log('\n========================================================\n');
