/**
 * Mock Redis Helper
 * Simple in-memory Redis mock for testing
 */

export class MockRedis {
  private store: Map<string, { value: string; expiry: number | null }> = new Map();

  /**
   * Set key-value pair
   */
  async set(key: string, value: string): Promise<'OK'> {
    this.store.set(key, { value, expiry: null });
    return 'OK';
  }

  /**
   * Set key-value pair with expiration (seconds)
   */
  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    const expiry = Date.now() + seconds * 1000;
    this.store.set(key, { value, expiry });
    return 'OK';
  }

  /**
   * Get value by key
   */
  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    
    if (!item) {
      return null;
    }
    
    // Check expiration
    if (item.expiry && Date.now() > item.expiry) {
      this.store.delete(key);
      return null;
    }
    
    return item.value;
  }

  /**
   * Delete key
   */
  async del(key: string): Promise<number> {
    const existed = this.store.has(key);
    this.store.delete(key);
    return existed ? 1 : 0;
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<number> {
    const item = this.store.get(key);
    
    if (!item) {
      return 0;
    }
    
    // Check expiration
    if (item.expiry && Date.now() > item.expiry) {
      this.store.delete(key);
      return 0;
    }
    
    return 1;
  }

  /**
   * Set expiration on existing key (seconds)
   */
  async expire(key: string, seconds: number): Promise<number> {
    const item = this.store.get(key);
    
    if (!item) {
      return 0;
    }
    
    item.expiry = Date.now() + seconds * 1000;
    return 1;
  }

  /**
   * Get time to live for key (seconds)
   */
  async ttl(key: string): Promise<number> {
    const item = this.store.get(key);
    
    if (!item) {
      return -2; // Key doesn't exist
    }
    
    if (!item.expiry) {
      return -1; // No expiration
    }
    
    const remaining = item.expiry - Date.now();
    return Math.ceil(remaining / 1000);
  }

  /**
   * Clear all keys
   */
  async flushall(): Promise<'OK'> {
    this.store.clear();
    return 'OK';
  }

  /**
   * Get all keys matching pattern
   */
  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const matchingKeys: string[] = [];
    
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        matchingKeys.push(key);
      }
    }
    
    return matchingKeys;
  }

  /**
   * Disconnect (no-op for mock)
   */
  async disconnect(): Promise<void> {
    this.store.clear();
  }
}

/**
 * Create a new mock Redis instance
 */
export function createMockRedis(): MockRedis {
  return new MockRedis();
}
