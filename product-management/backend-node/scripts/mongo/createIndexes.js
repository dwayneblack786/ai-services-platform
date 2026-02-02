// MongoDB Index Creation Script
// Run with: node createIndexes.js
// Or in mongo shell: load('createIndexes.js')

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/';
const DB_NAME = process.env.DB_NAME || 'ai_platform';

async function createIndexes() {
  console.log('🔗 Connecting to MongoDB...');
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    console.log(`✓ Connected to database: ${DB_NAME}\n`);

    // customers
    console.log('Creating indexes for customers...');
    await db.collection('customers').createIndex({ name: 1 });
    await db.collection('customers').createIndex({ industry: 1 });
    console.log('✓ customers indexes created');

    // assistant_channels
    console.log('Creating indexes for assistant_channels...');
    await db.collection('assistant_channels').createIndex({ customerId: 1 }, { unique: true });
    await db.collection('assistant_channels').createIndex({ "voice.phoneNumber": 1 }, { unique: true, sparse: true });
    await db.collection('assistant_channels').createIndex({ "chat.enabled": 1 });
    console.log('✓ assistant_channels indexes created');

    // assistant_calls (voice)
    console.log('Creating indexes for assistant_calls...');
    await db.collection('assistant_calls').createIndex({ customerId: 1, startTime: -1 });
    await db.collection('assistant_calls').createIndex({ assistantPhoneNumber: 1 });
    await db.collection('assistant_calls').createIndex({ status: 1 });
    console.log('✓ assistant_calls indexes created');

    // assistant_chats (chat)
    console.log('Creating indexes for assistant_chats...');
    await db.collection('assistant_chats').createIndex({ customerId: 1, startTime: -1 });
    await db.collection('assistant_chats').createIndex({ sessionId: 1 });
    await db.collection('assistant_chats').createIndex({ status: 1 });
    console.log('✓ assistant_chats indexes created');

    // subscriptions
    console.log('Creating indexes for subscriptions...');
    await db.collection('subscriptions').createIndex({ customerId: 1 });
    await db.collection('subscriptions').createIndex({ productId: 1 });
    await db.collection('subscriptions').createIndex({ status: 1 });
    console.log('✓ subscriptions indexes created');

    // products
    console.log('Creating indexes for products...');
    await db.collection('products').createIndex({ category: 1 });
    await db.collection('products').createIndex({ name: 1 });
    console.log('✓ products indexes created');

    // invoices
    console.log('Creating indexes for invoices...');
    await db.collection('invoices').createIndex({ customerId: 1, createdAt: -1 });
    await db.collection('invoices').createIndex({ status: 1 });
    console.log('✓ invoices indexes created');

    // usage_events (optional)
    console.log('Creating indexes for usage_events...');
    await db.collection('usage_events').createIndex({ customerId: 1, timestamp: -1 });
    await db.collection('usage_events').createIndex({ subscriptionId: 1 });
    console.log('✓ usage_events indexes created');

    // users
    console.log('Creating indexes for users...');
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ customerId: 1 });
    console.log('✓ users indexes created');

    // api_keys
    console.log('Creating indexes for api_keys...');
    await db.collection('api_keys').createIndex({ customerId: 1 });
    await db.collection('api_keys').createIndex({ key: 1 }, { unique: true });
    console.log('✓ api_keys indexes created');

    // prompts
    console.log('Creating indexes for prompts...');
    await db.collection('prompts').createIndex({ industry: 1 });
    await db.collection('prompts').createIndex({ isDefault: 1 });
    await db.collection('prompts').createIndex({ customerId: 1 });
    console.log('✓ prompts indexes created');

    console.log('\n✅ All indexes created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run if executed directly
if (require.main === module) {
  createIndexes();
}

module.exports = { createIndexes };
