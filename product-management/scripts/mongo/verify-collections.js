const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DATABASE_NAME = 'ai_platform';

async function verifyCollections() {
  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db(DATABASE_NAME);

  console.log('🔍 Verifying PMS Collections in ai_platform database...\n');

  // Get all collections
  const collections = await db.listCollections().toArray();

  console.log('All Collections:');
  collections.forEach(col => {
    const isPMS = ['prompt_versions', 'prompt_audit_log', 'prompt_test_results', 'rag_documents'].includes(col.name);
    const icon = isPMS ? '✅ [PMS]' : '  ';
    console.log(`${icon} ${col.name}`);
  });

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('PMS Collection Details:\n');

  // Check each PMS collection
  const pmsCollections = ['prompt_versions', 'prompt_audit_log', 'prompt_test_results', 'rag_documents'];

  for (const collName of pmsCollections) {
    const exists = collections.find(c => c.name === collName);
    if (exists) {
      const indexes = await db.collection(collName).indexes();
      console.log(`✓ ${collName}`);
      console.log(`  Indexes: ${indexes.length}`);
      indexes.forEach(idx => {
        const keys = Object.keys(idx.key).join(', ');
        console.log(`    - ${idx.name}: ${keys}`);
      });
      console.log('');
    } else {
      console.log(`✗ ${collName} - NOT FOUND`);
    }
  }

  await client.close();
}

verifyCollections()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
