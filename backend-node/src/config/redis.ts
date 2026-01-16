import { createClient } from 'redis';
import logger from '../utils/logger';
import dotenv from 'dotenv';

dotenv.config();

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error('Redis: Max reconnection attempts reached');
        return new Error('Redis connection failed');
      }
      const delay = Math.min(retries * 100, 3000);
      logger.info(`Redis: Reconnecting in ${delay}ms`, { attempt: retries });
      return delay;
    }
  }
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error', { error: err.message, stack: err.stack });
});

redisClient.on('connect', () => {
  logger.info('Redis: Connection established');
});

redisClient.on('ready', () => {
  logger.info('Redis: Client ready');
});

redisClient.on('reconnecting', () => {
  logger.info('Redis: Reconnecting...');
});

redisClient.on('end', () => {
  logger.info('Redis: Connection closed');
});

export const connectRedis = async () => {
  try {
    await redisClient.connect();
    logger.info('Connected to Redis', { url: process.env.REDIS_URL || 'redis://127.0.0.1:6379' });
  } catch (error: any) {
    logger.error('Failed to connect to Redis', { error: error?.message, stack: error?.stack });
    // Don't exit process - allow app to run without Redis (fallback to memory store)
  }
};

export { redisClient };
