const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const dbName = 'ai_platform';

async function checkAllChannels() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(dbName);
    
    const channels = await db.collection('assistant_channels').find({}).toArray();
    console.log(`\nFound ${channels.length} channels:`);
    console.log(JSON.stringify(channels, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkAllChannels();
