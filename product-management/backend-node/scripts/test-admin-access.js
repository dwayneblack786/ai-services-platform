const { MongoClient, ObjectId } = require('mongodb');

async function testAdminAccess() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('ai_platform');
    
    const user = await db.collection('users').findOne({ 
      email: 'dwayneblack876@gmail.com' 
    });
    
    console.log('User details:');
    console.log('  Email:', user.email);
    console.log('  Role:', user.role);
    console.log('  Tenant ID:', user.tenantId);
    
    // Test role check (case-insensitive)
    const userRole = user.role?.toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'owner';
    
    console.log('\nRole check result:');
    console.log('  Lowercase role:', userRole);
    console.log('  Is admin?', isAdmin);
    
    if (isAdmin) {
      console.log('\n✅ User will have admin access');
      
      // Check subscription
      const subscription = await db.collection('subscriptions').findOne({
        $or: [
          { tenantId: user.tenantId },
          { customerId: user.customerId },
          { customerId: user._id }
        ],
        status: 'active'
      });
      
      console.log('\nActive subscription:', subscription ? 'YES' : 'NO');
      if (subscription) {
        const product = await db.collection('products').findOne({ _id: subscription.productId });
        console.log('  Product:', product.name);
      }
    } else {
      console.log('\n❌ User will be denied admin access');
    }
    
    await client.close();
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testAdminAccess();
