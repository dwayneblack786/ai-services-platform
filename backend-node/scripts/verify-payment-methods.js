const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'ai_platform';

async function verifyPaymentMethods() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB\n');

    const db = client.db(DB_NAME);
    
    // Check all payment methods
    const allMethods = await db.collection('payment_methods').find({}).toArray();
    console.log(`Total payment methods in database: ${allMethods.length}\n`);
    
    // Check dev tenant payment methods
    const devMethods = await db.collection('payment_methods').find({ 
      tenantId: 'ten-splendor-florida-33064' 
    }).toArray();
    
    console.log(`Payment methods for ten-splendor-florida-33064: ${devMethods.length}`);
    
    if (devMethods.length > 0) {
      console.log('\nDetails:');
      devMethods.forEach((method, index) => {
        console.log(`\n${index + 1}. ${method.cardBrand.toUpperCase()} ****${method.cardLast4}`);
        console.log(`   ID: ${method._id}`);
        console.log(`   Status: ${method.status}`);
        console.log(`   Default: ${method.isDefault}`);
        console.log(`   Billing Name: ${method.billingName}`);
        console.log(`   Transaction Count: ${method.transactionCount}`);
        if (method.lastTransactionDate) {
          console.log(`   Last Transaction: ${new Date(method.lastTransactionDate).toLocaleDateString()}`);
          console.log(`   Last Amount: $${(method.lastTransactionAmount / 100).toFixed(2)}`);
          console.log(`   Last Status: ${method.lastTransactionStatus}`);
        }
        console.log(`   Created: ${new Date(method.createdAt).toLocaleString()}`);
      });
    } else {
      console.log('\n⚠️  No payment methods found for ten-splendor-florida-33064');
      console.log('   Run: node scripts/create-dummy-payment-methods.js');
    }
    
    // Check if dev tenant exists
    console.log('\n--- Tenant Verification ---');
    const devTenant = await db.collection('tenants').findOne({ tenantId: 'ten-splendor-florida-33064' });
    if (devTenant) {
      console.log('✓ Dev tenant exists:', devTenant.companyName);
    } else {
      console.log('✗ Dev tenant NOT found');
    }
    
    // Check dev user
    const devUser = await db.collection('users').findOne({ tenantId: 'ten-splendor-florida-33064' });
    if (devUser) {
      console.log('✓ Dev user exists:', devUser.email);
    } else {
      console.log('✗ Dev user NOT found');
      console.log('  Use "Quick Dev Login" button on login page');
    }

  } catch (error) {
    console.error('✗ Error:', error);
  } finally {
    await client.close();
    console.log('\n✓ Connection closed');
  }
}

verifyPaymentMethods();
