#!/usr/bin/env node
/**
 * MongoDB Connection Test Script
 *
 * Validates that:
 * 1. Mongoose can connect to MongoDB
 * 2. Database is accessible
 * 3. User model can query the database
 *
 * Usage: npx ts-node scripts/test-mongodb-connection.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-services-platform';

async function testMongoDBConnection() {
  console.log('🧪 MongoDB Connection Test\n');
  console.log('='.repeat(60));

  try {
    // Test 1: Connect to MongoDB
    console.log('\n[1/4] 📡 Connecting to MongoDB...');
    console.log(`   URI: ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);

    await mongoose.connect(MONGODB_URI);

    const dbName = mongoose.connection.db?.databaseName;
    const host = mongoose.connection.host;

    console.log('✅ [1/4] Mongoose connected successfully');
    console.log(`   Database: ${dbName}`);
    console.log(`   Host: ${host}`);

    // Test 2: Check database accessibility
    console.log('\n[2/4] 🗄️  Checking database accessibility...');
    const collections = await mongoose.connection.db?.listCollections().toArray();
    console.log(`✅ [2/4] Database accessible`);
    console.log(`   Collections found: ${collections?.length || 0}`);
    if (collections && collections.length > 0) {
      console.log(`   Collections: ${collections.map(c => c.name).join(', ')}`);
    }

    // Test 3: Import and test User model
    console.log('\n[3/4] 👤 Testing User model...');
    const User = (await import('../src/models/User')).default;

    const userCount = await User.countDocuments();
    console.log(`✅ [3/4] User model working`);
    console.log(`   Total users: ${userCount}`);

    // Test 4: Test query with tenantId
    console.log('\n[4/4] 🏢 Testing tenant-based query...');
    const tenants = await User.distinct('tenantId');
    console.log(`✅ [4/4] Tenant query working`);
    console.log(`   Unique tenants: ${tenants.length}`);
    if (tenants.length > 0) {
      console.log(`   Tenant IDs: ${tenants.join(', ')}`);

      // Show user count per tenant
      for (const tenantId of tenants.slice(0, 5)) {
        const count = await User.countDocuments({ tenantId });
        console.log(`      - ${tenantId}: ${count} user(s)`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED - MongoDB connection is working!');
    console.log('='.repeat(60));

  } catch (error: any) {
    console.log('\n' + '='.repeat(60));
    console.error('❌ TEST FAILED:', error.message);
    console.log('='.repeat(60));
    console.error('\nError details:', error);
    process.exit(1);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

// Run the test
testMongoDBConnection();
