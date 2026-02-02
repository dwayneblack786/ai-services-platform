const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'ai_platform';
const TARGET_TENANT = 'ten-splendor-florida-33064';

async function cleanupOrphanedRecords() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(DB_NAME);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('CLEANING UP ORPHANED USER_PRODUCTS');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Find all user_products for the tenant
    const userProducts = await db.collection('user_products').find({
      tenantId: TARGET_TENANT
    }).toArray();
    
    console.log(`Found ${userProducts.length} user_product(s) for tenant ${TARGET_TENANT}\n`);
    
    const toDelete = [];
    const toKeep = [];
    
    for (const up of userProducts) {
      console.log(`Checking: ${up._id}`);
      console.log(`  User ID: ${up.userId}`);
      console.log(`  Product ID: ${up.productId}`);
      
      // Check if user exists
      let userExists = false;
      try {
        if (typeof up.userId === 'string' && up.userId.length === 24 && /^[0-9a-fA-F]{24}$/.test(up.userId)) {
          userExists = await db.collection('users').findOne({ _id: new ObjectId(up.userId) }) !== null;
        } else if (typeof up.userId === 'object') {
          userExists = await db.collection('users').findOne({ _id: up.userId }) !== null;
        }
      } catch (err) {
        // Invalid ObjectId, user doesn't exist
      }
      
      // Check if product exists
      let productExists = false;
      try {
        if (typeof up.productId === 'string' && up.productId.length === 24) {
          productExists = await db.collection('products').findOne({ _id: new ObjectId(up.productId) }) !== null;
        } else if (typeof up.productId === 'object') {
          productExists = await db.collection('products').findOne({ _id: up.productId }) !== null;
        }
      } catch (err) {
        // Invalid ObjectId, product doesn't exist
      }
      
      if (!userExists || !productExists) {
        console.log(`  ❌ ORPHANED - User exists: ${userExists}, Product exists: ${productExists}`);
        toDelete.push(up);
      } else {
        console.log(`  ✅ VALID - Both user and product exist`);
        toKeep.push(up);
      }
      console.log('');
    }
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`Valid user_products: ${toKeep.length}`);
    console.log(`Orphaned user_products to delete: ${toDelete.length}\n`);
    
    if (toDelete.length > 0) {
      console.log('Orphaned Records:');
      toDelete.forEach(up => {
        console.log(`  - ${up._id}: userId=${up.userId}, productId=${up.productId}`);
      });
      console.log('');
      
      console.log('Deleting orphaned records...');
      const deleteIds = toDelete.map(up => up._id);
      const result = await db.collection('user_products').deleteMany({
        _id: { $in: deleteIds }
      });
      
      console.log(`✅ Deleted ${result.deletedCount} orphaned record(s)\n`);
    } else {
      console.log('✅ No orphaned records found!\n');
    }
    
    // Final verification
    console.log('═══════════════════════════════════════════════════════════');
    console.log('FINAL VERIFICATION');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const remainingUserProducts = await db.collection('user_products').find({
      tenantId: TARGET_TENANT
    }).toArray();
    
    console.log(`Remaining user_products: ${remainingUserProducts.length}`);
    
    for (const up of remainingUserProducts) {
      let user = null;
      let product = null;
      
      try {
        if (typeof up.userId === 'object') {
          user = await db.collection('users').findOne({ _id: up.userId });
        } else if (typeof up.userId === 'string' && up.userId.length === 24 && /^[0-9a-fA-F]{24}$/.test(up.userId)) {
          user = await db.collection('users').findOne({ _id: new ObjectId(up.userId) });
        }
      } catch (err) {}
      
      try {
        if (typeof up.productId === 'object') {
          product = await db.collection('products').findOne({ _id: up.productId });
        } else if (typeof up.productId === 'string' && up.productId.length === 24) {
          product = await db.collection('products').findOne({ _id: new ObjectId(up.productId) });
        }
      } catch (err) {}
      
      console.log(`  ID: ${up._id}`);
      console.log(`  User: ${user ? user.email : 'NOT FOUND'}`);
      console.log(`  Product: ${product ? product.name : 'NOT FOUND'}`);
      console.log(`  Tenant: ${up.tenantId}`);
      console.log('');
    }
    
    const subscription = await db.collection('product_subscriptions').findOne({
      tenantId: TARGET_TENANT
    });
    
    if (subscription) {
      console.log('Subscription:');
      console.log(`  ID: ${subscription._id}`);
      console.log(`  User ID: ${subscription.userId}`);
      console.log(`  Product ID: ${subscription.productId}`);
      console.log(`  Status: ${subscription.status}\n`);
      
      const matchingUserProduct = remainingUserProducts.find(up => 
        up.userId.toString() === subscription.userId.toString() &&
        up.productId.toString() === subscription.productId.toString()
      );
      
      if (matchingUserProduct) {
        console.log('✅ PERFECT! Subscription has matching user_product');
        console.log(`   user_product ID: ${matchingUserProduct._id}\n`);
      } else {
        console.log('⚠️  WARNING: Subscription has no matching user_product\n');
      }
    }
    
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('✅ Cleanup complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed');
  }
}

// Run cleanup
cleanupOrphanedRecords()
  .then(() => {
    console.log('\n✅ Script complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Script failed:', err);
    process.exit(1);
  });
