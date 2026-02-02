const { MongoClient } = require('mongodb');

async function checkUser() {
  const client = new MongoClient('mongodb://localhost:27017');
  try {
    await client.connect();
    const db = client.db('ai_platform');
    const user = await db.collection('users').findOne({ email: 'dwayneblack876@gmail.com' });
    console.log('User found:', JSON.stringify(user, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
}

checkUser();
