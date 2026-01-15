// MongoDB Collection Validation Script
// Checks if all required collections exist in the database
// Run with: node validateCollections.js

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/';
const DB_NAME = process.env.DB_NAME || 'ai_platform';

const REQUIRED_COLLECTIONS = [
  'customers',
  'assistant_channels',
  'assistant_calls',
  'assistant_chats',
  'subscriptions',
  'products',
  'invoices',
  'usage_events',
  'users',
  'api_keys',
  'prompts'
];

const OPTIONAL_COLLECTIONS = [
  'payment_methods',
  'transactions',
  'tenants'
];

async function validateCollections() {
  console.log('🔍 Validating MongoDB Collections...\n');
  console.log(`Database: ${DB_NAME}`);
  console.log(`URI: ${MONGO_URI}\n`);
  
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    
    // Get list of existing collections
    const collections = await db.listCollections().toArray();
    const existingNames = collections.map(c => c.name);
    
    console.log(`Found ${existingNames.length} collection(s) in database:\n`);
    
    // Check required collections
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('REQUIRED COLLECTIONS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    let missingRequired = [];
    let foundRequired = [];
    
    for (const colName of REQUIRED_COLLECTIONS) {
      if (existingNames.includes(colName)) {
        const count = await db.collection(colName).countDocuments();
        console.log(`✅ ${colName.padEnd(25)} (${count} documents)`);
        foundRequired.push(colName);
      } else {
        console.log(`❌ ${colName.padEnd(25)} MISSING`);
        missingRequired.push(colName);
      }
    }
    
    // Check optional collections
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('OPTIONAL COLLECTIONS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    for (const colName of OPTIONAL_COLLECTIONS) {
      if (existingNames.includes(colName)) {
        const count = await db.collection(colName).countDocuments();
        console.log(`✓  ${colName.padEnd(25)} (${count} documents)`);
      } else {
        console.log(`-  ${colName.padEnd(25)} not present`);
      }
    }
    
    // Check for unexpected collections
    const allExpected = [...REQUIRED_COLLECTIONS, ...OPTIONAL_COLLECTIONS];
    const unexpected = existingNames.filter(name => !allExpected.includes(name));
    
    if (unexpected.length > 0) {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('UNEXPECTED COLLECTIONS:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      for (const colName of unexpected) {
        const count = await db.collection(colName).countDocuments();
        console.log(`ℹ️  ${colName.padEnd(25)} (${count} documents)`);
      }
    }
    
    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('SUMMARY:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Required collections found: ${foundRequired.length}/${REQUIRED_COLLECTIONS.length}`);
    
    if (missingRequired.length > 0) {
      console.log(`❌ Missing required collections: ${missingRequired.length}`);
      console.log(`   ${missingRequired.join(', ')}`);
      console.log('\n⚠️  WARNING: Missing required collections detected!');
      console.log('   Run the following scripts to set up your database:');
      console.log('   1. node scripts/mongo/createIndexes.js');
      console.log('   2. node scripts/mongo/seedData.js');
      process.exit(1);
    } else {
      console.log('✅ All required collections are present!');
      console.log('\n🎉 Database validation passed successfully!');
    }
    
  } catch (error) {
    console.error('\n❌ Error validating collections:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run if executed directly
if (require.main === module) {
  validateCollections();
}

module.exports = { validateCollections };
