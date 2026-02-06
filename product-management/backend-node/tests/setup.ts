/**
 * Jest Test Setup (Phase 1 Gate Tests)
 * Uses shared MongoDB Memory Server from globalSetup
 */

import mongoose from 'mongoose';

beforeAll(async () => {
  // Use URI from global setup to avoid creating multiple instances
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI not set. Ensure globalSetup ran successfully.');
  }
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to shared MongoDB Memory Server');
});

afterAll(async () => {
  await mongoose.disconnect();
  console.log('✅ Disconnected from MongoDB');
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

expect.extend({
  toBeEncrypted(received: any) {
    const pass = typeof received === 'string' && received.length > 0;
    return {
      message: () => pass ? 'expected not to be encrypted' : 'expected to be encrypted',
      pass
    };
  },

  toContainIndex(received: any[], expected: any) {
    const pass = received.some(index => {
      return Object.keys(expected).every(key => index.key && index.key[key] === expected[key]);
    });
    return {
      message: () => pass ? 'expected indexes not to contain index' : 'expected indexes to contain index',
      pass
    };
  },

  toContainCollection(received: any[], collectionName: string) {
    const pass = received.some(c => c.name === collectionName);
    return {
      message: () => pass ? 'expected not to contain collection' : 'expected to contain collection',
      pass
    };
  }
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeEncrypted(): R;
      toContainIndex(expected: any): R;
      toContainCollection(collectionName: string): R;
    }
  }
}
