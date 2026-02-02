const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'ai_platform';

async function checkUsers() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB');

    const db = client.db(DB_NAME);
    const usersCollection = db.collection('users');

    const allUsers = await usersCollection.find({}).toArray();

    console.log(`\nTotal users in database: ${allUsers.length}\n`);

    allUsers.forEach((user, index) => {
      console.log(`User ${index + 1}:`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Name: ${user.name}`);
      console.log(`  Verified: ${user.emailVerified}`);
      console.log(`  Has Token: ${!!user.emailVerificationToken}`);
      console.log(`  Has Token Expiration: ${!!user.emailVerificationTokenExpires}`);
      if (user.emailVerificationTokenExpires) {
        console.log(`  Token Expires: ${new Date(user.emailVerificationTokenExpires).toISOString()}`);
        console.log(`  Token Expired: ${new Date(user.emailVerificationTokenExpires) < new Date()}`);
      }
      console.log(`  Created: ${user.createdAt}`);
      console.log('');
    });

  } catch (error) {
    console.error('✗ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

checkUsers();
