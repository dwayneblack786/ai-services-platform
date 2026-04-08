/**
 * Drop ai-services Database
 * WARNING: This permanently deletes the ai-services database
 * Only run after consolidate-ai-services.js has completed successfully
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_TO_DROP = 'ai-services';

async function dropDatabase() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    // List all databases before deletion
    const adminDb = client.db().admin();
    const dbListBefore = await adminDb.listDatabases();

    console.log('📚 Current databases:');
    dbListBefore.databases.forEach(db => {
      console.log(`  - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });

    // Check if ai-services exists
    const aiServicesExists = dbListBefore.databases.some(db => db.name === DB_TO_DROP);

    if (!aiServicesExists) {
      console.log(`\n✅ Database "${DB_TO_DROP}" does not exist. Nothing to delete.`);
      return;
    }

    // Confirm deletion
    console.log(`\n⚠️  WARNING: About to delete database "${DB_TO_DROP}"`);
    console.log('   This action cannot be undone.');
    console.log('   Ensure you have run consolidate-ai-services.js first.\n');

    // Drop the database
    const db = client.db(DB_TO_DROP);
    await db.dropDatabase();

    console.log(`✅ Database "${DB_TO_DROP}" has been deleted.\n`);

    // Verify deletion
    const dbListAfter = await adminDb.listDatabases();
    const stillExists = dbListAfter.databases.some(db => db.name === DB_TO_DROP);

    if (stillExists) {
      console.log('❌ Error: Database still exists after deletion attempt.');
    } else {
      console.log('✅ Verification: Database successfully removed.\n');
      console.log('📚 Remaining databases:');
      dbListAfter.databases.forEach(db => {
        console.log(`  - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

dropDatabase();
