const { MongoClient } = require('mongodb');

async function checkChannels() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('ai_platform');
    
    const channels = await db.collection('assistant_channels').find({}).toArray();
    console.log('Total channels:', channels.length);
    
    channels.forEach((ch, i) => {
      console.log(`${i+1}.`, { 
        _id: ch._id, 
        tenantId: ch.tenantId, 
        customerId: ch.customerId, 
        productId: ch.productId ? ch.productId.toString() : null 
      });
    });
    
    // Delete channels with null tenantId or productId
    const result = await db.collection('assistant_channels').deleteMany({
      $or: [
        { tenantId: null },
        { tenantId: { $exists: false } },
        { productId: null },
        { productId: { $exists: false } }
      ]
    });
    
    console.log(`\nDeleted ${result.deletedCount} channels with null/missing tenantId or productId`);
    
    // Now create the compound unique index
    try {
      await db.collection('assistant_channels').createIndex(
        { tenantId: 1, productId: 1 },
        { unique: true, name: 'tenantId_productId_unique' }
      );
      console.log('✅ Created tenantId_productId_unique index');
    } catch (error) {
      console.log('⚠️  Could not create index:', error.message);
    }
    
    await client.close();
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkChannels();
