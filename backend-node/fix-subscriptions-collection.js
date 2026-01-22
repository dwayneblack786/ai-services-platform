const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'ai_platform';
const TENANT_ID = 'ten-splendor-florida-33064';
const OLD_PRODUCT_ID = '69667c560e03d4f31472dbd3'; // Deleted product
const NEW_PRODUCT_ID = '69728bdb0959e1a2da517684'; // Healthcare VA

async function fixSubscriptionsCollection() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(DB_NAME);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('FIXING SUBSCRIPTIONS COLLECTION');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Find subscriptions with old product ID
    const oldSubs = await db.collection('subscriptions').find({
      tenantId: TENANT_ID,
      productId: new ObjectId(OLD_PRODUCT_ID)
    }).toArray();
    
    console.log(`Found ${oldSubs.length} subscription(s) with old product ID\n`);
    
    for (const sub of oldSubs) {
      console.log(`Fixing subscription ${sub._id}:`);
      console.log(`  Tenant ID: ${sub.tenantId}`);
      console.log(`  Old Product ID: ${sub.productId}`);
      console.log(`  New Product ID: ${NEW_PRODUCT_ID}`);
      console.log(`  Status: ${sub.status}`);
      
      await db.collection('subscriptions').updateOne(
        { _id: sub._id },
        {
          $set: {
            productId: new ObjectId(NEW_PRODUCT_ID),
            updatedAt: new Date()
          }
        }
      );
      
      console.log(`  ✅ Updated\n`);
    }
    
    // Verification
    console.log('═══════════════════════════════════════════════════════════');
    console.log('VERIFICATION');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const tenantSubs = await db.collection('subscriptions').find({
      tenantId: TENANT_ID
    }).toArray();
    
    console.log(`📋 Subscriptions for ${TENANT_ID}: ${tenantSubs.length}\n`);
    
    tenantSubs.forEach(sub => {
      const productIcon = sub.productId.toString() === NEW_PRODUCT_ID ? '✅' : '❌';
      const statusIcon = sub.status === 'active' ? '✅' : '⚠️';
      console.log(`${productIcon} ${statusIcon} ${sub._id}`);
      console.log(`   Product ID: ${sub.productId}`);
      console.log(`   Status: ${sub.status}`);
      console.log('');
    });
    
    // Get product info
    const product = await db.collection('products').findOne({
      _id: new ObjectId(NEW_PRODUCT_ID)
    });
    
    console.log('📦 Product Info:');
    console.log(`   Name: ${product?.name}`);
    console.log(`   Category: ${product?.category}`);
    console.log('');
    
    const allCorrect = tenantSubs.every(s => 
      s.productId.toString() === NEW_PRODUCT_ID && s.status === 'active'
    );
    
    if (allCorrect) {
      console.log('✅ All subscriptions corrected!');
      console.log('✅ Middleware requireVirtualAssistantSubscription should now pass');
    } else {
      console.log('⚠️  Some subscriptions still need fixing');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n✅ MongoDB connection closed');
  }
}

fixSubscriptionsCollection()
  .then(() => {
    console.log('\n✅ Fix complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Fix failed:', err);
    process.exit(1);
  });
