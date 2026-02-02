import { Db } from 'mongodb';
import mongoose from 'mongoose';
import logger from '../utils/logger';

/**
 * Get the MongoDB database instance from Mongoose connection
 * This allows legacy code using getDB() to work with Mongoose
 */
export const getDB = (): Db => {
  if (!mongoose.connection.db) {
    throw new Error('Database not initialized. Ensure Mongoose is connected first.');
  }
  return mongoose.connection.db;
};

/**
 * Close Mongoose connection
 */
export const closeDB = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    logger.info('Mongoose connection closed');
  }
};
