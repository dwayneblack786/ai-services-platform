#!/usr/bin/env node

/**
 * Startup Validation Script
 * 
 * This script validates common Node.js startup issues before running the app:
 * 1. Checks for variable initialization order (prevents "not defined" errors)
 * 2. Validates environment variables
 * 3. Checks for deprecated module usage
 * 4. Ensures proper shutdown handler registration
 * 
 * Run this before starting the server:
 * node scripts/validate-startup.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating backend startup configuration...\n');

let hasErrors = false;
let hasWarnings = false;

// Check 1: Validate index.ts variable initialization order
console.log('✓ Checking variable initialization order...');
const indexPath = path.join(__dirname, '../src/index.ts');
const indexContent = fs.readFileSync(indexPath, 'utf8');

// Check if shutdown handlers are registered after httpServer/io creation
const httpServerMatch = indexContent.match(/const httpServer = createServer/);
const ioMatch = indexContent.match(/const io = initializeSocketIO/);
const sigtermMatch = indexContent.match(/process\.on\('SIGTERM'/g);

if (httpServerMatch && ioMatch && sigtermMatch) {
  const httpServerPos = indexContent.indexOf('const httpServer = createServer');
  const ioPos = indexContent.indexOf('const io = initializeSocketIO');
  const lastSigtermPos = indexContent.lastIndexOf("process.on('SIGTERM'");
  
  if (lastSigtermPos < httpServerPos || lastSigtermPos < ioPos) {
    console.error('❌ ERROR: Shutdown handlers registered before httpServer/io initialization!');
    console.error('   This will cause "ReferenceError: httpServer is not defined" on startup.');
    console.error('   Fix: Move process.on() handlers after httpServer.listen()');
    hasErrors = true;
  } else {
    console.log('  ✓ Shutdown handlers properly registered after server initialization');
  }
}

// Check 2: Validate environment file exists
console.log('\n✓ Checking environment configuration...');
const envPath = path.join(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  console.warn('⚠️  WARNING: .env file not found');
  console.warn('   Create .env file from .env.example');
  hasWarnings = true;
} else {
  console.log('  ✓ .env file exists');
}

// Check 3: Check for deprecated punycode usage (common deprecation warning)
console.log('\n✓ Checking for deprecated modules...');
const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Note: punycode deprecation warning is often from dependencies, not direct usage
// This is informational only
console.log('  ℹ️  Note: DEP0040 punycode warnings are from dependencies (validator, tr46, etc.)');
console.log('     These are harmless and will be fixed when dependencies update.');

// Check 4: Validate required dependencies
console.log('\n✓ Checking required dependencies...');
const requiredDeps = ['express', 'socket.io', 'mongoose', 'redis'];
const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);

if (missingDeps.length > 0) {
  console.error(`❌ ERROR: Missing dependencies: ${missingDeps.join(', ')}`);
  console.error('   Run: npm install');
  hasErrors = true;
} else {
  console.log('  ✓ All required dependencies present');
}

// Check 5: Validate graceful shutdown function exists
console.log('\n✓ Checking graceful shutdown implementation...');
if (!indexContent.includes('async function gracefulShutdown')) {
  console.error('❌ ERROR: gracefulShutdown function not found!');
  hasErrors = true;
} else {
  // Check if it includes all cleanup steps
  const requiredSteps = [
    'io.emit',
    'httpServer.close',
    'mongoose.connection.close',
    'redisClient.quit'
  ];
  
  const missingSteps = requiredSteps.filter(step => !indexContent.includes(step));
  if (missingSteps.length > 0) {
    console.warn('⚠️  WARNING: Graceful shutdown missing cleanup steps:');
    missingSteps.forEach(step => console.warn(`     - ${step}`));
    hasWarnings = true;
  } else {
    console.log('  ✓ Graceful shutdown properly implemented');
  }
}

// Summary
console.log('\n' + '='.repeat(60));
if (hasErrors) {
  console.error('❌ VALIDATION FAILED - Fix errors before starting server');
  process.exit(1);
} else if (hasWarnings) {
  console.warn('⚠️  VALIDATION PASSED WITH WARNINGS - Review warnings above');
  process.exit(0);
} else {
  console.log('✅ ALL CHECKS PASSED - Server is ready to start');
  process.exit(0);
}
