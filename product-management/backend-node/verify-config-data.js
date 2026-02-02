const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'ai_platform';
const HEALTHCARE_VA_PRODUCT_ID = '69728bdb0959e1a2da517684';

async function verifyConfigData() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(DB_NAME);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('VERIFYING CONFIGURATION DATA');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // 1. Check assistant_channels collection
    console.log('📋 STEP 1: ASSISTANT CHANNELS');
    console.log('─────────────────────────────────────────────────────────');
    
    const channelsCount = await db.collection('assistant_channels').countDocuments();
    console.log(`Total assistant_channels: ${channelsCount}\n`);
    
    if (channelsCount === 0) {
      console.log('⚠️  WARNING: No assistant channels found!\n');
    } else {
      const channels = await db.collection('assistant_channels').find({}).limit(10).toArray();
      
      channels.forEach(channel => {
        console.log(`  Channel ID: ${channel._id}`);
        console.log(`  Name: ${channel.name || 'N/A'}`);
        console.log(`  Product ID: ${channel.productId || 'N/A'}`);
        console.log(`  Tenant ID: ${channel.tenantId || 'N/A'}`);
        console.log(`  Type: ${channel.type || 'N/A'}`);
        console.log('');
      });
      
      // Check if any channels exist for Healthcare VA product
      const healthcareChannels = await db.collection('assistant_channels').find({
        productId: new ObjectId(HEALTHCARE_VA_PRODUCT_ID)
      }).toArray();
      
      console.log(`Channels for Healthcare VA product: ${healthcareChannels.length}`);
      if (healthcareChannels.length > 0) {
        healthcareChannels.forEach(ch => {
          console.log(`  - ${ch._id}: ${ch.name || 'Unnamed'} (${ch.type || 'no type'})`);
        });
      }
      console.log('');
    }
    
    // 2. Check prompt_configurations collection
    console.log('📋 STEP 2: PROMPT CONFIGURATIONS');
    console.log('─────────────────────────────────────────────────────────');
    
    const promptsCount = await db.collection('prompt_configurations').countDocuments();
    console.log(`Total prompt_configurations: ${promptsCount}\n`);
    
    if (promptsCount === 0) {
      console.log('⚠️  WARNING: No prompt configurations found!\n');
    } else {
      const prompts = await db.collection('prompt_configurations').find({}).limit(10).toArray();
      
      prompts.forEach(prompt => {
        console.log(`  Prompt ID: ${prompt._id}`);
        console.log(`  Name: ${prompt.name || 'N/A'}`);
        console.log(`  Product ID: ${prompt.productId || 'N/A'}`);
        console.log(`  Tenant ID: ${prompt.tenantId || 'N/A'}`);
        console.log(`  Type: ${prompt.type || 'N/A'}`);
        console.log(`  Version: ${prompt.version || 'N/A'}`);
        console.log('');
      });
      
      // Check if any prompts exist for Healthcare VA product
      const healthcarePrompts = await db.collection('prompt_configurations').find({
        productId: new ObjectId(HEALTHCARE_VA_PRODUCT_ID)
      }).toArray();
      
      console.log(`Prompts for Healthcare VA product: ${healthcarePrompts.length}`);
      if (healthcarePrompts.length > 0) {
        healthcarePrompts.forEach(p => {
          console.log(`  - ${p._id}: ${p.name || 'Unnamed'} (v${p.version || '?'})`);
        });
      }
      console.log('');
    }
    
    // 3. Check channel_configurations collection (alternative name)
    console.log('📋 STEP 3: CHANNEL CONFIGURATIONS (Alternative)');
    console.log('─────────────────────────────────────────────────────────');
    
    const channelConfigsCount = await db.collection('channel_configurations').countDocuments();
    console.log(`Total channel_configurations: ${channelConfigsCount}\n`);
    
    if (channelConfigsCount > 0) {
      const configs = await db.collection('channel_configurations').find({}).limit(5).toArray();
      
      configs.forEach(config => {
        console.log(`  Config ID: ${config._id}`);
        console.log(`  Channel ID: ${config.channelId || 'N/A'}`);
        console.log(`  Product ID: ${config.productId || 'N/A'}`);
        console.log(`  Tenant ID: ${config.tenantId || 'N/A'}`);
        console.log('');
      });
    }
    
    // 4. List all collections to find the right ones
    console.log('📋 STEP 4: ALL COLLECTIONS IN DATABASE');
    console.log('─────────────────────────────────────────────────────────');
    
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name).sort();
    
    console.log('Available collections:');
    collectionNames.forEach(name => {
      console.log(`  - ${name}`);
    });
    console.log('');
    
    // 5. Check for collections with "channel" or "prompt" in the name
    console.log('📋 STEP 5: COLLECTIONS WITH CHANNEL/PROMPT DATA');
    console.log('─────────────────────────────────────────────────────────');
    
    const relevantCollections = collectionNames.filter(name => 
      name.toLowerCase().includes('channel') || 
      name.toLowerCase().includes('prompt') ||
      name.toLowerCase().includes('config')
    );
    
    for (const collName of relevantCollections) {
      const count = await db.collection(collName).countDocuments();
      console.log(`  ${collName}: ${count} document(s)`);
      
      if (count > 0 && count <= 5) {
        const samples = await db.collection(collName).find({}).limit(2).toArray();
        samples.forEach(doc => {
          console.log(`    Sample ID: ${doc._id}`);
          console.log(`    Keys: ${Object.keys(doc).join(', ')}`);
        });
      }
    }
    console.log('');
    
    // 6. Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    let issues = [];
    
    if (channelsCount === 0) {
      issues.push('❌ No assistant channels found in database');
    } else {
      const healthcareChannels = await db.collection('assistant_channels').find({
        productId: new ObjectId(HEALTHCARE_VA_PRODUCT_ID)
      }).countDocuments();
      
      if (healthcareChannels === 0) {
        issues.push('⚠️  No channels configured for Healthcare VA product');
      } else {
        console.log(`✅ Healthcare VA has ${healthcareChannels} channel(s)`);
      }
    }
    
    if (promptsCount === 0) {
      issues.push('❌ No prompt configurations found in database');
    } else {
      const healthcarePrompts = await db.collection('prompt_configurations').find({
        productId: new ObjectId(HEALTHCARE_VA_PRODUCT_ID)
      }).countDocuments();
      
      if (healthcarePrompts === 0) {
        issues.push('⚠️  No prompts configured for Healthcare VA product');
      } else {
        console.log(`✅ Healthcare VA has ${healthcarePrompts} prompt(s)`);
      }
    }
    
    if (issues.length > 0) {
      console.log('\nISSUES FOUND:');
      issues.forEach(issue => console.log(`  ${issue}`));
      console.log('\n💡 RECOMMENDATION: Run seed scripts to populate configuration data');
    } else {
      console.log('\n✅ Configuration data looks good!');
    }
    
    console.log('\n═══════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
}

// Run verification
verifyConfigData()
  .then(() => {
    console.log('\n✅ Verification complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Verification failed:', err);
    process.exit(1);
  });
