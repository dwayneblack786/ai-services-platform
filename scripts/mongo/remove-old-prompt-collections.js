/**
 * Remove Old Prompt Collections
 *
 * This script removes the legacy prompt_templates and assistant_channels collections
 * after verifying that the new PMS collections are in place.
 *
 * Usage: node scripts/mongo/remove-old-prompt-collections.js
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DATABASE_NAME = 'ai_platform';

async function removeOldCollections() {
  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db(DATABASE_NAME);

  console.log('🔍 Checking old prompt collections...\n');

  try {
    // Step 1: Verify new PMS collections exist
    console.log('Step 1: Verifying new PMS collections exist...');
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    const requiredCollections = ['prompt_versions', 'prompt_audit_log', 'prompt_test_results', 'rag_documents'];
    const missingCollections = requiredCollections.filter(name => !collectionNames.includes(name));

    if (missingCollections.length > 0) {
      console.error('❌ ERROR: New PMS collections not found:', missingCollections);
      console.error('Please run setup-database.js first!');
      await client.close();
      process.exit(1);
    }

    console.log('✅ All new PMS collections verified\n');

    // Step 2: Check old collections
    console.log('Step 2: Checking old collections...');
    const oldCollections = ['prompt_templates', 'assistant_channels'];
    const foundOldCollections = oldCollections.filter(name => collectionNames.includes(name));

    if (foundOldCollections.length === 0) {
      console.log('✅ No old collections found - already cleaned up!');
      await client.close();
      return;
    }

    console.log(`Found ${foundOldCollections.length} old collection(s): ${foundOldCollections.join(', ')}\n`);

    // Step 3: Show data counts
    console.log('Step 3: Checking data counts...');
    for (const collName of foundOldCollections) {
      const count = await db.collection(collName).countDocuments();
      console.log(`  - ${collName}: ${count} documents`);

      if (count > 0) {
        // Show sample document
        const sample = await db.collection(collName).findOne({});
        console.log(`    Sample ID: ${sample._id}`);
      }
    }
    console.log('');

    // Step 4: Create backup if data exists
    const hasData = (await Promise.all(
      foundOldCollections.map(name => db.collection(name).countDocuments())
    )).some(count => count > 0);

    if (hasData) {
      console.log('Step 4: Creating backup before deletion...');
      const backupDate = new Date().toISOString().split('T')[0];

      for (const collName of foundOldCollections) {
        const count = await db.collection(collName).countDocuments();
        if (count > 0) {
          const backupName = `${collName}_backup_${backupDate}`;

          // Check if backup already exists
          if (collectionNames.includes(backupName)) {
            console.log(`  ⚠️  Backup ${backupName} already exists - skipping`);
          } else {
            const data = await db.collection(collName).find({}).toArray();
            await db.collection(backupName).insertMany(data);
            console.log(`  ✅ Backed up ${count} documents to ${backupName}`);
          }
        }
      }
      console.log('');
    }

    // Step 5: Delete old collections
    console.log('Step 5: Deleting old collections...');
    for (const collName of foundOldCollections) {
      await db.collection(collName).drop();
      console.log(`  ✅ Deleted ${collName}`);
    }
    console.log('');

    // Step 6: Verify deletion
    console.log('Step 6: Verifying deletion...');
    const updatedCollections = await db.listCollections().toArray();
    const updatedNames = updatedCollections.map(c => c.name);

    const stillExists = oldCollections.filter(name => updatedNames.includes(name));
    if (stillExists.length > 0) {
      console.error('❌ ERROR: Some collections still exist:', stillExists);
    } else {
      console.log('✅ All old collections successfully deleted\n');
    }

    // Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Old Collection Cleanup Complete!\n');
    console.log('Removed collections:');
    foundOldCollections.forEach(name => console.log(`  - ${name}`));
    console.log('\nNew PMS collections active:');
    requiredCollections.forEach(name => console.log(`  ✓ ${name}`));
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
  }
}

removeOldCollections()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
