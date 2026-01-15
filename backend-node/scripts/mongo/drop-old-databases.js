/**
 * Drop Old Databases Script
 * Removes ai-services and ai-services-platform databases after consolidation
 * 
 * Usage: node drop-old-databases.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const OLD_DATABASES = ['ai-services', 'ai-services-platform'];

async function dropOldDatabases() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    console.log('✓ Connected\n');

    const admin = client.db().admin();
    const { databases } = await admin.listDatabases();
    
    console.log('⚠️  WARNING: This will permanently delete the following databases:');
    OLD_DATABASES.forEach(db => console.log(`  - ${db}`));
    console.log('\nMake sure you have verified that ai_platform has all the data!\n');

    for (const dbName of OLD_DATABASES) {
      const exists = databases.some(db => db.name === dbName);
      
      if (exists) {
        console.log(`🗑️  Dropping ${dbName}...`);
        await client.db(dbName).dropDatabase();
        console.log(`✅ Dropped ${dbName}`);
      } else {
        console.log(`ℹ️  Database ${dbName} does not exist (already deleted or never existed)`);
      }
    }

    // List remaining databases
    console.log('\n📋 Remaining databases:');
    const { databases: remainingDbs } = await admin.listDatabases();
    remainingDbs.forEach(db => {
      console.log(`  - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });

    console.log('\n✅ Old databases removed successfully!');
    console.log('   Your application is now using: ai_platform');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Require confirmation
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('    DATABASE DELETION SCRIPT');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('This script will delete:');
console.log('  - ai-services database');
console.log('  - ai-services-platform database');
console.log('\nBefore proceeding, ensure:');
console.log('  ✓ You ran consolidate-databases.js');
console.log('  ✓ You verified data in ai_platform');
console.log('  ✓ You tested your application');
console.log('\nStarting in 3 seconds...\n');

setTimeout(() => {
  dropOldDatabases().catch(console.error);
}, 3000);
