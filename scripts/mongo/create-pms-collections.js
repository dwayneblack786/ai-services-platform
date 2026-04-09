/**
 * PMS Collection Creation Script
 *
 * Creates all 4 core PMS collections with proper indexes
 * Run this ONCE before starting PMS implementation
 *
 * Usage: node scripts/mongo/create-pms-collections.js
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DATABASE_NAME = 'ai_platform';

async function createPMSCollections() {
  console.log('🚀 Starting PMS Collection Creation...\n');
  console.log(`Connecting to: ${MONGODB_URI}`);
  console.log(`Database: ${DATABASE_NAME}\n`);

  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db(DATABASE_NAME);

  try {
    // ==========================================
    // 1. Create prompt_versions collection
    // ==========================================
    console.log('📄 Creating prompt_versions collection...');

    const collections = await db.listCollections({ name: 'prompt_versions' }).toArray();
    if (collections.length === 0) {
      await db.createCollection('prompt_versions');
      console.log('   ✓ Collection created');
    } else {
      console.log('   ℹ Collection already exists, updating indexes...');
    }

    await db.collection('prompt_versions').createIndexes([
      {
        key: { tenantId: 1, productId: 1, channelType: 1, environment: 1, isActive: 1 },
        name: 'active_prompt_lookup'
      },
      {
        key: { promptId: 1, version: -1 },
        name: 'version_history'
      },
      {
        key: { state: 1, environment: 1 },
        name: 'state_environment'
      },
      {
        key: { 'abTest.testId': 1, 'abTest.enabled': 1 },
        name: 'ab_test_lookup',
        sparse: true
      },
      {
        key: { createdAt: 1 },
        name: 'draft_ttl',
        expireAfterSeconds: 7776000,  // 90 days
        partialFilterExpression: { state: 'draft', isActive: false }
      }
    ]);
    console.log('   ✓ Indexes created (5 indexes)');
    console.log('   ✓ TTL index: 90 days for inactive drafts\n');

    // ==========================================
    // 2. Create prompt_audit_log collection
    // ==========================================
    console.log('📄 Creating prompt_audit_log collection...');

    const auditCollections = await db.listCollections({ name: 'prompt_audit_log' }).toArray();
    if (auditCollections.length === 0) {
      await db.createCollection('prompt_audit_log');
      console.log('   ✓ Collection created');
    } else {
      console.log('   ℹ Collection already exists, updating indexes...');
    }

    await db.collection('prompt_audit_log').createIndexes([
      {
        key: { promptVersionId: 1, timestamp: -1 },
        name: 'prompt_audit_history'
      },
      {
        key: { 'actor.userId': 1, timestamp: -1 },
        name: 'user_activity'
      },
      {
        key: { action: 1, timestamp: -1 },
        name: 'action_lookup'
      },
      {
        key: { timestamp: -1 },
        name: 'timestamp_desc'
      },
      {
        key: { 'actor.ipAddress': 1, timestamp: -1 },
        name: 'security_monitoring'
      },
      {
        key: { timestamp: 1 },
        name: 'audit_retention_ttl',
        expireAfterSeconds: 220752000  // 7 years (HIPAA/SOC2)
      }
    ]);
    console.log('   ✓ Indexes created (6 indexes)');
    console.log('   ✓ TTL index: 7 years retention (HIPAA/SOC2 compliance)\n');

    // ==========================================
    // 3. Create prompt_test_results collection
    // ==========================================
    console.log('📄 Creating prompt_test_results collection...');

    const testCollections = await db.listCollections({ name: 'prompt_test_results' }).toArray();
    if (testCollections.length === 0) {
      await db.createCollection('prompt_test_results');
      console.log('   ✓ Collection created');
    } else {
      console.log('   ℹ Collection already exists, updating indexes...');
    }

    await db.collection('prompt_test_results').createIndexes([
      {
        key: { promptVersionId: 1, executedAt: -1 },
        name: 'test_history'
      },
      {
        key: { changeRequestId: 1 },
        name: 'change_request_tests',
        sparse: true
      },
      {
        key: { passed: 1, blocksPromotion: 1 },
        name: 'test_status'
      },
      {
        key: { executedAt: -1 },
        name: 'recent_tests'
      },
      {
        key: { executedAt: 1 },
        name: 'test_results_ttl',
        expireAfterSeconds: 31536000  // 1 year
      }
    ]);
    console.log('   ✓ Indexes created (5 indexes)');
    console.log('   ✓ TTL index: 1 year retention for test results\n');

    // ==========================================
    // 4. Create rag_documents collection
    // ==========================================
    console.log('📄 Creating rag_documents collection...');

    const ragCollections = await db.listCollections({ name: 'rag_documents' }).toArray();
    if (ragCollections.length === 0) {
      await db.createCollection('rag_documents');
      console.log('   ✓ Collection created');
    } else {
      console.log('   ℹ Collection already exists, updating indexes...');
    }

    await db.collection('rag_documents').createIndexes([
      {
        key: { tenantId: 1, promptVersionId: 1 },
        name: 'tenant_prompt_docs'
      },
      {
        key: { sourceId: 1, status: 1 },
        name: 'source_status'
      },
      {
        key: { checksum: 1 },
        name: 'duplicate_detection',
        unique: false
      },
      {
        key: { 'vectorStore.syncStatus': 1 },
        name: 'sync_status'
      }
    ]);
    console.log('   ✓ Indexes created (4 indexes)');
    console.log('   ✓ Checksum index for duplicate detection\n');

    // ==========================================
    // Summary
    // ==========================================
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ PMS Collections Created Successfully!\n');
    console.log('Collections:');
    console.log('  ✓ prompt_versions        (5 indexes, 90-day TTL on drafts)');
    console.log('  ✓ prompt_audit_log       (6 indexes, 7-year retention)');
    console.log('  ✓ prompt_test_results    (5 indexes, 1-year retention)');
    console.log('  ✓ rag_documents          (4 indexes, duplicate detection)');
    console.log('\nTotal: 4 collections, 20 indexes');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Next steps:');
    console.log('  1. Run migration script to move old data:');
    console.log('     node scripts/mongo/migrate-to-pms.js\n');
    console.log('  2. Verify collections:');
    console.log('     mongosh ai_platform --eval "db.getCollectionNames()"');

  } catch (error) {
    console.error('❌ Error creating collections:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the script
createPMSCollections()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
