/**
 * Jest Global Setup - Shared MongoDB Memory Server
 * Creates a single MongoDB instance for all tests to avoid port conflicts
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

export default async function globalSetup() {
  // Create MongoDB Memory Server with custom port range to avoid conflicts
  const mongoServer = await MongoMemoryServer.create({
    instance: {
      port: undefined, // Let it find a free port
      storageEngine: 'wiredTiger',
    },
  });

  const mongoUri = mongoServer.getUri();

  // Store URI and instance for tests and teardown
  (global as any).__MONGOSERVER__ = mongoServer;
  process.env.MONGO_URI = mongoUri;

  console.log('✅ Global MongoDB Memory Server started:', mongoUri);

  // Connect mongoose to verify it works
  await mongoose.connect(mongoUri);
  await mongoose.disconnect();

  console.log('✅ MongoDB connection verified');
}
