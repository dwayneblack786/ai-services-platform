const mongoose = require('mongoose');

async function removeCustomersCollection() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ai_platform');
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Check if customers collection exists
    const collections = await db.listCollections({ name: 'customers' }).toArray();
    
    if (collections.length > 0) {
      // Show what's in the collection before dropping
      const count = await db.collection('customers').countDocuments();
      console.log(`\nFound 'customers' collection with ${count} document(s)`);
      
      if (count > 0) {
        const docs = await db.collection('customers').find().toArray();
        console.log('\nDocuments that will be removed:');
        docs.forEach((doc, idx) => {
          console.log(`  ${idx + 1}. ${doc.name} (${doc._id})`);
        });
      }

      // Drop the collection
      await db.collection('customers').drop();
      console.log('\n✅ Successfully dropped "customers" collection');
      console.log('   Tenants collection should be used instead.');
    } else {
      console.log('No "customers" collection found - already removed');
    }

    // Check for customerId fields in users collection
    console.log('\n📊 Checking for customerId references in users...');
    const usersWithCustomerId = await db.collection('users').countDocuments({ customerId: { $exists: true, $ne: null } });
    console.log(`   Found ${usersWithCustomerId} user(s) with customerId field`);
    
    if (usersWithCustomerId > 0) {
      console.log('   Note: customerId field can remain for backward compatibility');
      console.log('   It is mapped to tenantId in the application logic');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

removeCustomersCollection();
