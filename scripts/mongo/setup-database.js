#!/usr/bin/env node
/**
 * MongoDB Database Setup - Master Script
 *
 * This script performs a complete database setup for new developers and deployments:
 * 1. Creates all required collections
 * 2. Creates all indexes for optimal performance
 * 3. Sets up TTL indexes for automatic cleanup
 * 4. Optionally seeds initial data (admin user, default products, etc.)
 * 5. Verifies the setup
 *
 * Usage:
 *   node scripts/mongo/setup-database.js [options]
 *
 * Options:
 *   --seed         Seed initial data (admin user, products, etc.)
 *   --drop         Drop existing collections before creating (DANGER!)
 *   --env=<env>    Environment: dev, staging, prod (default: dev)
 *   --help         Show this help message
 *
 * Examples:
 *   node scripts/mongo/setup-database.js
 *   node scripts/mongo/setup-database.js --seed
 *   node scripts/mongo/setup-database.js --drop --seed
 *   node scripts/mongo/setup-database.js --env=prod
 */

const { MongoClient, ObjectId } = require('mongodb');
const readline = require('readline');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DATABASE_NAME = process.env.MONGODB_DATABASE || 'ai_platform';

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  seed: args.includes('--seed'),
  drop: args.includes('--drop'),
  help: args.includes('--help'),
  env: (args.find(arg => arg.startsWith('--env=')) || '--env=dev').split('=')[1]
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function showHelp() {
  console.log(`
MongoDB Database Setup - Master Script

Usage:
  node scripts/mongo/setup-database.js [options]

Options:
  --seed         Seed initial data (admin user, products, etc.)
  --drop         Drop existing collections before creating (⚠️  DANGER!)
  --env=<env>    Environment: dev, staging, prod (default: dev)
  --help         Show this help message

Examples:
  node scripts/mongo/setup-database.js
  node scripts/mongo/setup-database.js --seed
  node scripts/mongo/setup-database.js --drop --seed
  node scripts/mongo/setup-database.js --env=prod
  `);
}

async function confirmAction(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(`${colors.yellow}${question} (yes/no): ${colors.reset}`, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

// ==========================================
// Collection Definitions
// ==========================================

const collections = {
  // ===== PMS Collections (NEW) =====
  prompt_versions: {
    indexes: [
      { key: { tenantId: 1, productId: 1, channelType: 1, environment: 1, isActive: 1 }, name: 'active_prompt_lookup' },
      { key: { promptId: 1, version: -1 }, name: 'version_history' },
      { key: { state: 1, environment: 1 }, name: 'state_environment' },
      { key: { 'abTest.testId': 1, 'abTest.enabled': 1 }, name: 'ab_test_lookup', sparse: true },
      { key: { createdAt: 1 }, name: 'draft_ttl', expireAfterSeconds: 7776000, partialFilterExpression: { state: 'draft', isActive: false } }
    ],
    description: 'Versioned prompts with RAG configuration'
  },

  prompt_audit_log: {
    indexes: [
      { key: { promptVersionId: 1, timestamp: -1 }, name: 'prompt_audit_history' },
      { key: { 'actor.userId': 1, timestamp: -1 }, name: 'user_activity' },
      { key: { action: 1, timestamp: -1 }, name: 'action_lookup' },
      { key: { timestamp: -1 }, name: 'timestamp_desc' },
      { key: { 'actor.ipAddress': 1, timestamp: -1 }, name: 'security_monitoring' },
      { key: { timestamp: 1 }, name: 'audit_retention_ttl', expireAfterSeconds: 220752000 }
    ],
    description: 'HIPAA/SOC2/GDPR compliant audit trail (7-year retention)'
  },

  prompt_test_results: {
    indexes: [
      { key: { promptVersionId: 1, executedAt: -1 }, name: 'test_history' },
      { key: { changeRequestId: 1 }, name: 'change_request_tests', sparse: true },
      { key: { passed: 1, blocksPromotion: 1 }, name: 'test_status' },
      { key: { executedAt: -1 }, name: 'recent_tests' },
      { key: { executedAt: 1 }, name: 'test_results_ttl', expireAfterSeconds: 31536000 }
    ],
    description: 'Automated prompt testing results (1-year retention)'
  },

  rag_documents: {
    indexes: [
      { key: { tenantId: 1, promptVersionId: 1 }, name: 'tenant_prompt_docs' },
      { key: { sourceId: 1, status: 1 }, name: 'source_status' },
      { key: { checksum: 1 }, name: 'duplicate_detection' },
      { key: { 'vectorStore.syncStatus': 1 }, name: 'sync_status' }
    ],
    description: 'RAG knowledge base (documents, chunks, embeddings)'
  },

  // ===== Core Application Collections =====
  users: {
    indexes: [
      { key: { email: 1 }, name: 'email_unique', unique: true },
      { key: { tenantId: 1 }, name: 'tenant_users' },
      { key: { idpSub: 1 }, name: 'idp_subject', sparse: true },
      { key: { keycloakSub: 1 }, name: 'keycloak_subject', sparse: true }
    ],
    description: 'User accounts with SSO integration'
  },

  tenants: {
    indexes: [
      { key: { name: 1 }, name: 'tenant_name' },
      { key: { createdAt: -1 }, name: 'recent_tenants' }
    ],
    description: 'Multi-tenant organizations'
  },

  products: {
    indexes: [
      { key: { name: 1 }, name: 'product_name' },
      { key: { category: 1 }, name: 'product_category' }
    ],
    description: 'Product catalog'
  },

  product_subscriptions: {
    indexes: [
      { key: { tenantId: 1, productId: 1 }, name: 'tenant_product_subscription' },
      { key: { status: 1 }, name: 'subscription_status' },
      { key: { endDate: 1 }, name: 'subscription_expiry' }
    ],
    description: 'Product subscriptions per tenant'
  },

  user_products: {
    indexes: [
      { key: { userId: 1, productId: 1 }, name: 'user_product' },
      { key: { tenantId: 1 }, name: 'tenant_user_products' }
    ],
    description: 'User product access control'
  },

  payment_methods: {
    indexes: [
      { key: { tenantId: 1 }, name: 'tenant_payment_methods' },
      { key: { isDefault: 1 }, name: 'default_payment_method' }
    ],
    description: 'Payment methods for billing'
  },

  transactions: {
    indexes: [
      { key: { tenantId: 1, createdAt: -1 }, name: 'tenant_transactions' },
      { key: { status: 1 }, name: 'transaction_status' },
      { key: { createdAt: -1 }, name: 'recent_transactions' }
    ],
    description: 'Payment transaction history'
  },

  assistant_channels: {
    indexes: [
      { key: { tenantId: 1, productId: 1 }, name: 'tenant_product_channels' },
      { key: { userId: 1 }, name: 'user_channels' }
    ],
    description: 'Virtual assistant channel configurations'
  },

  assistant_chats: {
    indexes: [
      { key: { sessionId: 1 }, name: 'session_chats' },
      { key: { userId: 1, timestamp: -1 }, name: 'user_chat_history' },
      { key: { tenantId: 1, timestamp: -1 }, name: 'tenant_chats' }
    ],
    description: 'Chat conversation history'
  },

  chat_messages: {
    indexes: [
      { key: { chatId: 1, timestamp: 1 }, name: 'chat_messages_ordered' },
      { key: { timestamp: -1 }, name: 'recent_messages' }
    ],
    description: 'Individual chat messages'
  },

  usage_events: {
    indexes: [
      { key: { tenantId: 1, timestamp: -1 }, name: 'tenant_usage' },
      { key: { userId: 1, timestamp: -1 }, name: 'user_usage' },
      { key: { productId: 1, timestamp: -1 }, name: 'product_usage' }
    ],
    description: 'Usage tracking and analytics'
  },

  api_keys: {
    indexes: [
      { key: { key: 1 }, name: 'api_key_lookup', unique: true },
      { key: { tenantId: 1 }, name: 'tenant_api_keys' },
      { key: { expiresAt: 1 }, name: 'api_key_expiry' }
    ],
    description: 'API keys for authentication'
  },

  revoked_tokens: {
    indexes: [
      { key: { token: 1 }, name: 'revoked_token_lookup' },
      { key: { expiresAt: 1 }, name: 'token_expiry', expireAfterSeconds: 0 }
    ],
    description: 'Revoked JWT tokens'
  },

  workflows: {
    indexes: [
      { key: { tenantId: 1 }, name: 'tenant_workflows' },
      { key: { status: 1 }, name: 'workflow_status' }
    ],
    description: 'Workflow definitions and executions'
  }
};

// ==========================================
// Main Setup Function
// ==========================================

async function setupDatabase() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║         MongoDB Database Setup - Master Script            ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  log(`\nEnvironment: ${options.env.toUpperCase()}`, 'bright');
  log(`Database: ${DATABASE_NAME}`, 'bright');
  log(`URI: ${MONGODB_URI}\n`, 'bright');

  // Safety check for production
  if (options.drop && options.env === 'prod') {
    log('⚠️  WARNING: You are about to DROP collections in PRODUCTION!', 'red');
    const confirmed = await confirmAction('Are you absolutely sure?');
    if (!confirmed) {
      log('Setup cancelled.', 'yellow');
      process.exit(0);
    }
  }

  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db(DATABASE_NAME);

  try {
    const existingCollections = await db.listCollections().toArray();
    const existingNames = existingCollections.map(c => c.name);

    log('Step 1: Collection Setup\n', 'magenta');

    let createdCount = 0;
    let updatedCount = 0;
    let droppedCount = 0;

    for (const [collName, collConfig] of Object.entries(collections)) {
      const exists = existingNames.includes(collName);

      // Drop if requested
      if (exists && options.drop) {
        log(`  🗑️  Dropping ${collName}...`, 'yellow');
        await db.collection(collName).drop();
        droppedCount++;
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Create or update
      const shouldCreate = !exists || options.drop;

      if (shouldCreate) {
        log(`  ✨ Creating ${collName}...`, 'green');
        await db.createCollection(collName);
        createdCount++;
      } else {
        log(`  ℹ️  Updating ${collName}...`, 'cyan');
        updatedCount++;
      }

      // Create indexes
      if (collConfig.indexes && collConfig.indexes.length > 0) {
        await db.collection(collName).createIndexes(collConfig.indexes);
        log(`     └─ ${collConfig.indexes.length} indexes created`, 'green');
      }

      log(`     ${collConfig.description}`, 'reset');
    }

    log(`\n✅ Collection setup complete:`, 'green');
    log(`   Created: ${createdCount}`, 'green');
    log(`   Updated: ${updatedCount}`, 'cyan');
    if (droppedCount > 0) {
      log(`   Dropped: ${droppedCount}`, 'yellow');
    }

    // Seed data if requested
    if (options.seed) {
      log('\n\nStep 2: Seeding Initial Data\n', 'magenta');
      await seedData(db);
    }

    // Verify setup
    log('\n\nStep 3: Verification\n', 'magenta');
    await verifySetup(db);

    log('\n╔════════════════════════════════════════════════════════════╗', 'green');
    log('║            ✅ Database Setup Complete!                     ║', 'green');
    log('╚════════════════════════════════════════════════════════════╝', 'green');

    log('\nNext steps:', 'cyan');
    log('  1. Start your backend server', 'reset');
    log('  2. Run migrations if needed: node scripts/mongo/migrate-to-pms.js', 'reset');
    log('  3. Verify the setup: node scripts/mongo/verify-collections.js\n', 'reset');

  } catch (error) {
    log(`\n❌ Error during setup: ${error.message}`, 'red');
    throw error;
  } finally {
    await client.close();
  }
}

// ==========================================
// Seed Initial Data
// ==========================================

async function seedData(db) {
  try {
    // Create default admin tenant
    const tenantExists = await db.collection('tenants').findOne({ name: 'Admin' });
    if (!tenantExists) {
      const adminTenant = {
        _id: new ObjectId(),
        name: 'Admin',
        description: 'System Administrator Tenant',
        createdAt: new Date(),
        isActive: true
      };
      await db.collection('tenants').insertOne(adminTenant);
      log('  ✓ Created admin tenant', 'green');

      // Create admin user
      const adminUser = {
        _id: new ObjectId(),
        email: 'admin@example.com',
        name: 'System Administrator',
        role: 'ADMIN',
        tenantId: adminTenant._id.toString(),
        emailVerified: true,
        companyDetailsCompleted: true,
        authProvider: 'local',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await db.collection('users').insertOne(adminUser);
      log('  ✓ Created admin user (email: admin@example.com)', 'green');
    } else {
      log('  ℹ️  Admin tenant already exists, skipping', 'cyan');
    }

    // Create default products
    const productCount = await db.collection('products').countDocuments();
    if (productCount === 0) {
      const defaultProducts = [
        { name: 'Virtual Assistant', category: 'AI Services', description: 'AI-powered virtual assistant', isActive: true, createdAt: new Date() },
        { name: 'IDP Platform', category: 'Identity', description: 'Identity Provider Platform', isActive: true, createdAt: new Date() },
        { name: 'Computer Vision', category: 'AI Services', description: 'Computer vision services', isActive: true, createdAt: new Date() }
      ];
      await db.collection('products').insertMany(defaultProducts);
      log(`  ✓ Created ${defaultProducts.length} default products`, 'green');
    } else {
      log('  ℹ️  Products already exist, skipping', 'cyan');
    }

    log('\n✅ Seed data complete', 'green');
  } catch (error) {
    log(`❌ Error seeding data: ${error.message}`, 'red');
    throw error;
  }
}

// ==========================================
// Verify Setup
// ==========================================

async function verifySetup(db) {
  const collections = await db.listCollections().toArray();
  const collectionNames = collections.map(c => c.name);

  const pmsCollections = ['prompt_versions', 'prompt_audit_log', 'prompt_test_results', 'rag_documents'];
  const coreCollections = ['users', 'tenants', 'products'];

  let allGood = true;

  // Check PMS collections
  log('PMS Collections:', 'cyan');
  for (const name of pmsCollections) {
    if (collectionNames.includes(name)) {
      const indexes = await db.collection(name).indexes();
      log(`  ✓ ${name} (${indexes.length} indexes)`, 'green');
    } else {
      log(`  ✗ ${name} - MISSING`, 'red');
      allGood = false;
    }
  }

  // Check core collections
  log('\nCore Collections:', 'cyan');
  for (const name of coreCollections) {
    if (collectionNames.includes(name)) {
      const count = await db.collection(name).countDocuments();
      log(`  ✓ ${name} (${count} documents)`, 'green');
    } else {
      log(`  ✗ ${name} - MISSING`, 'red');
      allGood = false;
    }
  }

  if (!allGood) {
    throw new Error('Some collections are missing!');
  }

  log('\n✅ All verifications passed!', 'green');
}

// ==========================================
// Main Execution
// ==========================================

if (options.help) {
  showHelp();
  process.exit(0);
}

setupDatabase()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
