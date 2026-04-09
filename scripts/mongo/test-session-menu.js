/**
 * Test Session Menu Dynamic Loading
 *
 * This script verifies that:
 * 1. Tenant prompt bindings exist
 * 2. Production prompts are available
 * 3. Menu options are generated correctly
 */

const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'ai_platform'; // Master database - ai-services has been deleted

async function testSessionMenu() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DB_NAME);

    // Test parameters
    const tenantId = 'tenant-default';
    const productId = 'va-service';
    const channelType = 'chat';

    console.log('🔍 Test Parameters:');
    console.log(`   Tenant ID: ${tenantId}`);
    console.log(`   Product ID: ${productId}`);
    console.log(`   Channel Type: ${channelType}\n`);

    // Step 1: Check for products
    console.log('📦 Step 1: Looking for products...');
    const products = await db.collection('products').find({}).toArray();
    console.log(`   Found ${products.length} products:`);
    products.forEach(p => {
      console.log(`   - ${p.productId} (${p._id})`);
    });

    // Find the actual product ObjectId for va-service
    const product = products.find(p => p.productId === productId);
    if (!product) {
      console.log(`   ❌ Product '${productId}' not found!`);
      return;
    }
    const productObjectId = product._id;
    console.log(`   ✅ Using product ObjectId: ${productObjectId}\n`);

    // Step 2: Check for tenant prompt bindings
    console.log('🔗 Step 2: Looking for tenant prompt bindings...');
    const bindings = await db.collection('tenant_prompt_bindings').find({
      tenantId,
      productId: productObjectId,
      channelType
    }).toArray();

    console.log(`   Found ${bindings.length} bindings for this tenant+product+channel:`);
    bindings.forEach(b => {
      console.log(`   - Binding ID: ${b._id}`);
      console.log(`     Active Production: ${b.activeProductionId || 'None'}`);
      console.log(`     Current Draft: ${b.currentDraftId || 'None'}`);
    });

    if (bindings.length === 0) {
      console.log(`   ❌ No tenant prompt bindings found!`);
      console.log(`   💡 Create bindings by pulling prompts in the Tenant Prompts UI\n`);
      return;
    }

    // Step 3: Collect production prompt IDs
    console.log('\n📋 Step 3: Collecting production prompt IDs...');
    const productionPromptIds = bindings
      .filter(b => b.activeProductionId)
      .map(b => b.activeProductionId);

    console.log(`   Found ${productionPromptIds.length} production prompts:`);
    productionPromptIds.forEach(id => console.log(`   - ${id}`));

    if (productionPromptIds.length === 0) {
      console.log(`   ❌ No production prompts found!`);
      console.log(`   💡 Promote prompts to production in the Tenant Prompts UI\n`);
      return;
    }

    // Step 4: Fetch actual prompt versions
    console.log('\n📝 Step 4: Fetching prompt versions...');
    const prompts = await db.collection('prompt_versions').find({
      _id: { $in: productionPromptIds },
      state: 'production',
      isActive: true,
      isDeleted: { $ne: true }
    }).toArray();

    console.log(`   Found ${prompts.length} active production prompts:`);
    prompts.forEach((p, idx) => {
      console.log(`   ${idx + 1}. ${p.name}`);
      console.log(`      ID: ${p._id}`);
      console.log(`      Icon: ${p.icon || '💬'}`);
      console.log(`      Version: ${p.version}`);
      console.log(`      State: ${p.state}`);
      console.log(`      Channel: ${p.channelType}`);
    });

    if (prompts.length === 0) {
      console.log(`   ❌ No active production prompts found in database!`);
      console.log(`   💡 Check that prompts have state='production' and isActive=true\n`);
      return;
    }

    // Step 5: Generate menu options (simulating MenuService logic)
    console.log('\n🎯 Step 5: Generating menu options...');
    const menuOptions = prompts.map((prompt, index) => ({
      id: prompt._id.toString(),
      text: prompt.name,
      value: prompt.name,
      icon: prompt.icon || '💬',
      dtmfKey: (index + 1).toString()
    }));

    console.log(`   Generated ${menuOptions.length} menu options:\n`);
    menuOptions.forEach((opt, idx) => {
      console.log(`   Option ${idx + 1}:`);
      console.log(`      ID: ${opt.id}`);
      console.log(`      Text: ${opt.text}`);
      console.log(`      Value: ${opt.value}`);
      console.log(`      Icon: ${opt.icon}`);
      console.log(`      DTMF Key: ${opt.dtmfKey}`);
      console.log();
    });

    // Step 6: Simulate menu config response
    console.log('📤 Step 6: Simulated MenuService.getSessionMenu() response:');
    const menuConfig = {
      enabled: true,
      promptText: 'Select a service:',
      options: menuOptions,
      allowFreeText: false
    };
    console.log(JSON.stringify(menuConfig, null, 2));
    console.log();

    console.log('✅ Session menu test completed successfully!\n');
    console.log('💡 Next steps:');
    console.log('   1. Start the backend: npm start');
    console.log('   2. Open the chat UI');
    console.log('   3. Create a new chat session');
    console.log('   4. You should see the menu options as bubbles\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testSessionMenu();
