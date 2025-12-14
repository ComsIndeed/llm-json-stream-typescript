#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function removePath(target) {
  if (!fs.existsSync(target)) {
    console.log('Not found:', target);
    return false;
  }
  try {
    if (typeof fs.rmSync === 'function') {
      fs.rmSync(target, { recursive: true, force: true });
    } else {
      // Older Node fallback
      fs.rmdirSync(target, { recursive: true });
    }
    console.log('Removed:', target);
    return true;
  } catch (err) {
    console.error('Failed to remove', target, err && err.message ? err.message : err);
    return false;
  }
}

const repoRoot = path.resolve(__dirname, '..');
const targets = [];

// root node_modules
targets.push(path.join(repoRoot, 'node_modules'));

// apps/*/node_modules
const appsDir = path.join(repoRoot, 'apps');
if (fs.existsSync(appsDir)) {
  for (const entry of fs.readdirSync(appsDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      targets.push(path.join(appsDir, entry.name, 'node_modules'));
    }
  }
}

// packages/*/node_modules
const packagesDir = path.join(repoRoot, 'packages');
if (fs.existsSync(packagesDir)) {
  for (const entry of fs.readdirSync(packagesDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      targets.push(path.join(packagesDir, entry.name, 'node_modules'));
    }
  }
}

let removedCount = 0;
for (const t of targets) {
  const ok = removePath(t);
  if (ok) removedCount++;
}

if (removedCount === 0) {
  console.log('No node_modules directories were removed.');
} else {
  console.log(`Removed ${removedCount} node_modules directories.`);
}
