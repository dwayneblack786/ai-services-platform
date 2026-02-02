const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

async function fixUser() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('ai_platform');
    
    // Hash a temporary password
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    
    // Update the user
    const result = await db.collection('users').updateOne(
      { email: 'dwayneblack876@gmail.com' },
      { 
        $set: { 
          password: hashedPassword,
          emailVerified: true,
          customerId: 'ten-splendor-florida-33064'
        } 
      }
    );
    
    console.log('Updated user:', result.matchedCount, 'matched,', result.modifiedCount, 'modified');
    
    const user = await db.collection('users').findOne({ email: 'dwayneblack876@gmail.com' });
    console.log('\nUser now has:', { 
      email: user.email, 
      hasPassword: !!user.password, 
      emailVerified: user.emailVerified, 
      tenantId: user.tenantId, 
      customerId: user.customerId,
      role: user.role
    });
    
    // Check if there are any subscriptions for this tenant
    const subscriptions = await db.collection('subscriptions').find({
      $or: [
        { tenantId: user.tenantId },
        { customerId: user.customerId }
      ],
      status: 'active'
    }).toArray();
    
    console.log('\nActive subscriptions for this tenant:', subscriptions.length);
    
    if (subscriptions.length === 0) {
      console.log('\n⚠️  No subscriptions found for this tenant. Creating one...');
      
      // Get a Virtual Assistant product
      const product = await db.collection('products').findOne({ category: 'Virtual Assistant' });
      
      if (product) {
        const newSub = {
          _id: `sub_${Date.now()}`,
          tenantId: user.tenantId,
          customerId: user.customerId,
          productId: product._id,
          status: 'active',
          billingCycle: 'monthly',
          usage: {
            conversations: 0,
            limit: 500
          },
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await db.collection('subscriptions').insertOne(newSub);
        console.log(`✅ Created subscription for ${product.name}`);
      }
    }
    
    await client.close();
    
    console.log('\n✅ User setup complete!');
    console.log('Login credentials:');
    console.log('  Email: dwayneblack876@gmail.com');
    console.log('  Password: Password123!');
    console.log('  Tenant ID: ten-splendor-florida-33064');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixUser();
