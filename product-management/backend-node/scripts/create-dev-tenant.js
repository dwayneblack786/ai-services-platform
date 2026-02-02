const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'ai_platform';

async function createDevTenant() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(dbName);
    const tenantsCollection = db.collection('tenants');
    
    // Check if tenant already exists
    const existing = await tenantsCollection.findOne({ tenantId: 'ten-splendor-florida-33064' });
    
    if (existing) {
      console.log('✓ Development tenant already exists');
      console.log('Tenant ID:', existing.tenantId);
      console.log('Company:', existing.companyName);
      return;
    }
    
    // Create development tenant
    const devTenant = {
      tenantId: 'ten-splendor-florida-33064',
      companyName: 'Development Company',
      companyEmail: 'dev@example.com',
      companyPhone: '555-0100',
      address: {
        street: '123 Dev Street',
        city: 'Dev City',
        state: 'DC',
        zipCode: '10000',
        country: 'USA'
      },
      industry: 'Technology',
      website: 'https://dev.example.com',
      createdBy: 'dev-user-123',
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active'
    };
    
    const result = await tenantsCollection.insertOne(devTenant);
    console.log('✓ Development tenant created successfully!');
    console.log('Tenant ID: ten-splendor-florida-33064');
    console.log('Inserted ID:', result.insertedId);
    
  } catch (error) {
    console.error('Error creating tenant:', error);
  } finally {
    await client.close();
  }
}

createDevTenant();
