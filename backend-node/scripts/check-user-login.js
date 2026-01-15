const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

const uri = 'mongodb://localhost:27017';
const dbName = 'ai_platform';

async function checkUserLogin() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(dbName);
    
    const user = await db.collection('users').findOne({
      email: 'dwayneblack876@gmail.com'
    });
    
    console.log('\n=== USER ===');
    console.log(JSON.stringify(user, null, 2));
    
    if (user && user.passwordHash) {
      console.log('\n=== PASSWORD VERIFICATION ===');
      console.log('Password hash exists:', !!user.passwordHash);
      console.log('Password hash length:', user.passwordHash.length);
      console.log('Starts with $2:', user.passwordHash.startsWith('$2'));
      
      // Test password
      const testPassword = 'Password123!';
      try {
        const isMatch = await bcrypt.compare(testPassword, user.passwordHash);
        console.log(`\nPassword "${testPassword}" matches:`, isMatch);
      } catch (err) {
        console.log('Error comparing password:', err.message);
      }
    } else {
      console.log('\n⚠️ User has no passwordHash set!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkUserLogin();
