#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const isWindows = process.platform === 'win32';
const nextDir = path.join(__dirname, '..', '.next');

if (isWindows && fs.existsSync(nextDir)) {
  try {
    console.log('🔒 Setting OneDrive exclusion for .next directory...');
    execSync(`attrib +U "${nextDir}" /S /D`, { stdio: 'ignore' });
    console.log('✅ .next directory excluded from OneDrive sync');
  } catch (error) {
    console.warn('⚠️  Could not set OneDrive exclusion for .next (non-critical)');
  }
}
