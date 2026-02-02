const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'ai_platform';

// Get email from command line argument
const emailToDelete = process.argv[2];

if (!emailToDelete) {
  console.error('Usage: node scripts/delete-user.js <email>');
  process.exit(1);
}

async function deleteUser() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB');

    const db = client.db(DB_NAME);
    const usersCollection = db.collection('users');

    // Find the user first
    const user = await usersCollection.findOne({ email: emailToDelete });

    if (!user) {
      console.log(`\n✗ User with email "${emailToDelete}" not found`);
      return;
    }

    console.log(`\nFound user:`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Tenant ID: ${user.tenantId}`);
    console.log(`  Verified: ${user.emailVerified}`);

    // Delete the user
    const deleteResult = await usersCollection.deleteOne({ email: emailToDelete });

    if (deleteResult.deletedCount > 0) {
      console.log(`\n✓ Successfully deleted user: ${emailToDelete}`);
      console.log('✓ This user can now sign up again');
    } else {
      console.log(`\n✗ Failed to delete user`);
    }

  } catch (error) {
    console.error('✗ Error during deletion:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✓ Database connection closed');
  }
}

deleteUser();
