const { MongoClient } = require('mongodb');

async function fixAssistantChannelsIndexes() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('ai_platform');
    
    console.log('Current indexes:');
    const indexes = await db.collection('assistant_channels').indexes();
    indexes.forEach(idx => console.log('  -', idx.name));
    
    // Drop the unique customerId index
    console.log('\nDropping customerId_1 unique index...');
    try {
      await db.collection('assistant_channels').dropIndex('customerId_1');
      console.log('✅ Dropped customerId_1 index');
    } catch (error) {
      console.log('⚠️  Could not drop index:', error.message);
    }
    
    // Create a compound unique index on tenantId + productId
    console.log('\nCreating compound unique index on tenantId + productId...');
    try {
      await db.collection('assistant_channels').createIndex(
        { tenantId: 1, productId: 1 },
        { unique: true, name: 'tenantId_productId_unique' }
      );
      console.log('✅ Created tenantId_productId_unique index');
    } catch (error) {
      console.log('⚠️  Could not create index:', error.message);
    }
    
    console.log('\nFinal indexes:');
    const finalIndexes = await db.collection('assistant_channels').indexes();
    finalIndexes.forEach(idx => {
      const keys = Object.keys(idx.key).join(' + ');
      const unique = idx.unique ? ' (UNIQUE)' : '';
      console.log(`  - ${idx.name}: ${keys}${unique}`);
    });
    
    await client.close();
    console.log('\n✅ Index fix completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixAssistantChannelsIndexes();
