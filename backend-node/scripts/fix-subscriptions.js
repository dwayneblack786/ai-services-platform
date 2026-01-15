const { MongoClient, ObjectId } = require('mongodb');

async function fixSubscriptions() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('ai_platform');
    
    // Get all Virtual Assistant products
    const products = await db.collection('products').find({ category: 'Virtual Assistant' }).toArray();
    console.log(`Found ${products.length} Virtual Assistant products`);
    
    // Get all subscriptions
    const subscriptions = await db.collection('subscriptions').find({}).toArray();
    console.log(`Found ${subscriptions.length} subscriptions to update`);
    
    // Update subscriptions to use actual product IDs
    for (const sub of subscriptions) {
      // Pick the first Virtual Assistant product for demo purposes
      const product = products[0]; // Healthcare Assistant
      
      const result = await db.collection('subscriptions').updateOne(
        { _id: sub._id },
        { 
          $set: { 
            productId: product._id,
            customerId: 'test_cust_001',
            status: 'active',
            tenantId: 'test_cust_001' // Add tenantId for consistency
          } 
        }
      );
      
      console.log(`✅ Updated subscription ${sub._id} to use product: ${product.name} (${product._id})`);
    }
    
    console.log('\n✨ Subscriptions fixed successfully!');
    
    // Verify
    const updatedSubs = await db.collection('subscriptions').find({}).toArray();
    console.log('\nUpdated subscriptions:');
    for (const sub of updatedSubs) {
      const product = await db.collection('products').findOne({ _id: sub.productId });
      console.log(`  - ${sub._id}: ${product ? product.name : 'PRODUCT NOT FOUND'}`);
    }
    
  } catch (error) {
    console.error('❌ Error fixing subscriptions:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\nDatabase connection closed');
  }
}

fixSubscriptions().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
