const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const dbName = 'ai_platform';

async function fixUserPassword() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(dbName);
    
    // Get the current user
    const user = await db.collection('users').findOne({
      email: 'dwayneblack876@gmail.com'
    });
    
    console.log('Current user state:');
    console.log('- Has password:', !!user.password);
    console.log('- Has passwordHash:', !!user.passwordHash);
    
    if (user.password) {
      // Move password to passwordHash and remove password field
      const result = await db.collection('users').updateOne(
        { email: 'dwayneblack876@gmail.com' },
        { 
          $set: { 
            passwordHash: user.password,
            updatedAt: new Date()
          },
          $unset: {
            password: ''
          }
        }
      );
      
      console.log('\n✓ Fixed user password field');
      console.log('Updated:', result.modifiedCount);
      
      // Verify
      const updatedUser = await db.collection('users').findOne({
        email: 'dwayneblack876@gmail.com'
      });
      
      console.log('\nUpdated user state:');
      console.log('- Has password:', !!updatedUser.password);
      console.log('- Has passwordHash:', !!updatedUser.passwordHash);
    } else {
      console.log('\nNo action needed');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

fixUserPassword();
