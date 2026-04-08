import { spawn } from 'child_process';
import path from 'path';

/**
 * Seed Tenants for Multi-Tenant Keycloak Setup
 * 
 * Compatibility wrapper. Delegates to product-management local script.
 * 
 * Usage:
 *   npx ts-node scripts/keycloak/seed-tenants.ts
 */

const targetScript = path.resolve(__dirname, '../../product-management/scripts/keycloak/seed-tenants.ts');

console.warn('[migration] scripts/keycloak/seed-tenants.ts is deprecated.');
console.warn(`[migration] Delegating to ${targetScript}`);

const child = spawn('npx', ['ts-node', targetScript], {
  stdio: 'inherit',
  shell: true,
  env: process.env
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});

child.on('error', (error) => {
  console.error('Failed to run delegated script:', error);
  process.exit(1);
});
