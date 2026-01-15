const { MongoClient } = require('mongodb');

async function fixUser() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('ai_platform');
    
    const result = await db.collection('users').updateOne(
      { email: 'admin@acmehealth.com' },
      { 
        $set: { 
          customerId: 'test_cust_001',
          tenantId: 'test_cust_001'
        } 
      }
    );
    
    console.log('Updated user:', result.matchedCount, 'matched,', result.modifiedCount, 'modified');
    
    const user = await db.collection('users').findOne({ email: 'admin@acmehealth.com' });
    console.log('User now has:', { 
      _id: user._id,
      email: user.email,
      customerId: user.customerId, 
      tenantId: user.tenantId,
      role: user.role
    });
    
    await client.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixUser();
