const { MongoClient } = require('mongodb');
require('dotenv').config();

const mongoUrl = process.env.MONGO_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGO_DB_NAME || 'ai_platform';

async function createIndexes() {
  const client = new MongoClient(mongoUrl);
  
  try {
    await client.connect();
    console.log('✓ Connected to MongoDB');
    
    const db = client.db(dbName);
    const collection = db.collection('product_configurations');
    
    // Create compound unique index on tenantId + productId + status
    // This ensures each tenant can only have one active configuration per product
    await collection.createIndex(
      { tenantId: 1, productId: 1, status: 1 },
      { 
        unique: true,
        name: 'tenant_product_status_unique',
        partialFilterExpression: { status: 'active' }
      }
    );
    console.log('✓ Created unique index: tenant_product_status_unique');
    
    // Create index on tenantId for faster tenant queries
    await collection.createIndex(
      { tenantId: 1 },
      { name: 'tenantId_index' }
    );
    console.log('✓ Created index: tenantId_index');
    
    // Create index on productId for faster product queries
    await collection.createIndex(
      { productId: 1 },
      { name: 'productId_index' }
    );
    console.log('✓ Created index: productId_index');
    
    // Create index on createdAt for sorting
    await collection.createIndex(
      { createdAt: -1 },
      { name: 'createdAt_index' }
    );
    console.log('✓ Created index: createdAt_index');
    
    console.log('\n✓ All indexes created successfully!');
    
    // List all indexes
    const indexes = await collection.indexes();
    console.log('\nCurrent indexes:');
    indexes.forEach(index => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key));
    });
    
  } catch (error) {
    console.error('Error creating indexes:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

createIndexes();
