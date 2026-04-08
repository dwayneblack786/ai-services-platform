/**
 * Database Consolidation Script
 * Merges unique data from ai-services into ai_platform and backs up ai-services
 */

const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const SOURCE_DB = 'ai-services';
const TARGET_DB = 'ai_platform';

async function consolidateDatabases() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const sourceDb = client.db(SOURCE_DB);
    const targetDb = client.db(TARGET_DB);

    // Step 1: Compare and analyze
    console.log('📊 Step 1: Analyzing databases...\n');

    const sourcePrompts = await sourceDb.collection('prompt_versions')
      .find({ state: 'production', isActive: true })
      .toArray();

    const targetPrompts = await targetDb.collection('prompt_versions')
      .find({ state: 'production', isActive: true })
      .toArray();

    console.log(`Source (${SOURCE_DB}): ${sourcePrompts.length} production prompts`);
    sourcePrompts.forEach(p => {
      console.log(`  - ${p.name} (productId: ${p.productId}, channel: ${p.channelType})`);
    });

    console.log(`\nTarget (${TARGET_DB}): ${targetPrompts.length} production prompts`);
    targetPrompts.forEach(p => {
      console.log(`  - ${p.name} (productId: ${p.productId}, channel: ${p.channelType})`);
    });

    // Step 2: Identify unique prompts
    console.log('\n🔍 Step 2: Identifying unique prompts in source...\n');

    const uniquePrompts = [];
    for (const sourcePrompt of sourcePrompts) {
      const isDuplicate = targetPrompts.some(targetPrompt =>
        targetPrompt.name === sourcePrompt.name &&
        targetPrompt.channelType === sourcePrompt.channelType &&
        targetPrompt.productId?.toString() === sourcePrompt.productId?.toString()
      );

      if (!isDuplicate) {
        uniquePrompts.push(sourcePrompt);
        console.log(`  ✓ Unique: ${sourcePrompt.name} (${sourcePrompt.channelType})`);
      }
    }

    if (uniquePrompts.length === 0) {
      console.log('  ℹ️  No unique prompts found. All data already exists in ai_platform.');
    } else {
      console.log(`\n  Found ${uniquePrompts.length} unique prompts to merge.`);
    }

    // Step 3: Merge unique data
    if (uniquePrompts.length > 0) {
      console.log('\n📥 Step 3: Merging unique prompts to ai_platform...\n');

      for (const prompt of uniquePrompts) {
        // Normalize productId if it's a string
        if (typeof prompt.productId === 'string' && prompt.productId === 'va-service') {
          console.log(`  ⚠️  Converting productId "${prompt.productId}" to ObjectId format...`);
          // Check if product exists in target
          const product = await targetDb.collection('products').findOne({
            name: 'Virtual Assistant Service'
          });
          if (product) {
            prompt.productId = product._id;
            console.log(`  ✓ Mapped to existing product: ${product._id}`);
          }
        }

        // Insert into target database
        await targetDb.collection('prompt_versions').insertOne(prompt);
        console.log(`  ✅ Merged: ${prompt.name}`);
      }
    }

    // Step 4: Check tenant_prompt_bindings
    console.log('\n🔗 Step 4: Checking tenant_prompt_bindings...\n');

    const sourceBindings = await sourceDb.collection('tenant_prompt_bindings').find({}).toArray();
    const targetBindings = await targetDb.collection('tenant_prompt_bindings').find({}).toArray();

    console.log(`Source bindings: ${sourceBindings.length}`);
    console.log(`Target bindings: ${targetBindings.length}`);

    // Step 5: Backup source database
    console.log('\n💾 Step 5: Backing up ai-services database...\n');

    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const backupFile = path.join(backupDir, `ai-services-backup-${timestamp}.json`);

    const backup = {
      timestamp: new Date().toISOString(),
      database: SOURCE_DB,
      collections: {}
    };

    const collectionNames = await sourceDb.listCollections().toArray();
    for (const collInfo of collectionNames) {
      const collName = collInfo.name;
      const data = await sourceDb.collection(collName).find({}).toArray();
      backup.collections[collName] = data;
      console.log(`  ✓ Backed up collection: ${collName} (${data.length} documents)`);
    }

    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    console.log(`\n  ✅ Backup saved to: ${backupFile}`);

    // Step 6: Summary before deletion
    console.log('\n📋 Consolidation Summary:\n');
    console.log(`  Source database: ${SOURCE_DB}`);
    console.log(`  Target database: ${TARGET_DB}`);
    console.log(`  Unique prompts merged: ${uniquePrompts.length}`);
    console.log(`  Backup location: ${backupFile}`);
    console.log(`\n  Ready to delete ${SOURCE_DB} database.`);
    console.log(`  Manual step required: Run drop-ai-services.js to complete deletion.`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

consolidateDatabases();
