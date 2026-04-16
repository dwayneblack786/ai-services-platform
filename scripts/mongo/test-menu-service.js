/**
 * Test Menu Service Logic
 * Simulates what the MenuService does when frontend requests menu options
 */

const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'ai_platform'; // Changed from 'ai-services' to match backend

// Test parameters - simulating frontend request
const TEST_CONFIG = {
  tenantId: 'tenant-default',
  productId: '69728bdb0959e1a2da517684',
  channelType: 'chat'
};

async function testMenuService() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DB_NAME);

    console.log('🧪 Testing MenuService Logic');
    console.log('═══════════════════════════════════════\n');

    console.log('📋 Test Parameters:');
    console.log('   Tenant ID:', TEST_CONFIG.tenantId);
    console.log('   Product ID:', TEST_CONFIG.productId);
    console.log('   Channel Type:', TEST_CONFIG.channelType);
    console.log();

    // Simulate MenuService.getSessionMenu() logic
    console.log('🔍 Step 1: Convert productId to appropriate format...');

    let productQuery = TEST_CONFIG.productId;
    if (ObjectId.isValid(TEST_CONFIG.productId) && TEST_CONFIG.productId.length === 24) {
      productQuery = new ObjectId(TEST_CONFIG.productId);
      console.log('   ✅ Using ObjectId format:', productQuery);
    } else {
      console.log('   ✅ Using string format:', productQuery);
    }

    console.log('\n🔍 Step 2: Query all production prompts directly...');
    console.log('   (Note: MenuService no longer uses bindings for menu options)');

    const prompts = await db.collection('prompt_versions').find({
      tenantId: TEST_CONFIG.tenantId,
      productId: productQuery,
      channelType: TEST_CONFIG.channelType,
      state: 'production',
      isActive: true,
      isDeleted: { $ne: true }
    }).toArray();

    if (prompts.length === 0) {
      console.log('   ❌ FAIL: No active production prompts found!');
      console.log('   MenuService would return: null');
      return;
    }

    console.log('   ✅ Found', prompts.length, 'active production prompts');
    prompts.forEach((p, idx) => {
      console.log(`      Prompt ${idx + 1}:`);
      console.log('         _id:', p._id);
      console.log('         name:', p.name);
      console.log('         icon:', p.icon || '💬');
      console.log('         state:', p.state);
      console.log('         isActive:', p.isActive);
    });

    console.log('\n🔍 Step 3: Build menu options...');
    const options = prompts.map((prompt, index) => ({
      id: prompt._id.toString(),
      text: prompt.name,
      value: prompt.name,
      icon: prompt.icon || '💬',
      dtmfKey: (index + 1).toString()
    }));

    console.log('   ✅ Built', options.length, 'menu options:');
    options.forEach((opt, idx) => {
      console.log(`      ${idx + 1}. ${opt.icon} ${opt.text}`);
      console.log('         id:', opt.id);
      console.log('         dtmfKey:', opt.dtmfKey);
    });

    console.log('\n🔍 Step 4: Build final MenuConfig response...');
    const menuConfig = {
      enabled: true,
      promptText: 'Select a service:',
      options: options,
      allowFreeText: false
    };

    console.log('   ✅ MenuConfig created successfully!\n');

    console.log('📤 Response that would be sent to frontend:');
    console.log('═══════════════════════════════════════');
    console.log(JSON.stringify(menuConfig, null, 2));
    console.log('═══════════════════════════════════════\n');

    console.log('🎨 Expected Frontend Rendering:');
    console.log('───────────────────────────────────────');
    console.log('   1. Greeting message displays');
    console.log('   2. Blue banner: "Select a service:"');
    console.log('   3. Option bubbles:');
    options.forEach((opt, idx) => {
      console.log(`      [${opt.icon} ${opt.text}]`);
    });
    console.log('   4. Input field disabled with placeholder:');
    console.log('      "Please select an option above..."');
    console.log('───────────────────────────────────────\n');

    console.log('🔄 User Interaction Flow:');
    console.log('───────────────────────────────────────');
    console.log('   1. User clicks option bubble (e.g., "💬 Customer Support Chat")');
    console.log('   2. Option text loads into input field');
    console.log('   3. selectedPromptId stored:', options[0].id);
    console.log('   4. Input field becomes enabled');
    console.log('   5. User presses Ctrl+Enter to submit');
    console.log('   6. Socket emits:');
    console.log('      {');
    console.log('        sessionId: "...",');
    console.log('        message: "Customer Support Chat",');
    console.log('        isMenuSelection: true,');
    console.log('        selectedPromptId:', `"${options[0].id}"`);
    console.log('      }');
    console.log('   7. Backend validates and sends to Java service');
    console.log('───────────────────────────────────────\n');

    console.log('✅ TEST PASSED: Menu system is properly configured!');
    console.log('\n💡 Next Steps:');
    console.log('   1. Start backend: cd ai-product-management/backend-node && npm start');
    console.log('   2. Open frontend chat UI');
    console.log('   3. Initialize chat session with productId:', TEST_CONFIG.productId);
    console.log('   4. Verify', options.length, 'option bubbles appear');

  } catch (error) {
    console.error('❌ TEST FAILED:', error);
    console.error('\nStack trace:', error.stack);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testMenuService();

