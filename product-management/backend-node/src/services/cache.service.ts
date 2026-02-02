import { redisClient } from '../config/redis';
import logger from '../utils/logger';
import { getErrorMessage } from '../utils/error-guards';

/**
 * Cache Service - Unified cache layer for the application
 * 
 * Handles caching with Redis as primary and in-memory as fallback.
 * This service provides a consistent interface for caching operations
 * across the application.
 * 
 * Features:
 * - Redis as primary cache (production)
 * - In-memory fallback (when Redis is unavailable)
 * - Automatic failover on Redis errors
 * - TTL support for cache entries
 * - Namespace support for key organization
 */

// In-memory fallback cache
interface CacheEntry {
  value: string;
  expiry?: number;
}

class InMemoryCache {
  private cache: Map<string, CacheEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry && entry.expiry < now) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.debug(`In-memory cache: Cleaned ${cleaned} expired entries`);
    }
  }

  get(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (entry.expiry && entry.expiry < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }

  set(key: string, value: string, ttlSeconds?: number): void {
    const entry: CacheEntry = {
      value,
      expiry: ttlSeconds ? Date.now() + (ttlSeconds * 1000) : undefined
    };
    this.cache.set(key, entry);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    logger.info('In-memory cache cleared');
  }

  keys(pattern?: string): string[] {
    if (!pattern) {
      return Array.from(this.cache.keys());
    }
    
    // Simple pattern matching (supports * wildcard)
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(this.cache.keys()).filter(key => regex.test(key));
  }

  size(): number {
    return this.cache.size;
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

// Initialize in-memory fallback
const memoryCache = new InMemoryCache();

/**
 * Cache Service - Main interface for caching operations
 */
export class CacheService {
  private namespace: string;
  private useRedis: boolean = false;

  constructor(namespace: string = '') {
    this.namespace = namespace;
    this.checkRedisAvailability();
  }

  /**
   * Check if Redis is available
   */
  private checkRedisAvailability(): void {
    this.useRedis = redisClient.isReady;
    
    if (!this.useRedis) {
      logger.debug(`Cache: Using in-memory fallback for namespace "${this.namespace}"`);
    }
  }

  /**
   * Build a namespaced key
   */
  private buildKey(key: string): string {
    return this.namespace ? `${this.namespace}:${key}` : key;
  }

  /**
   * Get a value from cache
   * @param key - Cache key
   * @returns The cached value or null if not found
   */
  async get(key: string): Promise<string | null> {
    const fullKey = this.buildKey(key);
    
    try {
      if (this.useRedis && redisClient.isReady) {
        const value = await redisClient.get(fullKey);
        logger.debug(`Cache: GET ${fullKey} from Redis`, { found: !!value });
        return value;
      }
    } catch (error) {
      logger.warn(`Cache: Redis GET failed for ${fullKey}, using fallback`, {
        error: getErrorMessage(error)
      });
      this.useRedis = false; // Switch to fallback
    }
    
    // Fallback to in-memory
    const value = memoryCache.get(fullKey);
    logger.debug(`Cache: GET ${fullKey} from memory`, { found: !!value });
    return value;
  }

  /**
   * Set a value in cache
   * @param key - Cache key
   * @param value - Value to cache (will be stringified if object)
   * @param ttlSeconds - Time to live in seconds (optional)
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const fullKey = this.buildKey(key);
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    
    try {
      if (this.useRedis && redisClient.isReady) {
        if (ttlSeconds) {
          await redisClient.setEx(fullKey, ttlSeconds, stringValue);
        } else {
          await redisClient.set(fullKey, stringValue);
        }
        logger.debug(`Cache: SET ${fullKey} in Redis`, { ttl: ttlSeconds });
        return;
      }
    } catch (error) {
      logger.warn(`Cache: Redis SET failed for ${fullKey}, using fallback`, {
        error: getErrorMessage(error)
      });
      this.useRedis = false; // Switch to fallback
    }
    
    // Fallback to in-memory
    memoryCache.set(fullKey, stringValue, ttlSeconds);
    logger.debug(`Cache: SET ${fullKey} in memory`, { ttl: ttlSeconds });
  }

  /**
   * Get and parse JSON from cache
   * @param key - Cache key
   * @returns Parsed object or null if not found
   */
  async getJSON<T = any>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`Cache: Failed to parse JSON for ${key}`, {
        error: getErrorMessage(error)
      });
      return null;
    }
  }

  /**
   * Set JSON value in cache
   * @param key - Cache key
   * @param value - Object to cache
   * @param ttlSeconds - Time to live in seconds (optional)
   */
  async setJSON(key: string, value: any, ttlSeconds?: number): Promise<void> {
    return this.set(key, value, ttlSeconds);
  }

  /**
   * Delete a value from cache
   * @param key - Cache key
   * @returns true if deleted, false if not found
   */
  async delete(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);
    
    try {
      if (this.useRedis && redisClient.isReady) {
        const result = await redisClient.del(fullKey);
        logger.debug(`Cache: DELETE ${fullKey} from Redis`, { deleted: result > 0 });
        return result > 0;
      }
    } catch (error) {
      logger.warn(`Cache: Redis DELETE failed for ${fullKey}, using fallback`, {
        error: getErrorMessage(error)
      });
      this.useRedis = false; // Switch to fallback
    }
    
    // Fallback to in-memory
    const deleted = memoryCache.delete(fullKey);
    logger.debug(`Cache: DELETE ${fullKey} from memory`, { deleted });
    return deleted;
  }

  /**
   * Delete multiple keys matching a pattern
   * @param pattern - Key pattern (supports * wildcard)
   * @returns Number of keys deleted
   */
  async deletePattern(pattern: string): Promise<number> {
    const fullPattern = this.buildKey(pattern);
    let deleted = 0;
    
    try {
      if (this.useRedis && redisClient.isReady) {
        const keys = await redisClient.keys(fullPattern);
        if (keys.length > 0) {
          deleted = await redisClient.del(keys);
        }
        logger.debug(`Cache: DELETE pattern ${fullPattern} from Redis`, { deleted });
        return deleted;
      }
    } catch (error) {
      logger.warn(`Cache: Redis DELETE pattern failed for ${fullPattern}, using fallback`, {
        error: getErrorMessage(error)
      });
      this.useRedis = false; // Switch to fallback
    }
    
    // Fallback to in-memory
    const keys = memoryCache.keys(fullPattern);
    for (const key of keys) {
      if (memoryCache.delete(key)) {
        deleted++;
      }
    }
    logger.debug(`Cache: DELETE pattern ${fullPattern} from memory`, { deleted });
    return deleted;
  }

  /**
   * Check if a key exists in cache
   * @param key - Cache key
   * @returns true if exists, false otherwise
   */
  async exists(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);
    
    try {
      if (this.useRedis && redisClient.isReady) {
        const result = await redisClient.exists(fullKey);
        return result > 0;
      }
    } catch (error) {
      logger.warn(`Cache: Redis EXISTS failed for ${fullKey}, using fallback`, {
        error: getErrorMessage(error)
      });
      this.useRedis = false; // Switch to fallback
    }
    
    // Fallback to in-memory
    return memoryCache.get(fullKey) !== null;
  }

  /**
   * Clear all cache entries in this namespace
   */
  async clear(): Promise<void> {
    const pattern = this.namespace ? `${this.namespace}:*` : '*';
    
    try {
      if (this.useRedis && redisClient.isReady) {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
          await redisClient.del(keys);
        }
        logger.info(`Cache: Cleared Redis namespace "${this.namespace}"`);
        return;
      }
    } catch (error) {
      logger.warn(`Cache: Redis CLEAR failed for namespace "${this.namespace}", using fallback`, {
        error: getErrorMessage(error)
      });
      this.useRedis = false; // Switch to fallback
    }
    
    // Fallback to in-memory
    const keys = memoryCache.keys(pattern);
    for (const key of keys) {
      memoryCache.delete(key);
    }
    logger.info(`Cache: Cleared memory namespace "${this.namespace}"`);
  }

  /**
   * Get cache status information
   */
  getStatus(): { using: 'redis' | 'memory'; ready: boolean } {
    this.checkRedisAvailability();
    return {
      using: this.useRedis ? 'redis' : 'memory',
      ready: this.useRedis ? redisClient.isReady : true
    };
  }
}

// Export default instance for general use
export const cacheService = new CacheService('app');

// Export namespaced instances for specific use cases
export const sessionCache = new CacheService('session');
export const tenantCache = new CacheService('tenant');
export const userCache = new CacheService('user');
export const tempCache = new CacheService('temp');

// Export class for custom namespaces
export default CacheService;
