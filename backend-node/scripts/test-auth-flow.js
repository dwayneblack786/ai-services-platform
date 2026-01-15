const { MongoClient, ObjectId } = require('mongodb');

async function testAuthFlow() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('ai_platform');
    
    // Simulate the auth flow
    const user = await db.collection('users').findOne({ email: 'admin@acmehealth.com' });
    console.log('1. User:', { 
      _id: user._id, 
      email: user.email, 
      tenantId: user.tenantId, 
      customerId: user.customerId 
    });
    
    // Check subscriptions
    const subscriptions = await db.collection('subscriptions').find({
      customerId: user.customerId,
      status: 'active'
    }).toArray();
    console.log('\n2. Active subscriptions found:', subscriptions.length);
    
    // Get products
    const productIds = subscriptions.map(sub => sub.productId);
    const products = await db.collection('products').find({
      _id: { $in: productIds }
    }).toArray();
    console.log('3. Subscribed products:', products.map(p => p.name));
    
    // Check for Virtual Assistant
    const hasVA = products.some(p => p.category === 'Virtual Assistant');
    console.log('4. Has Virtual Assistant subscription:', hasVA);
    
    // Test product access for a specific product
    const testProductId = new ObjectId('69667c560e03d4f31472dbd3');
    const productSub = await db.collection('subscriptions').findOne({
      customerId: user.customerId,
      productId: testProductId,
      status: 'active'
    });
    console.log('\n5. Has access to Healthcare product:', !!productSub);
    
    if (productSub) {
      const product = await db.collection('products').findOne({ _id: testProductId });
      console.log('   Product:', product.name);
      console.log('   Template ID:', product.defaultPromptTemplateId);
      
      if (product.defaultPromptTemplateId) {
        const template = await db.collection('prompt_templates').findOne({ _id: product.defaultPromptTemplateId });
        console.log('   Template:', template ? template.name : 'NOT FOUND');
      }
    }
    
    console.log('\n✅ Auth flow test completed successfully!');
    
    await client.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testAuthFlow();
