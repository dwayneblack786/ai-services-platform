const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'ai_platform';

async function fixUserProductStatus() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(DB_NAME);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('FIXING USER_PRODUCT STATUS');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Find all user_products without status or with invalid status
    const userProducts = await db.collection('user_products').find({
      $or: [
        { status: { $exists: false } },
        { status: null },
        { status: '' }
      ]
    }).toArray();
    
    console.log(`Found ${userProducts.length} user_product(s) with missing status\n`);
    
    for (const up of userProducts) {
      console.log(`Fixing user_product ${up._id}:`);
      console.log(`  User ID: ${up.userId}`);
      console.log(`  Product ID: ${up.productId}`);
      console.log(`  Current Status: ${up.status}`);
      
      await db.collection('user_products').updateOne(
        { _id: up._id },
        {
          $set: {
            status: 'active',
            updatedAt: new Date()
          }
        }
      );
      
      console.log(`  ✅ Updated to: active\n`);
    }
    
    // Verification
    console.log('═══════════════════════════════════════════════════════════');
    console.log('VERIFICATION');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const allUserProducts = await db.collection('user_products').find({}).toArray();
    
    console.log(`Total user_products: ${allUserProducts.length}\n`);
    
    allUserProducts.forEach(up => {
      const statusIcon = up.status === 'active' ? '✅' : '⚠️';
      console.log(`${statusIcon} ${up._id}`);
      console.log(`   User: ${up.userId}`);
      console.log(`   Product: ${up.productId}`);
      console.log(`   Status: ${up.status || 'MISSING'}`);
      console.log('');
    });
    
    const withoutStatus = allUserProducts.filter(up => !up.status || up.status !== 'active');
    
    if (withoutStatus.length === 0) {
      console.log('✅ All user_products have active status!');
    } else {
      console.log(`⚠️  ${withoutStatus.length} user_product(s) still need fixing`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n✅ MongoDB connection closed');
  }
}

fixUserProductStatus()
  .then(() => {
    console.log('\n✅ Fix complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Fix failed:', err);
    process.exit(1);
  });
