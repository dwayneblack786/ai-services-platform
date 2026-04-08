import mongoose from 'mongoose';
import { KeycloakTenant } from '../../backend-node/src/models/KeycloakTenant';

/**
 * Seed Tenants for Multi-Tenant Keycloak Setup
 * 
 * Run this script to populate the database with sample tenants
 * 
 * Usage:
 *   npx ts-node product-management/scripts/keycloak/seed-tenants.ts
 */

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_platform';

const sampleTenants = [
  {
    tenantId: 'default',
    name: 'Default Organization',
    domain: 'default.local',
    aliases: ['demo', 'test'],
    keycloakRealm: 'tenant-default',
    keycloakEnabled: true,
    allowedAuthMethods: ['password', 'google', 'microsoft'],
    status: 'active'
  },
  {
    tenantId: 'acme-corp',
    name: 'Acme Corporation',
    domain: 'acmecorp.com',
    aliases: ['acme', 'acmecorp'],
    keycloakRealm: 'tenant-acme-corp',
    keycloakEnabled: true,
    allowedAuthMethods: ['password', 'google', 'microsoft'],
    status: 'active'
  },
  {
    tenantId: 'techstart',
    name: 'TechStart Inc.',
    domain: 'techstart.io',
    aliases: ['techstart'],
    keycloakRealm: 'tenant-techstart',
    keycloakEnabled: true,
    allowedAuthMethods: ['password', 'google'],
    status: 'active'
  },
  {
    tenantId: 'global-industries',
    name: 'Global Industries',
    domain: 'globalind.com',
    aliases: ['global', 'globalind'],
    keycloakRealm: 'tenant-global-industries',
    keycloakEnabled: true,
    allowedAuthMethods: ['password', 'microsoft'],
    status: 'active'
  }
];

async function seedTenants() {
  try {
    console.log('🌱 Seeding tenants...\n');
    console.log(`Connecting to: ${MONGODB_URI}`);

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Clear existing tenants (optional)
    // await KeycloakTenant.deleteMany({});
    // console.log('🗑️  Cleared existing tenants\n');

    let created = 0;
    let updated = 0;

    for (const tenantData of sampleTenants) {
      const existing = await KeycloakTenant.findOne({ tenantId: tenantData.tenantId });

      if (existing) {
        Object.assign(existing, tenantData);
        await existing.save();
        console.log(`📝 Updated: ${tenantData.name} (${tenantData.tenantId})`);
        console.log(`   Realm: ${tenantData.keycloakRealm}`);
        console.log(`   Domain: ${tenantData.domain}`);
        console.log(`   Aliases: ${tenantData.aliases.join(', ')}`);
        console.log('');
        updated++;
      } else {
        const tenant = new KeycloakTenant(tenantData);
        await tenant.save();
        console.log(`✅ Created: ${tenantData.name} (${tenantData.tenantId})`);
        console.log(`   Realm: ${tenantData.keycloakRealm}`);
        console.log(`   Domain: ${tenantData.domain}`);
        console.log(`   Aliases: ${tenantData.aliases.join(', ')}`);
        console.log('');
        created++;
      }
    }

    console.log('='.repeat(80));
    console.log('✅ Tenant seeding complete!');
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Total: ${created + updated}`);
    console.log('='.repeat(80));
    console.log('\nYou can now test tenant lookup:');
    console.log('  • POST /api/auth/tenant/lookup { "identifier": "acme-corp" }');
    console.log('  • POST /api/auth/tenant/lookup { "identifier": "acmecorp.com" }');
    console.log('  • POST /api/auth/tenant/lookup { "identifier": "acme" }');
    console.log('  • POST /api/auth/tenant/suggest { "email": "user@acmecorp.com" }');
    console.log('');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seedTenants();
