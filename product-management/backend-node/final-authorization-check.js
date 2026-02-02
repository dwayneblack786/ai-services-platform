const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'ai_platform';
const TENANT_ID = 'ten-splendor-florida-33064';
const USER_ID = '6952bf9a6b897da7649318b2';
const PRODUCT_ID = '69728bdb0959e1a2da517684';

async function finalVerification() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    
    const db = client.db(DB_NAME);
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('FINAL AUTHORIZATION VERIFICATION');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // 1. Check User
    const user = await db.collection('users').findOne({ _id: new ObjectId(USER_ID) });
    console.log('👤 USER CHECK');
    console.log('   Email:', user?.email);
    console.log('   Role:', user?.role);
    console.log('   Tenant:', user?.tenantId);
    console.log('   ✅ User exists:', !!user);
    console.log('');
    
    // 2. Check Subscription
    const subscription = await db.collection('product_subscriptions').findOne({
      tenantId: TENANT_ID,
      productId: new ObjectId(PRODUCT_ID)
    });
    console.log('📋 SUBSCRIPTION CHECK (requireVirtualAssistantSubscription)');
    console.log('   Subscription ID:', subscription?._id);
    console.log('   Status:', subscription?.status);
    console.log('   Product ID:', subscription?.productId);
    const hasActiveSubscription = subscription?.status === 'active';
    console.log(hasActiveSubscription ? '   ✅' : '   ❌', 'Has active subscription:', hasActiveSubscription);
    console.log('');
    
    // 3. Check User Product Access
    const userProduct = await db.collection('user_products').findOne({
      userId: new ObjectId(USER_ID),
      productId: new ObjectId(PRODUCT_ID)
    });
    console.log('🔑 USER PRODUCT ACCESS CHECK (requireProductAccess)');
    console.log('   User Product ID:', userProduct?._id);
    console.log('   Status:', userProduct?.status);
    console.log('   Product ID:', userProduct?.productId);
    console.log('   User ID:', userProduct?.userId);
    const hasActiveUserProduct = userProduct?.status === 'active';
    console.log(hasActiveUserProduct ? '   ✅' : '   ❌', 'Has active user_product:', hasActiveUserProduct);
    console.log('');
    
    // 4. Check Assistant Channel Data
    const channel = await db.collection('assistant_channels').findOne({
      tenantId: TENANT_ID,
      productId: new ObjectId(PRODUCT_ID)
    });
    console.log('📡 ASSISTANT CHANNEL DATA');
    console.log('   Channel ID:', channel?._id);
    console.log('   Voice enabled:', channel?.voice?.enabled);
    console.log('   Chat enabled:', channel?.chat?.enabled);
    const hasChannelData = !!channel;
    console.log(hasChannelData ? '   ✅' : '   ❌', 'Channel data exists:', hasChannelData);
    console.log('');
    
    // Final Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('AUTHORIZATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const allChecksPass = !!user && hasActiveSubscription && hasActiveUserProduct && hasChannelData;
    
    if (allChecksPass) {
      console.log('✅ ALL CHECKS PASSED!');
      console.log('');
      console.log('The assistant-channels API endpoint should now work:');
      console.log('   GET /api/assistant-channels/' + PRODUCT_ID);
      console.log('');
      console.log('NEXT STEPS:');
      console.log('1. Refresh the browser page (Ctrl+Shift+R / Cmd+Shift+R)');
      console.log('2. If still showing 403, log out and log back in');
      console.log('3. Navigate to: /products/' + PRODUCT_ID + '/configure');
      console.log('4. Click on "Assistant Channels" tab');
      console.log('5. Data should now display correctly');
      console.log('');
    } else {
      console.log('❌ SOME CHECKS FAILED\n');
      if (!user) console.log('   - User not found');
      if (!hasActiveSubscription) console.log('   - No active subscription');
      if (!hasActiveUserProduct) console.log('   - No active user_product');
      if (!hasChannelData) console.log('   - No channel data');
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
  }
}

finalVerification()
  .then(() => {
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Verification failed:', err);
    process.exit(1);
  });
