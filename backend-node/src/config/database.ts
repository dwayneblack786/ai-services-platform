import { MongoClient, Db } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'ai_platform';

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
    console.log('✓ MongoDB connected successfully');
    return db;
  } catch (error) {
    console.error('✗ MongoDB connection error:', error);
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
