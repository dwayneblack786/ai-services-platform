const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const dbName = 'ai_platform';

async function createChatHistoryCollection() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(dbName);
    
    // Check if collection exists
    const collections = await db.listCollections({ name: 'chat_messages' }).toArray();
    
    if (collections.length > 0) {
      console.log('chat_messages collection already exists');
    } else {
      // Create collection
      await db.createCollection('chat_messages');
      console.log('✓ Created chat_messages collection');
    }
    
    // Create indexes for better query performance
    await db.collection('chat_messages').createIndex({ sessionId: 1, timestamp: 1 });
    await db.collection('chat_messages').createIndex({ customerId: 1, timestamp: -1 });
    await db.collection('chat_messages').createIndex({ sessionId: 1 });
    
    console.log('✓ Created indexes on chat_messages collection');
    
    // Insert sample document structure
    const sampleDoc = {
      sessionId: 'sample-session-id',
      customerId: 'sample-customer-id',
      productId: 'va-service',
      messages: [
        {
          role: 'assistant',
          content: 'Hello! How can I help you today?',
          timestamp: new Date(),
          intent: null
        },
        {
          role: 'user',
          content: 'I need help with scheduling',
          timestamp: new Date()
        },
        {
          role: 'assistant',
          content: 'I can help you schedule an appointment. What date works for you?',
          timestamp: new Date(),
          intent: 'schedule_appointment'
        }
      ],
      startedAt: new Date(),
      lastUpdatedAt: new Date(),
      endedAt: null,
      isActive: true
    };
    
    console.log('\nSample document structure:');
    console.log(JSON.stringify(sampleDoc, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

createChatHistoryCollection();
