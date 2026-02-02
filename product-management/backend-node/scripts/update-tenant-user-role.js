const mongoose = require('mongoose');

const tenantId = process.argv[2] || 'ten-splendor-florida-33064';
const role = process.argv[3] || 'PROJECT_ADMIN';

mongoose.connect('mongodb://localhost:27017/ai_platform')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    
    // Find users first
    const usersBefore = await User.find({ tenantId });
    console.log(`\nFound ${usersBefore.length} user(s) for tenant: ${tenantId}`);
    usersBefore.forEach(u => {
      console.log(`  - ${u.email}: ${u.role}`);
    });
    
    // Update role
    const result = await User.updateMany(
      { tenantId },
      { $set: { role } }
    );
    
    console.log(`\nUpdated ${result.modifiedCount} user(s) to ${role} role`);
    
    // Show updated users
    const usersAfter = await User.find({ tenantId });
    console.log('\nUsers after update:');
    usersAfter.forEach(u => {
      console.log(`  - ${u.email}: ${u.role}`);
    });
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
