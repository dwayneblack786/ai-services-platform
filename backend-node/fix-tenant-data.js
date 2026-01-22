const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'ai_platform';
const TARGET_TENANT = 'ten-splendor-florida-33064';
const VALID_USER_ID = '6952bf9a6b897da7649318b2'; // Dwayne Black
const TEMP_USER_ID = 'local-1767030682932-zh8bsw9ld'; // Temporary/local user

async function fixTenantData() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(DB_NAME);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`FIXING DATA FOR TENANT: ${TARGET_TENANT}`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Get the subscription
    const subscription = await db.collection('product_subscriptions').findOne({
      tenantId: TARGET_TENANT
    });
    
    if (!subscription) {
      console.log('❌ No subscription found for tenant');
      return;
    }
    
    console.log('📋 Current Subscription:');
    console.log(`  ID: ${subscription._id}`);
    console.log(`  User ID: ${subscription.userId}`);
    console.log(`  Product ID: ${subscription.productId}`);
    console.log(`  Tenant ID: ${subscription.tenantId}`);
    console.log(`  Status: ${subscription.status}\n`);
    
    // Verify product exists
    const product = await db.collection('products').findOne({
      _id: new ObjectId(subscription.productId)
    });
    
    if (!product) {
      console.log('❌ Product not found! Cannot proceed.\n');
      return;
    }
    
    console.log('✅ Product Found:');
    console.log(`  Name: ${product.name}`);
    console.log(`  Category: ${product.category}\n`);
    
    // STEP 1: Update subscription userId if it's the temp user
    if (subscription.userId === TEMP_USER_ID) {
      console.log('📝 STEP 1: Updating subscription userId');
      console.log(`  From: ${TEMP_USER_ID}`);
      console.log(`  To: ${VALID_USER_ID}`);
      
      const updateResult = await db.collection('product_subscriptions').updateOne(
        { _id: new ObjectId(subscription._id) },
        { 
          $set: { 
            userId: new ObjectId(VALID_USER_ID),
            updatedAt: new Date()
          } 
        }
      );
      
      console.log(`  ✅ Updated ${updateResult.modifiedCount} subscription(s)\n`);
    } else {
      console.log('✅ STEP 1: Subscription userId is already correct\n');
    }
    
    // STEP 2: Clean up orphaned user_products with invalid products
    console.log('📝 STEP 2: Removing orphaned user_products with invalid products');
    
    const orphanedUserProducts = await db.collection('user_products').find({
      tenantId: TARGET_TENANT,
      productId: { 
        $in: [
          new ObjectId('69529a104cf7ea179161a1fa'),
          new ObjectId('69667c560e03d4f31472dbd3')
        ]
      }
    }).toArray();
    
    console.log(`  Found ${orphanedUserProducts.length} orphaned user_product(s)`);
    
    for (const up of orphanedUserProducts) {
      console.log(`  Removing: ${up._id} (Product: ${up.productId})`);
      await db.collection('user_products').deleteOne({ _id: up._id });
    }
    
    console.log(`  ✅ Removed ${orphanedUserProducts.length} orphaned record(s)\n`);
    
    // STEP 3: Update or create user_product for the subscription
    console.log('📝 STEP 3: Ensuring user_product exists for subscription');
    
    const existingUserProduct = await db.collection('user_products').findOne({
      userId: new ObjectId(VALID_USER_ID),
      productId: new ObjectId(subscription.productId),
      tenantId: TARGET_TENANT
    });
    
    if (existingUserProduct) {
      console.log(`  ✅ User product already exists: ${existingUserProduct._id}\n`);
    } else {
      // Check if there's one with the temp user ID
      const tempUserProduct = await db.collection('user_products').findOne({
        userId: TEMP_USER_ID,
        productId: new ObjectId(subscription.productId),
        tenantId: TARGET_TENANT
      });
      
      if (tempUserProduct) {
        console.log(`  Updating temp user_product ${tempUserProduct._id}`);
        console.log(`  From userId: ${TEMP_USER_ID}`);
        console.log(`  To userId: ${VALID_USER_ID}`);
        
        await db.collection('user_products').updateOne(
          { _id: tempUserProduct._id },
          { 
            $set: { 
              userId: new ObjectId(VALID_USER_ID),
              updatedAt: new Date()
            } 
          }
        );
        
        console.log(`  ✅ Updated user_product\n`);
      } else {
        console.log(`  Creating new user_product`);
        
        const newUserProduct = {
          _id: new ObjectId(),
          userId: new ObjectId(VALID_USER_ID),
          productId: new ObjectId(subscription.productId),
          tenantId: TARGET_TENANT,
          status: 'active',
          accessLevel: 'full',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await db.collection('user_products').insertOne(newUserProduct);
        console.log(`  ✅ Created user_product: ${newUserProduct._id}\n`);
      }
    }
    
    // STEP 4: Verification
    console.log('═══════════════════════════════════════════════════════════');
    console.log('VERIFICATION');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Check subscription
    const updatedSubscription = await db.collection('product_subscriptions').findOne({
      tenantId: TARGET_TENANT
    });
    
    console.log('📋 Subscription:');
    console.log(`  ID: ${updatedSubscription._id}`);
    console.log(`  User ID: ${updatedSubscription.userId}`);
    console.log(`  Product ID: ${updatedSubscription.productId}`);
    console.log(`  Tenant ID: ${updatedSubscription.tenantId}`);
    console.log(`  Status: ${updatedSubscription.status}\n`);
    
    // Check user_products
    const userProducts = await db.collection('user_products').find({
      tenantId: TARGET_TENANT
    }).toArray();
    
    console.log(`📋 User Products: ${userProducts.length}`);
    for (const up of userProducts) {
      // Handle both ObjectId and string types for productId
      let prod = null;
      try {
        const productQuery = typeof up.productId === 'string' && up.productId.length === 24
          ? { _id: new ObjectId(up.productId) } 
          : { _id: up.productId };
        prod = await db.collection('products').findOne(productQuery);
      } catch (err) {
        console.log(`  ⚠️  Invalid productId format: ${up.productId}`);
      }
      
      // Handle both ObjectId and string types for userId
      let user = null;
      try {
        if (typeof up.userId === 'string') {
          // String userId - could be valid ObjectId string or temp ID
          if (up.userId.length === 24 && /^[0-9a-fA-F]{24}$/.test(up.userId)) {
            user = await db.collection('users').findOne({ _id: new ObjectId(up.userId) });
          } else {
            // Not a valid ObjectId format, just mark as not found
            console.log(`  ⚠️  Non-ObjectId userId (temp/dev): ${up.userId}`);
          }
        } else {
          // Already an ObjectId
          user = await db.collection('users').findOne({ _id: up.userId });
        }
      } catch (err) {
        console.log(`  ⚠️  Invalid userId format: ${up.userId}`);
      }
      
      console.log(`  ID: ${up._id}`);
      console.log(`  User: ${user ? user.email : `❌ NOT FOUND (ID: ${up.userId})`}`);
      console.log(`  Product: ${prod ? prod.name : `❌ NOT FOUND (ID: ${up.productId})`}`);
      console.log(`  Tenant: ${up.tenantId}`);
      console.log('');
    }
    
    // Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const validUserProducts = userProducts.filter(up => 
      up.userId.toString() === VALID_USER_ID &&
      up.productId.toString() === subscription.productId.toString()
    );
    
    if (validUserProducts.length > 0 && 
        updatedSubscription.userId.toString() === VALID_USER_ID &&
        updatedSubscription.productId === subscription.productId) {
      console.log('✅ ALL DATA PROPERLY LINKED!');
      console.log(`✅ Subscription ${updatedSubscription._id} → User ${VALID_USER_ID} → Product ${subscription.productId}`);
      console.log(`✅ User Product ${validUserProducts[0]._id} → Same linkage`);
      console.log(`✅ All records belong to tenant ${TARGET_TENANT}\n`);
    } else {
      console.log('⚠️  Some issues remain. Please review above.\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
}

// Run fix
fixTenantData()
  .then(() => {
    console.log('\n✅ Fix complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Fix failed:', err);
    process.exit(1);
  });
