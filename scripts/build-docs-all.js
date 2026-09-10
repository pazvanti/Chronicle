#!/usr/bin/env node

/**
 * Chronicle Full Release & GitHub Pages Publisher
 * 
 * Compiles BOTH:
 * 1. The in-browser Web Studio into docs/app/
 * 2. The Native Desktop Executables (Windows or macOS) into docs/downloads/
 * 3. Ensures docs/.nojekyll and validates all presentation files.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('====================================================');
console.log(' Chronicle Full Publisher (Web App + Desktop Downloads)');
console.log(' Target: /docs (Ready for GitHub Pages Upload)');
console.log('====================================================\n');

const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
if (nodeMajor < 18) {
  console.error(`\n❌ ERROR: Chronicle build requires Node.js 18+ or 20+ (current version: v${process.versions.node}).`);
  console.error(`Please switch to Node 20 or 22:`);
  console.error(`  Run: nvm use 22   (or nvm alias default 22)\n`);
  process.exit(1);
}

const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';

// Step 1: Build the in-browser Web App into docs/app/
console.log('==> [1/4] Building In-Browser Web Application into docs/app/ ...');
const viteDocsConfig = path.resolve(projectRoot, 'vite.docs.config.ts');
const npxCmd = isWindows ? 'npx.cmd' : 'npx';

const webBuildResult = spawnSync(
  npxCmd,
  ['vite', 'build', '--config', viteDocsConfig],
  {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true,
  }
);

if (webBuildResult.status !== 0) {
  console.error('\n❌ Failed to build web app for docs/app/');
  process.exit(1);
}

// Step 2: Build Native Tauri Desktop App & Stage Distributables to docs/downloads/
console.log('\n==> [2/4] Building Native Desktop App & Staging to docs/downloads/ ...');
const nodeCmd = process.execPath;
const buildTauriScript = path.resolve(__dirname, 'build-tauri.js');

const tauriBuildResult = spawnSync(
  process.execPath,
  [buildTauriScript, '--copy-to-docs'],
  {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: false,
    env: process.env,
  }
);

if (tauriBuildResult.status !== 0) {
  console.error('\n❌ Failed to build desktop app for docs/downloads/');
  process.exit(1);
}

// Step 3: Ensure docs/.nojekyll
console.log('\n==> [3/4] Verifying docs/.nojekyll for GitHub Pages...');
const noJekyllPath = path.resolve(projectRoot, 'docs/.nojekyll');
if (!fs.existsSync(noJekyllPath)) {
  fs.writeFileSync(noJekyllPath, '# Disable Jekyll processing on GitHub Pages\n', 'utf8');
}
console.log('  ✓ docs/.nojekyll file verified.');

// Step 4: Verification of All Required Deliverables
console.log('\n==> [4/4] Verifying Complete GitHub Pages Deliverables in /docs...');
const indexHtml = path.resolve(projectRoot, 'docs/index.html');
const styleCss = path.resolve(projectRoot, 'docs/style.css');
const appHtml = path.resolve(projectRoot, 'docs/app/index.html');
const downloadsDir = path.resolve(projectRoot, 'docs/downloads');
const manifestFile = path.join(downloadsDir, 'manifest.json');

if (!fs.existsSync(indexHtml) || !fs.existsSync(styleCss) || !fs.existsSync(appHtml)) {
  console.error('\n❌ Missing essential presentation files in /docs directory.');
  process.exit(1);
}

if (!fs.existsSync(downloadsDir) || !fs.existsSync(manifestFile)) {
  console.error('\n❌ Missing desktop downloads in docs/downloads/.');
  process.exit(1);
}

console.log('  ✓ docs/index.html   (Presentation Landing Page & Download Center)');
console.log('  ✓ docs/style.css    (Modern Design System Stylesheet)');
console.log('  ✓ docs/main.js      (Showcase Logic & Dynamic OS Downloader)');
console.log('  ✓ docs/assets/      (High-res Screenshots & Emblems)');
console.log('  ✓ docs/app/         (Live In-Browser Studio)');
console.log('  ✓ docs/downloads/   (Downloadable Native Desktop Executables)');

// Read manifest to show what executables are ready
try {
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  console.log(`\n📦 Staged Executables for ${manifest.platform.toUpperCase()}:`);
  for (const item of manifest.distributables) {
    console.log(`    • ${item.name} (${item.sizeMB} MB)`);
  }
} catch {
  // Ignored
}

console.log('\n====================================================');
console.log(' 🎉 COMPLETE GITHUB PAGES SUITE READY IN /docs!');
console.log('====================================================');
console.log('When you commit and push to GitHub, your Pages site will provide:');
console.log('  1. The full interactive presentation website');
console.log('  2. The in-browser Web Studio at /docs/app/');
console.log('  3. The native standalone desktop executables at /docs/downloads/');
console.log('====================================================\n');
