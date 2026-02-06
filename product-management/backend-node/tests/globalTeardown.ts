/**
 * Jest Global Teardown - Cleanup MongoDB Memory Server
 */

import { MongoMemoryServer } from 'mongodb-memory-server';

export default async function globalTeardown() {
  const mongoServer: MongoMemoryServer = (global as any).__MONGOSERVER__;

  if (mongoServer) {
    await mongoServer.stop();
    console.log('✅ Global MongoDB Memory Server stopped');
  }
}
