/**
 * Inspect MongoDB Collections
 * Shows what data exists in the database
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'ai_platform'; // Master database - ai-services has been deleted

async function inspectCollections() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DB_NAME);

    // List all collections
    const collections = await db.listCollections().toArray();
    console.log(`📚 Found ${collections.length} collections:\n`);

    for (const coll of collections) {
      const name = coll.name;
      const count = await db.collection(name).countDocuments();
      console.log(`   ${name}: ${count} documents`);

      // Show sample document for important collections
      if (['tenant_prompt_bindings', 'prompt_versions', 'assistant_channels', 'products'].includes(name)) {
        const sample = await db.collection(name).findOne({});
        if (sample) {
          console.log(`   Sample keys: ${Object.keys(sample).join(', ')}`);
        }
        console.log();
      }
    }

    // Check assistant_channels specifically
    console.log('\n🔍 Assistant Channels:');
    const channels = await db.collection('assistant_channels').find({}).toArray();
    console.log(`   Found ${channels.length} channels`);
    channels.forEach(ch => {
      console.log(`   - Customer: ${ch.customerId}, Product: ${ch.productId}`);
      console.log(`     Chat enabled: ${ch.chat?.enabled}`);
      console.log(`     Voice enabled: ${ch.voice?.enabled}`);
    });

    // Check tenant_prompt_bindings
    console.log('\n🔗 Tenant Prompt Bindings:');
    const bindings = await db.collection('tenant_prompt_bindings').find({}).toArray();
    console.log(`   Found ${bindings.length} bindings`);
    bindings.forEach(b => {
      console.log(`   - Tenant: ${b.tenantId}, Product: ${b.productId}, Channel: ${b.channelType}`);
      console.log(`     Active Production: ${b.activeProductionId || 'None'}`);
    });

    // Check prompt_versions
    console.log('\n📝 Prompt Versions:');
    const prompts = await db.collection('prompt_versions').find({
      state: 'production',
      isActive: true
    }).toArray();
    console.log(`   Found ${prompts.length} production prompts`);
    prompts.forEach(p => {
      console.log(`   - ${p.name} (${p._id})`);
      console.log(`     Tenant: ${p.tenantId}, Product: ${p.productId}, Channel: ${p.channelType}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

inspectCollections();
