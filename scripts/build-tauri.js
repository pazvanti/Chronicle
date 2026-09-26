#!/usr/bin/env node

/**
 * Chronicle Native Desktop Application Builder (Tauri)
 * 
 * Capabilities:
 * 1. Detects host operating system (Windows, macOS, or Linux).
 * 2. Verifies Cargo/Rust toolchain environment and configures PATH.
 * 3. Inspects and reports required system development dependencies on Linux.
 * 4. Compiles the native desktop application and production bundles (AppImage, DEB, RPM, or standalone binary).
 * 5. Optionally copies generated distributables into docs/downloads/ when --copy-to-docs is specified.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { syncVersion } from './sync-version.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 1. Platform Detection
export const platform = process.platform;
export const isWindows = platform === 'win32';
export const isMac = platform === 'darwin';
export const isLinux = platform === 'linux';

export function getLinuxDistro() {
  try {
    if (fs.existsSync('/etc/os-release')) {
      const content = fs.readFileSync('/etc/os-release', 'utf8');
      const idMatch = content.match(/^ID=(.*)$/m);
      const nameMatch = content.match(/^PRETTY_NAME=(.*)$/m);
      return {
        id: idMatch ? idMatch[1].replace(/["']/g, '').trim().toLowerCase() : '',
        name: nameMatch ? nameMatch[1].replace(/["']/g, '').trim() : 'Linux',
      };
    }
  } catch {}
  return { id: '', name: 'Linux' };
}

// 2. Ensure Cargo / Rust is in PATH
export function ensureCargoInPath({ exitOnError = true } = {}) {
  const homeDir = process.env.USERPROFILE || process.env.HOME || '';
  const cargoBinCandidates = [
    path.join(homeDir, '.cargo', 'bin'),
    path.join(homeDir, '.local', 'bin'),
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/usr/bin',
    '/snap/bin',
    '/var/lib/flatpak/exports/bin',
  ];

  for (const candidate of cargoBinCandidates) {
    if (fs.existsSync(candidate)) {
      if (!process.env.PATH.includes(candidate)) {
        process.env.PATH = `${candidate}${path.delimiter}${process.env.PATH}`;
        console.log(`[Env] Added toolchain path to PATH: ${candidate}`);
      }
    }
  }

  // Verify cargo is executable
  const check = spawnSync('cargo', ['--version'], {
    shell: isWindows,
    encoding: 'utf8',
  });

  if (check.status !== 0) {
    console.error('\n❌ Toolchain: Rust / Cargo was not found in PATH.');
    console.error('Please ensure Rust is installed:');
    if (isMac) {
      console.error('  macOS: Run "curl --proto \'=https\' --tlsv1.2 -sSf https://sh.rustup.rs | sh"');
    } else if (isLinux) {
      console.error('  Linux: Run "curl --proto \'=https\' --tlsv1.2 -sSf https://sh.rustup.rs | sh"');
      console.error('  Or install via your package manager:');
      console.error('    Fedora / RHEL  : sudo dnf install rust cargo');
      console.error('    Debian / Ubuntu: sudo apt update && sudo apt install rustc cargo');
      console.error('    Arch Linux     : sudo pacman -S rust');
      console.error('    openSUSE       : sudo zypper install rust cargo');
    } else {
      console.error('  Windows: Download and run rustup-init from https://rustup.rs');
    }
    if (exitOnError) {
      process.exit(1);
    }
    return false;
  }

  console.log(`[Toolchain] Found Rust: ${check.stdout.trim()}`);
  return true;
}

// 3. Linux Prerequisites & System Library Inspection
export function checkLinuxPrerequisites() {
  if (!isLinux) return true;

  const distro = getLinuxDistro();
  console.log(`[Linux Env] Detected distribution: ${distro.name}`);

  const hasPkgConfig = spawnSync('which', ['pkg-config'], { shell: isWindows }).status === 0;
  if (!hasPkgConfig) {
    console.warn('\n⚠️ Warning: "pkg-config" was not found in PATH.');
    console.warn('  pkg-config is required by Tauri and native Rust crates to link GTK3 and WebKit2GTK.\n');
    return false;
  }

  const missing = [];
  const checkLib = (pkgName) => {
    const res = spawnSync('pkg-config', ['--exists', pkgName], { shell: false });
    return res.status === 0;
  };

  const hasWebKit = checkLib('webkit2gtk-4.1') || checkLib('webkit2gtk-4.0');
  if (!hasWebKit) missing.push('webkit2gtk-4.1');

  const hasRsvg = checkLib('librsvg-2.0');
  if (!hasRsvg) missing.push('librsvg-2.0');

  const hasAppIndicator = checkLib('ayatana-appindicator3-0.1') || checkLib('appindicator3-0.1');
  if (!hasAppIndicator) missing.push('libayatana-appindicator3 / libappindicator3');

  const hasSsl = checkLib('openssl');
  if (!hasSsl) missing.push('openssl');

  if (missing.length > 0) {
    console.warn(`\n⚠️ [Prerequisites] Missing Linux system development libraries: ${missing.join(', ')}`);
    console.warn('To install the required dependencies:');

    if (distro.id.includes('fedora') || distro.id.includes('rhel') || distro.id.includes('centos')) {
      console.warn('  Run (Fedora / RHEL):');
      console.warn('    sudo dnf install webkit2gtk4.1-devel openssl-devel libappindicator-gtk3-devel librsvg2-devel\n');
    } else if (distro.id.includes('ubuntu') || distro.id.includes('debian') || distro.id.includes('pop') || distro.id.includes('mint')) {
      console.warn('  Run (Debian / Ubuntu):');
      console.warn('    sudo apt update && sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev libayatana-appindicator3-dev librsvg2-dev\n');
    } else if (distro.id.includes('arch') || distro.id.includes('manjaro')) {
      console.warn('  Run (Arch Linux):');
      console.warn('    sudo pacman -Syu --needed webkit2gtk-4.1 base-devel openssl libappindicator-gtk3 librsvg\n');
    } else if (distro.id.includes('suse')) {
      console.warn('  Run (openSUSE):');
      console.warn('    sudo zypper install webkit2gtk3-devel openssl-devel libappindicator3-devel librsvg-devel\n');
    } else {
      console.warn('  Fedora / RHEL  : sudo dnf install webkit2gtk4.1-devel openssl-devel libappindicator-gtk3-devel librsvg2-devel');
      console.warn('  Debian / Ubuntu : sudo apt update && sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev libayatana-appindicator3-dev librsvg2-dev');
      console.warn('  Arch Linux     : sudo pacman -Syu --needed webkit2gtk-4.1 base-devel openssl libappindicator-gtk3 librsvg\n');
    }
    return false;
  } else {
    console.log('[Linux Env] System libraries (WebKit2GTK, OpenSSL, RSVG, AppIndicator) verified ✓');
    return true;
  }
}

// 4. Locate and Copy Standalone Executables & Packages
export function copyDistributablesToDocs({ targetDir, bundleDir, targetMode }) {
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
    let dmgFound = null;
    const dmgDir = path.join(bundleDir, 'dmg');
    if (fs.existsSync(dmgDir)) {
      const files = fs.readdirSync(dmgDir);
      const matched = files.find(f => f.endsWith('.dmg'));
      if (matched) {
        dmgFound = path.join(dmgDir, matched);
      }
    }

    if (!dmgFound) {
      const dmgCandidates = [
        path.join(bundleDir, 'dmg', 'Chronicle.dmg'),
        path.join(bundleDir, 'Chronicle.dmg'),
        path.join(targetDir, 'Chronicle.dmg'),
      ];
      for (const candidate of dmgCandidates) {
        if (fs.existsSync(candidate)) {
          dmgFound = candidate;
          break;
        }
      }
    }

    if (dmgFound) {
      const destPath = path.join(downloadsDir, 'Chronicle.dmg');
      fs.copyFileSync(dmgFound, destPath);

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
    } else {
      console.warn(`⚠️ No DMG file found in ${dmgDir} or bundle directory.`);
    }
  }

  // 3. Linux: Standalone AppImage, Executable Binary, DEB, RPM
  if (isLinux) {
    // 3a. Portable AppImage (Universal Direct Run, No Setup)
    let appImageFound = null;
    const appImageDir = path.join(bundleDir, 'appimage');
    if (fs.existsSync(appImageDir)) {
      const files = fs.readdirSync(appImageDir);
      const matched = files.find(f => f.endsWith('.AppImage'));
      if (matched) {
        appImageFound = path.join(appImageDir, matched);
      }
    }

    if (!appImageFound && fs.existsSync(targetDir)) {
      const files = fs.readdirSync(targetDir);
      const matched = files.find(f => f.endsWith('.AppImage'));
      if (matched) {
        appImageFound = path.join(targetDir, matched);
      }
    }

    if (appImageFound) {
      const destPath = path.join(downloadsDir, 'Chronicle.AppImage');
      fs.copyFileSync(appImageFound, destPath);
      try { fs.chmodSync(destPath, 0o755); } catch {}

      const stats = fs.statSync(destPath);
      copiedDistributables.push({
        name: 'Chronicle.AppImage',
        platform: 'linux',
        type: 'standalone-appimage',
        destPath,
        sizeBytes: stats.size,
        sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
        description: 'Linux Standalone AppImage (Direct Run, Universal)',
      });
    }

    // 3b. Standalone Binary Executable (Chronicle)
    const standaloneBinary = path.join(targetDir, 'Chronicle');
    if (fs.existsSync(standaloneBinary) && fs.statSync(standaloneBinary).isFile()) {
      const destPath = path.join(downloadsDir, 'Chronicle-linux-x64');
      fs.copyFileSync(standaloneBinary, destPath);
      try { fs.chmodSync(destPath, 0o755); } catch {}

      const stats = fs.statSync(destPath);
      copiedDistributables.push({
        name: 'Chronicle-linux-x64',
        platform: 'linux',
        type: 'standalone-executable',
        destPath,
        sizeBytes: stats.size,
        sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
        description: 'Linux Standalone Executable (Direct Run Binary)',
      });
    }

    // 3c. Debian Package (.deb)
    const debDir = path.join(bundleDir, 'deb');
    if (fs.existsSync(debDir)) {
      const debFiles = fs.readdirSync(debDir).filter(f => f.endsWith('.deb'));
      for (const debFile of debFiles) {
        const srcDeb = path.join(debDir, debFile);
        const destDeb = path.join(downloadsDir, debFile);
        fs.copyFileSync(srcDeb, destDeb);

        const stats = fs.statSync(destDeb);
        copiedDistributables.push({
          name: debFile,
          platform: 'linux',
          type: 'debian-package',
          destPath: destDeb,
          sizeBytes: stats.size,
          sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
          description: 'Debian / Ubuntu Package (.deb)',
        });
      }
    }

    // 3d. RPM Package (.rpm)
    const rpmDir = path.join(bundleDir, 'rpm');
    if (fs.existsSync(rpmDir)) {
      const rpmFiles = fs.readdirSync(rpmDir).filter(f => f.endsWith('.rpm'));
      for (const rpmFile of rpmFiles) {
        const srcRpm = path.join(rpmDir, rpmFile);
        const destRpm = path.join(downloadsDir, rpmFile);
        fs.copyFileSync(srcRpm, destRpm);

        const stats = fs.statSync(destRpm);
        copiedDistributables.push({
          name: rpmFile,
          platform: 'linux',
          type: 'rpm-package',
          destPath: destRpm,
          sizeBytes: stats.size,
          sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
          description: 'Fedora / RHEL / openSUSE RPM Package (.rpm)',
        });
      }
    }

    if (!appImageFound && !fs.existsSync(standaloneBinary)) {
      console.warn(`⚠️ No Linux binary or AppImage found at ${targetDir}`);
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
    platform: isWindows ? 'windows' : isMac ? 'macos' : isLinux ? 'linux' : platform,
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

function printHelp() {
  console.log(`
Chronicle Native Desktop Application Builder (Tauri)

Usage:
  node scripts/build-tauri.js [options]
  npm run tauri:build [-- [options]]

Options:
  --debug             Build in debug mode (faster compilation, larger binary)
  --copy-to-docs      Copy and stage generated distributables into docs/downloads/
  --no-bundle         Compile standalone executable binary only (skip packaging)
  --appimage          Compile and package as Linux AppImage (.AppImage)
  --deb               Compile and package as Debian/Ubuntu package (.deb)
  --rpm               Compile and package as Fedora/RHEL/openSUSE RPM package (.rpm)
  --bundles <targets> Comma-separated list of bundle targets (e.g. appimage,deb,rpm)
  --target <triple>   Rust target triple (e.g. x86_64-unknown-linux-gnu)
  --check-prereqs     Verify Rust toolchain and Linux system dependencies without building
  --help, -h          Show this help information
`);
}

// 5. Main Build Sequence
export function runBuild() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  // Sync Cargo.toml version with package.json
  syncVersion();

  const isDebug = args.includes('--debug');
  const shouldCopyToDocs = args.includes('--copy-to-docs');
  const checkPrereqsOnly = args.includes('--check-prereqs');
  const isNoBundle = args.includes('--no-bundle') || args.includes('--binary');
  const targetMode = isDebug ? 'debug' : 'release';

  // Custom bundles extraction
  let customBundles = null;
  const bundlesIdx = args.findIndex(a => a === '--bundles' || a === '--bundle');
  if (bundlesIdx !== -1 && args[bundlesIdx + 1]) {
    customBundles = args[bundlesIdx + 1];
  } else {
    const bundleEqualsArg = args.find(a => a.startsWith('--bundles=') || a.startsWith('--bundle='));
    if (bundleEqualsArg) {
      customBundles = bundleEqualsArg.split('=')[1];
    } else if (args.includes('--appimage')) {
      customBundles = 'appimage';
    } else if (args.includes('--deb')) {
      customBundles = 'deb';
    } else if (args.includes('--rpm')) {
      customBundles = 'rpm';
    } else if (args.includes('--all-bundles')) {
      customBundles = 'all';
    }
  }

  // Custom target triple extraction
  let customTarget = null;
  const targetIdx = args.findIndex(a => a === '--target' || a === '-t');
  if (targetIdx !== -1 && args[targetIdx + 1]) {
    customTarget = args[targetIdx + 1];
  } else {
    const targetEqualsArg = args.find(a => a.startsWith('--target='));
    if (targetEqualsArg) {
      customTarget = targetEqualsArg.split('=')[1];
    }
  }

  const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
  if (nodeMajor < 18) {
    console.error(`\n❌ ERROR: Chronicle build requires Node.js 18+ or 20+ (current version: v${process.versions.node}).`);
    console.error(`Please switch to Node 20 or 22:`);
    console.error(`  Run: nvm use 22   (or nvm alias default 22)\n`);
    process.exit(1);
  }

  console.log('\n========================================================');
  console.log('   Chronicle • Building Native Tauri Desktop App');
  console.log('========================================================');
  console.log(` Host Platform : ${isWindows ? 'Windows (win32)' : isMac ? 'macOS (darwin)' : isLinux ? 'Linux (linux)' : platform}`);
  console.log(` Target Mode   : ${targetMode}`);
  if (customTarget) {
    console.log(` Target Triple : ${customTarget}`);
  }
  console.log(` Copy to Docs  : ${shouldCopyToDocs ? 'Yes (docs/downloads/)' : 'No (src-tauri/target only)'}`);
  console.log('========================================================\n');

  if (!isWindows && !isMac && !isLinux) {
    console.warn(`⚠️ Warning: Chronicle desktop app is officially tested on Windows, macOS, and Linux.`);
    console.warn(`Proceeding with build attempt for platform: ${platform}...\n`);
  }

  // Toolchain & Prerequisites Checking
  if (checkPrereqsOnly) {
    const hasCargo = ensureCargoInPath({ exitOnError: false });
    let hasLibs = true;
    if (isLinux) {
      hasLibs = checkLinuxPrerequisites();
    }
    console.log('\n========================================================');
    console.log(` Toolchain & Prerequisites Status: ${hasCargo && hasLibs ? 'READY ✓' : 'ACTION REQUIRED ⚠️'}`);
    console.log('========================================================\n');
    process.exit(hasCargo && hasLibs ? 0 : 1);
  }

  // Regular build sequence:
  // Inspect Linux development libraries so developers are informed before compiler triggers
  if (isLinux) {
    checkLinuxPrerequisites();

    // Avoid linuxdeploy strip error on modern distributions (Fedora 38+, Ubuntu 23+, Arch Linux)
    // where system shared libraries use modern .relr.dyn (SHT_RELR) relocation sections.
    if (!process.env.NO_STRIP) {
      process.env.NO_STRIP = 'true';
    }

    // Check for root-owned directory collisions from previous sudo runs
    const currentUid = process.getuid ? process.getuid() : null;
    if (currentUid !== null && currentUid !== 0) {
      const pathsToCheck = [
        path.resolve(projectRoot, 'dist'),
        path.resolve(projectRoot, 'src-tauri', 'target', 'release', 'bundle', 'appimage'),
      ];
      for (const p of pathsToCheck) {
        if (fs.existsSync(p)) {
          try {
            const stats = fs.statSync(p);
            if (stats.uid === 0) {
              console.warn(`\n⚠️ Warning: Directory "${p}" is owned by root from a previous run.`);
              console.warn('  Attempting to rotate it out of the way to prevent permission errors...');
              const backupPath = `${p}.root.bak.${Date.now()}`;
              fs.renameSync(p, backupPath);
              console.log(`  ✓ Moved root directory to ${backupPath}`);
            }
          } catch (e) {
            console.warn(`  ⚠️ Could not rotate ${p}: ${e.message}`);
          }
        }
      }
    }
  }

  // Ensure Rust / Cargo is active
  ensureCargoInPath({ exitOnError: true });

  // Ensure macOS DMG background is generated
  if (isMac) {
    const dmgBgPath = path.resolve(projectRoot, 'src-tauri', 'icons', 'dmg-background.png');
    const swiftGenerator = path.resolve(projectRoot, 'scripts', 'generate-dmg-background.swift');
    if (!fs.existsSync(dmgBgPath) && fs.existsSync(swiftGenerator)) {
      console.log('[Installer] Generating high-resolution DMG background artwork...');
      spawnSync('swift', [swiftGenerator, dmgBgPath], { stdio: 'inherit' });
    }

    // Detach any leftover /Volumes/Chronicle mounts from previous interrupted builds
    try {
      const hdiutilInfo = spawnSync('hdiutil', ['info'], { encoding: 'utf8' }).stdout || '';
      const matchLines = hdiutilInfo.split('\n').filter(l => l.includes('/Volumes/Chronicle'));
      for (const line of matchLines) {
        const devMatch = line.trim().split(/\s+/)[0];
        if (devMatch && devMatch.startsWith('/dev/')) {
          console.log(`[Cleaner] Detaching lingering disk image: ${devMatch}`);
          spawnSync('hdiutil', ['detach', devMatch, '-force'], { stdio: 'ignore' });
        }
      }
    } catch {}
  }

  // Build Tauri App
  console.log('\n[1/2] Compiling Tauri Rust Standalone Executable & Packages...');
  const tauriArgs = ['@tauri-apps/cli', 'build'];
  if (isDebug) {
    tauriArgs.push('--debug');
  }
  if (customTarget) {
    tauriArgs.push('--target', customTarget);
  }

  if (isWindows) {
    // On Windows, package standalone executable without installer
    tauriArgs.push('--no-bundle');
  } else if (isLinux) {
    if (isNoBundle) {
      tauriArgs.push('--no-bundle');
      console.log('[Target] Building standalone Linux binary only (--no-bundle)');
    } else if (customBundles) {
      tauriArgs.push('--bundles', customBundles);
      console.log(`[Target] Building specific Linux bundle(s): ${customBundles}`);
    } else {
      // Default for Linux: AppImage (Universal Portable Executable)
      // Standalone binary is always built as well in target directory
      tauriArgs.push('--bundles', 'appimage');
      console.log('[Target] Building Linux AppImage (Universal Portable Executable)');
      console.log('[Target] Standalone binary will also be compiled in target directory.');
      console.log('[Hint] Pass --no-bundle for raw binary only, or --deb / --rpm / --bundles <targets> for packages.\n');
    }
  }

  const npxCmd = isWindows ? 'npx.cmd' : 'npx';
  const buildResult = spawnSync(npxCmd, tauriArgs, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: isWindows,
    env: process.env,
  });

  if (buildResult.status !== 0) {
    console.error('\n❌ ERROR: Tauri desktop build failed.');
    process.exit(buildResult.status || 1);
  }

  const targetDir = customTarget
    ? path.resolve(projectRoot, 'src-tauri', 'target', customTarget, targetMode)
    : path.resolve(projectRoot, 'src-tauri', 'target', targetMode);
  const bundleDir = path.join(targetDir, 'bundle');

  if (shouldCopyToDocs) {
    copyDistributablesToDocs({ targetDir, bundleDir, targetMode });
  } else {
    console.log('\n========================================================');
    console.log('   Chronicle Desktop App Build Succeeded! 🎉');
    console.log('========================================================');
    console.log(` Target output directory: ${targetDir}`);
    console.log(' Note: Distributables were NOT copied to docs/downloads/.');
    console.log(' (Run "npm run build:docs:all" or pass "--copy-to-docs" to stage distributables)');
  }

  console.log('\n========================================================\n');
}

// Auto-run if executed directly
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runBuild();
}
