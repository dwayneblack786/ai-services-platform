const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'ai_platform';

async function checkToken() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    
    const token = 'cc18dc5ec9d220f2877561a50628e1080a6f65c009c6b09d4f2cf3a9c7303c01';
    
    const user = await db.collection('users').findOne({ 
      emailVerificationToken: token 
    });

    if (user) {
      console.log('✓ User found with this token:');
      console.log('  Email:', user.email);
      console.log('  Token matches:', user.emailVerificationToken === token);
      console.log('  Has expiration:', !!user.emailVerificationTokenExpires);
      if (user.emailVerificationTokenExpires) {
        const expires = new Date(user.emailVerificationTokenExpires);
        const now = new Date();
        console.log('  Expires at:', expires.toISOString());
        console.log('  Current time:', now.toISOString());
        console.log('  Is expired:', expires < now);
      }
      console.log('  Email verified:', user.emailVerified);
    } else {
      console.log('✗ No user found with this token');
      
      // Check all users
      const allUsers = await db.collection('users').find({}).toArray();
      console.log('\nAll users in DB:');
      allUsers.forEach(u => {
        console.log(`  - ${u.email}: verified=${u.emailVerified}, hasToken=${!!u.emailVerificationToken}`);
        if (u.emailVerificationToken) {
          console.log(`    Token: ${u.emailVerificationToken.substring(0, 20)}...`);
        }
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkToken();
