const { MongoClient } = require('mongodb');
const crypto = require('crypto');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'ai_platform';

const emailToReset = process.argv[2];

if (!emailToReset) {
  console.error('Usage: node scripts/reset-user-verification.js <email>');
  process.exit(1);
}

async function resetUserVerification() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ email: emailToReset });

    if (!user) {
      console.log(`✗ User with email "${emailToReset}" not found`);
      return;
    }

    // Generate new token
    const newToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Reset user verification status
    await usersCollection.updateOne(
      { email: emailToReset },
      {
        $set: {
          emailVerified: false,
          emailVerificationToken: newToken,
          emailVerificationTokenExpires: tokenExpires,
          updatedAt: new Date()
        }
      }
    );

    console.log('✓ User verification reset successfully');
    console.log('\nNew verification details:');
    console.log('  Email:', emailToReset);
    console.log('  Token:', newToken);
    console.log('  Expires:', tokenExpires.toISOString());
    console.log('\nVerification URL:');
    console.log(`  http://localhost:5173/verify-email?token=${newToken}`);

  } catch (error) {
    console.error('✗ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

resetUserVerification();
