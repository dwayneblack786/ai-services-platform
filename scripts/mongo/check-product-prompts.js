/**
 * Check Product Prompts Configuration
 * Verifies prompts and bindings for a specific product
 */

const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'ai_platform'; // Changed from 'ai-services' to match backend
const PRODUCT_ID = '69728bdb0959e1a2da517684';

async function checkDatabase() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DB_NAME);

    // 1. Check if product exists
    console.log('🔍 Step 1: Checking if product exists...');
    const product = await db.collection('products').findOne({
      _id: new ObjectId(PRODUCT_ID)
    });

    if (product) {
      console.log('   ✅ Product found:');
      console.log('      _id:', product._id);
      console.log('      productId:', product.productId);
      console.log('      name:', product.name || 'N/A');
    } else {
      console.log('   ❌ Product NOT found with _id:', PRODUCT_ID);

      // Try to find by productId field
      const productByProductId = await db.collection('products').findOne({
        productId: PRODUCT_ID
      });
      if (productByProductId) {
        console.log('   ✅ Found product by productId field:');
        console.log('      _id:', productByProductId._id);
        console.log('      productId:', productByProductId.productId);
      }
    }

    console.log('\n🔍 Step 2: Checking tenant_prompt_bindings...');

    // Try with ObjectId
    let bindings = await db.collection('tenant_prompt_bindings').find({
      productId: new ObjectId(PRODUCT_ID)
    }).toArray();

    console.log('   Bindings with ObjectId productId:', bindings.length);

    // Try with string
    const bindingsString = await db.collection('tenant_prompt_bindings').find({
      productId: PRODUCT_ID
    }).toArray();

    console.log('   Bindings with string productId:', bindingsString.length);

    bindings = bindings.concat(bindingsString);

    if (bindings.length > 0) {
      console.log('   ✅ Found', bindings.length, 'bindings:');
      bindings.forEach((b, idx) => {
        console.log('      Binding', idx + 1 + ':');
        console.log('         _id:', b._id);
        console.log('         tenantId:', b.tenantId);
        console.log('         productId:', b.productId);
        console.log('         channelType:', b.channelType);
        console.log('         activeProductionId:', b.activeProductionId || 'None');
        console.log('         currentDraftId:', b.currentDraftId || 'None');
      });
    } else {
      console.log('   ❌ No tenant_prompt_bindings found for this product');
    }

    console.log('\n🔍 Step 3: Checking prompt_versions linked to bindings...');

    if (bindings.length > 0) {
      const productionPromptIds = bindings
        .filter(b => b.activeProductionId)
        .map(b => b.activeProductionId);

      if (productionPromptIds.length > 0) {
        const prompts = await db.collection('prompt_versions').find({
          _id: { $in: productionPromptIds }
        }).toArray();

        console.log('   ✅ Found', prompts.length, 'prompt versions:');
        prompts.forEach((p, idx) => {
          console.log('      Prompt', idx + 1 + ':');
          console.log('         _id:', p._id);
          console.log('         name:', p.name);
          console.log('         channelType:', p.channelType);
          console.log('         state:', p.state);
          console.log('         isActive:', p.isActive);
          console.log('         tenantId:', p.tenantId);
          console.log('         productId:', p.productId);
        });
      } else {
        console.log('   ⚠️  No activeProductionId set in bindings');
      }
    }

    // Check all prompt_versions for this product
    console.log('\n🔍 Step 4: Checking all prompt_versions for this product...');
    const allPromptsObjectId = await db.collection('prompt_versions').find({
      productId: new ObjectId(PRODUCT_ID)
    }).toArray();

    const allPromptsString = await db.collection('prompt_versions').find({
      productId: PRODUCT_ID
    }).toArray();

    const allPrompts = allPromptsObjectId.concat(allPromptsString);

    console.log('   Total prompts for this product:', allPrompts.length);
    if (allPrompts.length > 0) {
      allPrompts.forEach((p, idx) => {
        console.log('      Prompt', idx + 1 + ':');
        console.log('         _id:', p._id);
        console.log('         name:', p.name);
        console.log('         channelType:', p.channelType);
        console.log('         state:', p.state);
        console.log('         isActive:', p.isActive);
        console.log('         isDeleted:', p.isDeleted || false);
      });
    }

    // Summary and recommendations
    console.log('\n📊 Summary:');
    console.log('   Product ID:', PRODUCT_ID);
    console.log('   Bindings found:', bindings.length);
    console.log('   Total prompts found:', allPrompts.length);
    console.log('   Expected: 2 chat prompts, 1 voice prompt');
    console.log();

    if (allPrompts.length === 0) {
      console.log('⚠️  ISSUE: No prompts found for this product!');
      console.log('   Action needed: Create prompts in the Prompt Management UI');
    } else if (bindings.length === 0) {
      console.log('⚠️  ISSUE: Prompts exist but no tenant_prompt_bindings!');
      console.log('   Action needed: Pull prompts in the Tenant Prompts UI');
    } else {
      const chatBindings = bindings.filter(b => b.channelType === 'chat');
      const voiceBindings = bindings.filter(b => b.channelType === 'voice');

      console.log('   Chat bindings:', chatBindings.length);
      console.log('   Voice bindings:', voiceBindings.length);

      const activeChat = chatBindings.filter(b => b.activeProductionId).length;
      const activeVoice = voiceBindings.filter(b => b.activeProductionId).length;

      console.log('   Active production chat prompts:', activeChat);
      console.log('   Active production voice prompts:', activeVoice);

      if (activeChat === 0 || activeVoice === 0) {
        console.log('\n⚠️  ISSUE: Some bindings exist but no activeProductionId set!');
        console.log('   Action needed: Promote prompts to production in Tenant Prompts UI');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkDatabase();
