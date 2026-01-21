/**
 * Mock Database Helper
 * Provides in-memory MongoDB for testing
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db, Document } from 'mongodb';

let mongoServer: MongoMemoryServer | null = null;
let mongoClient: MongoClient | null = null;
let db: Db | null = null;

/**
 * Start in-memory MongoDB server
 */
export async function startMockDatabase(): Promise<{ uri: string; db: Db }> {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  
  mongoClient = new MongoClient(uri);
  await mongoClient.connect();
  
  db = mongoClient.db('test_database');
  
  return { uri, db };
}

/**
 * Stop MongoDB server and cleanup
 */
export async function stopMockDatabase(): Promise<void> {
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = null;
  }
  
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
  
  db = null;
}

/**
 * Clear all collections in database
 */
export async function clearDatabase(): Promise<void> {
  if (!db) {
    throw new Error('Database not initialized. Call startMockDatabase() first.');
  }
  
  const collections = await db.collections();
  
  for (const collection of collections) {
    await collection.deleteMany({});
  }
}

/**
 * Get current database instance
 */
export function getMockDatabase(): Db {
  if (!db) {
    throw new Error('Database not initialized. Call startMockDatabase() first.');
  }
  
  return db;
}

/**
 * Seed test data into collection
 */
export async function seedCollection<T extends Document>(collectionName: string, data: T[]): Promise<void> {
  if (!db) {
    throw new Error('Database not initialized. Call startMockDatabase() first.');
  }
  
  const collection = db.collection<T>(collectionName);
  await collection.insertMany(data as any);
}
