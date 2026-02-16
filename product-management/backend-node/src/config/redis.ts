import { createClient } from 'redis';
import logger from '../utils/logger';
import { env } from './env';
import { getErrorMessage } from '../utils/error-guards';

const redisClient = createClient({
  url: env.REDIS_URL,
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
    logger.info('Connected to Redis', { url: env.REDIS_URL });
  } catch (error: unknown) {
    logger.error('Failed to connect to Redis', { error: getErrorMessage(error) });
    // Don't exit process - allow app to run without Redis (fallback to memory store)
  }
};

export const getRedisClient = () => {
  if (!redisClient.isOpen) {
    throw new Error('Redis client is not connected');
  }
  return redisClient;
};

export { redisClient };
