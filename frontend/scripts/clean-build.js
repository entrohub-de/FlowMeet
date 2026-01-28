#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const nextDir = path.join(__dirname, '..', '.next');
const isWindows = process.platform === 'win32';

console.log('🧹 Cleaning build directories...');

// Remove .next directory
if (fs.existsSync(nextDir)) {
  try {
    // On Windows, use rmdir; on Unix, use rm -rf
    if (isWindows) {
      execSync(`rmdir /s /q "${nextDir}"`, { stdio: 'ignore' });
    } else {
      execSync(`rm -rf "${nextDir}"`, { stdio: 'ignore' });
    }
    console.log('✅ Cleaned .next directory');
  } catch (error) {
    console.warn('⚠️  Could not clean .next directory (might not exist)');
  }
}

// On Windows, set OneDrive exclusion
if (isWindows) {
  try {
    const nodeModulesPath = path.join(__dirname, '..', 'node_modules');

    // Set OneDrive exclusion for node_modules (if exists)
    if (fs.existsSync(nodeModulesPath)) {
      execSync(`attrib +U "${nodeModulesPath}" /S /D`, { stdio: 'ignore' });
    }

    // Note: .next will be excluded when it's created during build
    console.log('✅ OneDrive exclusion attributes set');
  } catch (error) {
    console.warn('⚠️  Could not set OneDrive exclusion (non-critical)');
  }
}

console.log('✨ Ready to build!\n');
