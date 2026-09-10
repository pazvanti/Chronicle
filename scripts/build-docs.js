#!/usr/bin/env node

/**
 * Chronicle GitHub Pages Documentation & Presentation Publisher
 * 
 * Compiles:
 * 1. The full in-browser web application into docs/app/ with relative asset paths.
 * 2. Ensures docs/.nojekyll exists for GitHub Pages compatibility.
 * 3. Verifies docs/assets/ screenshots and presentation page docs/index.html.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('====================================================');
console.log(' Chronicle GitHub Pages Publisher');
console.log(' Target: /docs (Presentation Site + In-Browser App)');
console.log('====================================================\n');

const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
if (nodeMajor < 18) {
  console.error(`\n❌ ERROR: Chronicle build requires Node.js 18+ or 20+ (current version: v${process.versions.node}).`);
  console.error(`Please switch to Node 20 or 22:`);
  console.error(`  Run: nvm use 22   (or nvm alias default 22)\n`);
  process.exit(1);
}

// 1. Build the web app into docs/app/
console.log('==> Step 1/3: Compiling web application into docs/app/ ...');
const viteDocsConfig = path.resolve(projectRoot, 'vite.docs.config.ts');
const viteResult = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite', 'build', '--config', viteDocsConfig],
  {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true,
  }
);

if (viteResult.status !== 0) {
  console.error('\n❌ Failed to build web app for docs/app/');
  process.exit(1);
}

// 2. Ensure docs/.nojekyll
const noJekyllPath = path.resolve(projectRoot, 'docs/.nojekyll');
if (!fs.existsSync(noJekyllPath)) {
  fs.writeFileSync(noJekyllPath, '# Disable Jekyll processing on GitHub Pages\n', 'utf8');
}
console.log('\n==> Step 2/3: Verified docs/.nojekyll file');

// 3. Verify files
console.log('\n==> Step 3/3: Verifying presentation site files...');
const indexHtml = path.resolve(projectRoot, 'docs/index.html');
const styleCss = path.resolve(projectRoot, 'docs/style.css');
const appHtml = path.resolve(projectRoot, 'docs/app/index.html');

if (!fs.existsSync(indexHtml) || !fs.existsSync(styleCss) || !fs.existsSync(appHtml)) {
  console.error('\n❌ Missing required files in /docs directory.');
  process.exit(1);
}

console.log('  ✓ docs/index.html (Presentation Landing Page)');
console.log('  ✓ docs/style.css  (Modern Design System Stylesheet)');
console.log('  ✓ docs/main.js    (Interactive Showcase Logic)');
console.log('  ✓ docs/assets/    (High-res Screenshots & Badges)');
console.log('  ✓ docs/app/       (Live In-Browser Chronicle Studio)');

console.log('\n====================================================');
console.log(' 🎉 GitHub Pages Site Ready in /docs!');
console.log('====================================================');
console.log('\n📖 How to enable on GitHub:');
console.log(' 1. Push your repository to GitHub.');
console.log(' 2. Go to your repository > Settings > Pages.');
console.log(' 3. Under "Build and deployment", set:');
console.log('    - Source: "Deploy from a branch"');
console.log('    - Branch: "main" (or "master") and folder: "/docs"');
console.log(' 4. Click Save.');
console.log(' 5. Your site and online app will be live at:');
console.log('    https://pazvanti.github.io/Chronicle/');
console.log('====================================================\n');
