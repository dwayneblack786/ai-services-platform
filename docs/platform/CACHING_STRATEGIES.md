# Caching Strategies & Performance Optimization

📑 **Table of Contents**
- [Overview](#overview)
- [In-Memory Caching](#in-memory-caching)
  - [Simple Memory Cache](#simple-memory-cache)
  - [LRU Cache (Least Recently Used)](#lru-cache-least-recently-used)
- [Redis Caching](#redis-caching)
  - [Redis Setup](#redis-setup)
  - [Redis Cache Service](#redis-cache-service)
  - [Cache-Aside Pattern](#cache-aside-pattern)
  - [Write-Through Cache](#write-through-cache)
- [Cache Invalidation Strategies](#cache-invalidation-strategies)
  - [Time-Based Invalidation (TTL)](#time-based-invalidation-ttl)
  - [Event-Based Invalidation](#event-based-invalidation)
  - [Dependency-Based Invalidation](#dependency-based-invalidation)
- [Cache Warming](#cache-warming)
- [Cache Patterns Performance](#cache-patterns-performance)
- [Multi-Level Caching](#multi-level-caching)
- [Caching Best Practices Checklist](#caching-best-practices-checklist)
- [Related Documentation](#related-documentation)

---

## Overview

This guide covers caching patterns, cache invalidation strategies, performance optimization, and memory management in Node.js applications.

**NOTE - Implementation Status:** This document describes recommended production-grade caching patterns. Current implementation in the backend uses basic session-based caching. For production deployments with horizontal scaling, Redis integration is recommended.

**Caching Principles:**
- Cache hot data frequently accessed
- Implement proper TTL (time-to-live)
- Cache invalidation on updates
- Monitor memory usage
- Use appropriate cache levels

## In-Memory Caching

### Simple Memory Cache

```typescript
// src/services/memoryCache.ts
export class MemoryCache<T> {
  private cache: Map<string, { data: T; expiry: number }> = new Map();
  private stats = { hits: 0, misses: 0, sets: 0 };

  set(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    const expiry = Date.now() + ttlMs;
    this.cache.set(key, { data, expiry });
    this.stats.sets++;
  }

  get(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) {
      this.stats.misses++;
      return null;
    }

    // Check expiration
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return item.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(pattern?: string): void {
    if (pattern) {
      const regex = new RegExp(pattern);
      Array.from(this.cache.keys())
        .filter(key => regex.test(key))
        .forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total === 0 ? 0 : (this.stats.hits / total) * 100,
      size: this.cache.size,
    };
  }
}

// Usage
const cache = new MemoryCache<any>();

export async function getProductWithCache(productId: string) {
  const cached = cache.get(`product:${productId}`);
  if (cached) {
    return cached;
  }

  const product = await Product.findById(productId);
  cache.set(`product:${productId}`, product, 5 * 60 * 1000);
  return product;
}
```

### LRU Cache (Least Recently Used)

```typescript
// src/services/lruCache.ts
/**
 * LRU cache with automatic eviction
 */
export class LRUCache<T> {
  private cache: Map<string, T> = new Map();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: string): T | undefined {
    const value = this.cache.get(key);
    if (value) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: string, value: T): void {
    // Remove if exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // Add to end
    this.cache.set(key, value);

    // Evict least recently used if over capacity
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}
```

## Redis Caching

### Redis Setup

```typescript
// src/config/redis.ts
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  enableReadyCheck: false,
  enableOfflineQueue: false,
});

redis.on('connect', () => console.log('Redis connected'));
redis.on('error', (err) => console.error('Redis error:', err));

export default redis;
```

### Redis Cache Service

```typescript
// src/services/redisCache.ts
import redis from '../config/redis';

export class RedisCache {
  /**
   * Set cache with TTL
   */
  static async set(
    key: string,
    value: any,
    ttlSeconds: number = 300
  ): Promise<void> {
    const serialized = JSON.stringify(value);
    await redis.setex(key, ttlSeconds, serialized);
  }

  /**
   * Get cache value
   */
  static async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    if (!value) {
      return null;
    }
    return JSON.parse(value) as T;
  }

  /**
   * Get or compute (cache-aside pattern)
   */
  static async getOrCompute<T>(
    key: string,
    compute: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached) {
      return cached;
    }

    // Compute if not in cache
    const value = await compute();

    // Store in cache
    await this.set(key, value, ttlSeconds);

    return value;
  }

  /**
   * Increment counter
   */
  static async increment(key: string, amount: number = 1): Promise<number> {
    return redis.incrby(key, amount);
  }

  /**
   * Add to set (for multi-valued cache)
   */
  static async addToSet(key: string, ...values: any[]): Promise<void> {
    if (values.length > 0) {
      await redis.sadd(key, ...values);
    }
  }

  /**
   * Get all from set
   */
  static async getSet<T>(key: string): Promise<T[]> {
    const values = await redis.smembers(key);
    return values.map(v => JSON.parse(v)) as T[];
  }

  /**
   * Delete cache
   */
  static async delete(key: string): Promise<void> {
    await redis.del(key);
  }

  /**
   * Clear cache by pattern
   */
  static async deletePattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}
```

### Cache-Aside Pattern

```typescript
// src/services/productService.ts
export class ProductService {
  async getProduct(productId: string): Promise<Product | null> {
    const cacheKey = `product:${productId}`;

    try {
      // Try cache first
      const cached = await RedisCache.get<Product>(cacheKey);
      if (cached) {
        console.log('Cache hit:', cacheKey);
        return cached;
      }
    } catch (error) {
      console.error('Cache read error:', error);
      // Continue without cache if Redis fails
    }

    // Fetch from database
    const product = await Product.findById(productId);

    // Update cache
    if (product) {
      try {
        await RedisCache.set(cacheKey, product, 5 * 60); // 5 minutes
      } catch (error) {
        console.error('Cache write error:', error);
        // Continue even if cache write fails
      }
    }

    return product;
  }

  async updateProduct(productId: string, updates: any): Promise<Product> {
    const product = await Product.findByIdAndUpdate(productId, updates, {
      new: true,
    });

    // Invalidate cache
    try {
      await RedisCache.delete(`product:${productId}`);
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }

    return product;
  }
}
```

### Write-Through Cache

```typescript
// src/services/writeThoughCache.ts
/**
 * Write-through: data written to cache and database simultaneously
 */
export async function saveProductWithCache(productData: any) {
  const product = new Product(productData);
  await product.save();

  // Write to cache
  const cacheKey = `product:${product._id}`;
  await RedisCache.set(cacheKey, product.toObject(), 5 * 60);

  return product;
}
```

## Cache Invalidation Strategies

### Time-Based Invalidation (TTL)

```typescript
// Automatic expiration
await RedisCache.set('product:123', productData, 300); // 5 minutes
// Cache automatically expires after 5 minutes
```

### Event-Based Invalidation

```typescript
// src/services/eventBus.ts
import EventEmitter from 'events';

const eventBus = new EventEmitter();

// Listen for product updates
eventBus.on('product:updated', async (productId: string) => {
  await RedisCache.delete(`product:${productId}`);
});

// Emit when product changes
export async function updateProduct(productId: string, updates: any) {
  const product = await Product.findByIdAndUpdate(productId, updates, {
    new: true,
  });
  eventBus.emit('product:updated', productId);
  return product;
}
```

### Dependency-Based Invalidation

```typescript
// src/services/dependencyCache.ts
export class CacheManager {
  private dependencies: Map<string, Set<string>> = new Map();

  registerDependency(cacheKey: string, dependency: string) {
    if (!this.dependencies.has(dependency)) {
      this.dependencies.set(dependency, new Set());
    }
    this.dependencies.get(dependency)!.add(cacheKey);
  }

  async invalidateDependency(dependency: string): Promise<void> {
    const dependentKeys = this.dependencies.get(dependency);
    if (dependentKeys) {
      for (const key of dependentKeys) {
        await RedisCache.delete(key);
      }
    }
  }
}

// Usage
const cacheManager = new CacheManager();

export async function getTenantAnalytics(tenantId: string) {
  const cacheKey = `analytics:${tenantId}`;
  cacheManager.registerDependency(cacheKey, `tenant:${tenantId}`);

  return RedisCache.getOrCompute(cacheKey, () =>
    computeAnalytics(tenantId),
    10 * 60
  );
}
```

## Cache Warming

```typescript
// src/services/cacheWarmer.ts
export class CacheWarmer {
  /**
   * Pre-populate cache with frequently accessed data
   */
  static async warmProductCache(): Promise<void> {
    const products = await Product.find({ status: 'active' });

    for (const product of products) {
      const cacheKey = `product:${product._id}`;
      await RedisCache.set(cacheKey, product.toObject(), 10 * 60);
    }

    console.log(`Warmed ${products.length} products in cache`);
  }

  /**
   * Scheduled cache warming
   */
  static startCacheWarmingSchedule(): void {
    // Warm cache every 4 hours
    setInterval(() => {
      this.warmProductCache().catch(err => {
        console.error('Cache warming failed:', err);
      });
    }, 4 * 60 * 60 * 1000);

    // Initial warm on startup
    this.warmProductCache();
  }
}

// In app startup
CacheWarmer.startCacheWarmingSchedule();
```

## Cache Patterns Performance

```typescript
// src/monitoring/cacheMetrics.ts
export class CacheMetrics {
  private static metrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };

  static recordHit(): void {
    this.metrics.hits++;
  }

  static recordMiss(): void {
    this.metrics.misses++;
  }

  static getStats() {
    const total = this.metrics.hits + this.metrics.misses;
    return {
      ...this.metrics,
      hitRate: total === 0 ? 0 : ((this.metrics.hits / total) * 100).toFixed(2),
    };
  }
}

export async function monitorCachePerformance() {
  setInterval(() => {
    const stats = CacheMetrics.getStats();
    console.log('Cache Performance:', stats);

    // Alert if hit rate drops below 50%
    if (parseFloat(stats.hitRate) < 50) {
      console.warn('Low cache hit rate detected');
    }
  }, 60000); // Log every minute
}
```

## Multi-Level Caching

```typescript
// src/services/multiLevelCache.ts
/**
 * Combination of in-memory and Redis caching
 */
export class MultiLevelCache<T> {
  private memoryCache = new LRUCache<T>(100);

  async get(key: string): Promise<T | null> {
    // Level 1: Memory
    let value = this.memoryCache.get(key);
    if (value) {
      return value;
    }

    // Level 2: Redis
    value = await RedisCache.get<T>(key);
    if (value) {
      // Repopulate memory cache
      this.memoryCache.set(key, value);
      return value;
    }

    return null;
  }

  async set(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    // Write to both levels
    this.memoryCache.set(key, value);
    await RedisCache.set(key, value, ttlSeconds);
  }

  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);
    await RedisCache.delete(key);
  }
}
```

## Caching Best Practices Checklist

- [ ] Identify cacheable data (read-heavy, slow to compute)
- [ ] Set appropriate TTLs based on data freshness requirements
- [ ] Implement cache invalidation strategy
- [ ] Monitor cache hit/miss rates
- [ ] Handle cache failures gracefully (fallback to database)
- [ ] Use Redis for distributed caching
- [ ] Implement cache warming for hot data
- [ ] Set memory limits to prevent out-of-memory errors
- [ ] Use multi-level caching strategically
- [ ] Cache responses at multiple layers (HTTP, service, database)
- [ ] Implement cache dependency tracking
- [ ] Test cache behavior under load
- [ ] Use cache versioning for cache busting
- [ ] Monitor memory usage regularly
- [ ] Document cache keys and TTLs

## Related Documentation

- [BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md) - Backend structure
- [SERVICE_PATTERNS.md](SERVICE_PATTERNS.md) - Service patterns
- [LOGGING_MONITORING.md](LOGGING_MONITORING.md) - Performance monitoring
- [PERFORMANCE_OPTIMIZATION.md](PERFORMANCE_OPTIMIZATION.md) - Performance techniques

