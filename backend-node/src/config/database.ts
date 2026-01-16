import { MongoClient, Db } from 'mongodb';
import logger from '../utils/logger';
import { env } from './env';

// Parse MongoDB URI to extract database name
function getDatabaseName(uri: string): string {
  try {
    const url = new URL(uri);
    // Database name is after the last / and before any ?
    const dbName = url.pathname.split('/').pop()?.split('?')[0];
    return dbName || 'ai_platform';
  } catch {
    return 'ai_platform';
  }
}

const MONGO_URI = env.MONGODB_URI;
const DB_NAME = getDatabaseName(MONGO_URI);

let client: MongoClient | null = null;
let db: Db | null = null;

export const connectDB = async (): Promise<Db> => {
  if (db) {
    return db;
  }

  try {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db(DB_NAME);
    logger.info('✓ MongoDB connected successfully', { database: DB_NAME });
    return db;
  } catch (error) {
    logger.error('✗ MongoDB connection error:', error);
    throw error;
  }
};

export const getDB = (): Db => {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB first.');
  }
  return db;
};

export const closeDB = async (): Promise<void> => {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('MongoDB connection closed');
  }
};
