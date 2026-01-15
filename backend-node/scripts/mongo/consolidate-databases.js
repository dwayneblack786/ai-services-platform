/**
 * Database Consolidation Script
 * Consolidates ai-services, ai-services-platform, and ai_platform into single ai_platform database
 * 
 * Usage: node consolidate-databases.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const TARGET_DB = 'ai_platform';
const SOURCE_DBS = ['ai-services', 'ai-services-platform'];

// Collections expected in the final database
const EXPECTED_COLLECTIONS = [
  'customers',
  'assistant_channels',
  'assistant_calls',
  'assistant_chats',
  'subscriptions',
  'products',
  'invoices',
  'usage_events',
  'users',
  'api_keys',
  'prompts',
  'payment_methods',
  'transactions'
];

async function consolidateDatabases() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    console.log('✓ Connected\n');

    const admin = client.db().admin();
    const { databases } = await admin.listDatabases();
    
    console.log('📋 Available databases:');
    databases.forEach(db => {
      console.log(`  - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });
    console.log();

    // Check which source databases exist
    const existingSourceDbs = SOURCE_DBS.filter(dbName => 
      databases.some(db => db.name === dbName)
    );

    if (existingSourceDbs.length === 0) {
      console.log('✓ No source databases to consolidate. Target database already in use.');
      return;
    }

    const targetDb = client.db(TARGET_DB);
    const targetCollections = await targetDb.listCollections().toArray();
    const targetCollectionNames = targetCollections.map(c => c.name);

    console.log(`\n📦 Current collections in ${TARGET_DB}:`);
    for (const col of targetCollectionNames) {
      const count = await targetDb.collection(col).countDocuments();
      console.log(`  - ${col}: ${count} documents`);
    }

    // Process each source database
    for (const sourceDbName of existingSourceDbs) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📂 Processing ${sourceDbName}...`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      const sourceDb = client.db(sourceDbName);
      const sourceCollections = await sourceDb.listCollections().toArray();

      if (sourceCollections.length === 0) {
        console.log(`  ℹ️  No collections in ${sourceDbName}`);
        continue;
      }

      for (const collectionInfo of sourceCollections) {
        const collectionName = collectionInfo.name;
        const sourceCollection = sourceDb.collection(collectionName);
        const targetCollection = targetDb.collection(collectionName);

        const sourceCount = await sourceCollection.countDocuments();
        const targetCount = await targetCollection.countDocuments();

        console.log(`\n📄 Collection: ${collectionName}`);
        console.log(`  Source (${sourceDbName}): ${sourceCount} documents`);
        console.log(`  Target (${TARGET_DB}): ${targetCount} documents`);

        if (sourceCount === 0) {
          console.log(`  ⏭️  Skipping empty collection`);
          continue;
        }

        // Get all documents from source
        const documents = await sourceCollection.find({}).toArray();

        if (targetCount === 0) {
          // Target collection is empty, safe to insert all
          console.log(`  ✓ Target empty, migrating all ${sourceCount} documents...`);
          await targetCollection.insertMany(documents);
          console.log(`  ✅ Migrated ${sourceCount} documents`);
        } else {
          // Target has data, need to merge carefully
          console.log(`  ⚠️  Target has data, checking for duplicates...`);
          
          let inserted = 0;
          let skipped = 0;
          let updated = 0;

          for (const doc of documents) {
            const existing = await targetCollection.findOne({ _id: doc._id });
            
            if (!existing) {
              try {
                await targetCollection.insertOne(doc);
                inserted++;
              } catch (error) {
                if (error.code === 11000) {
                  // Duplicate key error - skip this document
                  console.log(`    ⚠️  Skipped duplicate: ${error.keyValue ? JSON.stringify(error.keyValue) : doc._id}`);
                  skipped++;
                } else {
                  throw error;
                }
              }
            } else {
              // Document exists, compare and update if different
              const existingStr = JSON.stringify(existing);
              const docStr = JSON.stringify(doc);
              
              if (existingStr !== docStr) {
                try {
                  await targetCollection.replaceOne({ _id: doc._id }, doc);
                  updated++;
                } catch (error) {
                  if (error.code === 11000) {
                    console.log(`    ⚠️  Cannot update - would create duplicate: ${doc._id}`);
                    skipped++;
                  } else {
                    throw error;
                  }
                }
              } else {
                skipped++;
              }
            }
          }

          console.log(`  ✅ Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}`);
        }

        // Copy indexes
        const indexes = await sourceCollection.indexes();
        console.log(`  📑 Copying ${indexes.length} indexes...`);
        
        for (const index of indexes) {
          if (index.name === '_id_') continue; // Skip default _id index
          
          try {
            const options = {};
            if (index.unique) options.unique = true;
            if (index.sparse) options.sparse = true;
            if (index.name) options.name = index.name;
            
            await targetCollection.createIndex(index.key, options);
            console.log(`    ✓ ${index.name}`);
          } catch (error) {
            if (error.code === 85 || error.code === 86) {
              console.log(`    ℹ️  Index ${index.name} already exists`);
            } else {
              console.log(`    ⚠️  Error creating index ${index.name}: ${error.message}`);
            }
          }
        }
      }
    }

    // Verify final state
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 Final State of ${TARGET_DB}:`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    const finalCollections = await targetDb.listCollections().toArray();
    let totalDocs = 0;

    for (const col of finalCollections) {
      const count = await targetDb.collection(col.name).countDocuments();
      totalDocs += count;
      console.log(`  ${col.name.padEnd(25)} ${count.toString().padStart(6)} documents`);
    }

    console.log(`\n  ${'TOTAL'.padEnd(25)} ${totalDocs.toString().padStart(6)} documents`);

    // Check for missing expected collections
    console.log(`\n🔍 Checking for expected collections...`);
    const missingCollections = EXPECTED_COLLECTIONS.filter(
      name => !finalCollections.some(c => c.name === name)
    );

    if (missingCollections.length > 0) {
      console.log(`\n⚠️  Missing collections (will be created when first used):`);
      missingCollections.forEach(name => console.log(`  - ${name}`));
    } else {
      console.log(`✓ All expected collections present`);
    }

    // Ask for confirmation before deleting
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`⚠️  CLEANUP REQUIRED`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    if (existingSourceDbs.length > 0) {
      console.log(`The following databases should be manually removed after verifying data:`);
      existingSourceDbs.forEach(db => {
        console.log(`  - ${db}`);
      });
      console.log(`\nTo remove them, run:`);
      existingSourceDbs.forEach(db => {
        console.log(`  mongosh ${MONGO_URI}/${db} --eval "db.dropDatabase()"`);
      });
    }

    console.log(`\n✅ Consolidation complete!`);
    console.log(`\nNext steps:`);
    console.log(`1. Verify the data in ${TARGET_DB}`);
    console.log(`2. Test your application`);
    console.log(`3. Drop old databases if everything works correctly`);

  } catch (error) {
    console.error('❌ Error during consolidation:', error);
    throw error;
  } finally {
    await client.close();
    console.log(`\n🔌 Disconnected from MongoDB`);
  }
}

// Run the consolidation
consolidateDatabases().catch(console.error);
