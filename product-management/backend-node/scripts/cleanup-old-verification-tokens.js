const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'ai_platform';

async function cleanupOldTokens() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB');

    const db = client.db(DB_NAME);
    const usersCollection = db.collection('users');

    // Find users with verification tokens but no expiration field
    const usersWithOldTokens = await usersCollection.find({
      emailVerificationToken: { $exists: true },
      emailVerificationTokenExpires: { $exists: false },
      emailVerified: false
    }).toArray();

    console.log(`\nFound ${usersWithOldTokens.length} user(s) with old verification tokens`);

    if (usersWithOldTokens.length === 0) {
      console.log('✓ No cleanup needed');
      return;
    }

    // Display users that will be deleted
    console.log('\nUsers to be deleted:');
    usersWithOldTokens.forEach(user => {
      console.log(`  - ${user.email} (created: ${user.createdAt})`);
    });

    // Delete users with old tokens
    const deleteResult = await usersCollection.deleteMany({
      emailVerificationToken: { $exists: true },
      emailVerificationTokenExpires: { $exists: false },
      emailVerified: false
    });

    console.log(`\n✓ Deleted ${deleteResult.deletedCount} user(s) with expired verification tokens`);
    console.log('✓ These users can now sign up again with valid tokens');

  } catch (error) {
    console.error('✗ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✓ Database connection closed');
  }
}

cleanupOldTokens();
