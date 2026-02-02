/**
 * Cache Client - Unified caching layer for frontend
 * 
 * Provides a consistent interface for caching operations with:
 * - Backend Redis cache as primary (via API)
 * - localStorage as fallback (when backend is unavailable)
 * - Automatic failover on network errors
 * - TTL support for cache entries
 * - Namespace support for key organization
 * 
 * Usage:
 * ```typescript
 * import { cacheClient } from './services/cacheClient';
 * 
 * // Set a value
 * await cacheClient.set('user-prefs', { theme: 'dark' }, 3600);
 * 
 * // Get a value
 * const prefs = await cacheClient.get('user-prefs');
 * 
 * // Delete a value
 * await cacheClient.delete('user-prefs');
 * ```
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const CACHE_API_ENDPOINT = `${API_BASE_URL}/api/cache`;

// Storage backend type
type StorageBackend = 'backend' | 'localStorage';

// Cache entry with metadata
interface CacheEntry {
  value: string;
  expiry?: number;
  timestamp: number;
}

export class CacheClient {
  private namespace: string;
  private useBackend: boolean = true;
  private backendCheckTimer: number | null = null;

  constructor(namespace: string = '') {
    this.namespace = namespace;
    this.checkBackendAvailability();
    
    // Periodically check backend availability (every 30 seconds)
    this.backendCheckTimer = setInterval(() => {
      this.checkBackendAvailability();
    }, 30000);
  }

  /**
   * Check if backend cache API is available
   */
  private async checkBackendAvailability(): Promise<void> {
    try {
      const response = await axios.get(`${CACHE_API_ENDPOINT}/health`, {
        timeout: 2000,
        withCredentials: true
      });
      this.useBackend = response.data?.status === 'ok';
    } catch (error) {
      this.useBackend = false;
      console.debug(`Cache: Backend unavailable, using localStorage fallback`);
    }
  }

  /**
   * Build a namespaced key
   */
  private buildKey(key: string): string {
    return this.namespace ? `${this.namespace}:${key}` : key;
  }

  /**
   * Get from localStorage with TTL support
   */
  private getFromLocalStorage(key: string): string | null {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;

      const entry: CacheEntry = JSON.parse(item);
      
      // Check expiry
      if (entry.expiry && entry.expiry < Date.now()) {
        localStorage.removeItem(key);
        return null;
      }

      return entry.value;
    } catch (error) {
      console.error(`Cache: Error reading from localStorage for ${key}:`, error);
      return null;
    }
  }

  /**
   * Set in localStorage with TTL support
   */
  private setInLocalStorage(key: string, value: string, ttlSeconds?: number): void {
    try {
      const entry: CacheEntry = {
        value,
        timestamp: Date.now(),
        expiry: ttlSeconds ? Date.now() + (ttlSeconds * 1000) : undefined
      };
      localStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      console.error(`Cache: Error writing to localStorage for ${key}:`, error);
      // Handle quota exceeded
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('Cache: localStorage quota exceeded, clearing old entries');
        this.clearExpiredLocalStorage();
      }
    }
  }

  /**
   * Clear expired entries from localStorage
   */
  private clearExpiredLocalStorage(): void {
    const now = Date.now();
    let cleared = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      try {
        const item = localStorage.getItem(key);
        if (!item) continue;

        const entry: CacheEntry = JSON.parse(item);
        if (entry.expiry && entry.expiry < now) {
          localStorage.removeItem(key);
          cleared++;
          i--; // Adjust index after removal
        }
      } catch {
        // Skip invalid entries
      }
    }

    console.debug(`Cache: Cleared ${cleared} expired localStorage entries`);
  }

  /**
   * Get a value from cache
   * @param key - Cache key
   * @returns The cached value or null if not found
   */
  async get(key: string): Promise<string | null> {
    const fullKey = this.buildKey(key);

    // Try backend first
    if (this.useBackend) {
      try {
        const response = await axios.get(`${CACHE_API_ENDPOINT}/${encodeURIComponent(fullKey)}`, {
          timeout: 3000,
          withCredentials: true
        });
        
        if (response.data?.value !== undefined) {
          console.debug(`Cache: GET ${fullKey} from backend`);
          return response.data.value;
        }
      } catch (error) {
        console.warn(`Cache: Backend GET failed for ${fullKey}, using localStorage:`, error);
        this.useBackend = false; // Switch to fallback
      }
    }

    // Fallback to localStorage
    const value = this.getFromLocalStorage(fullKey);
    console.debug(`Cache: GET ${fullKey} from localStorage`, { found: !!value });
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

    // Try backend first
    if (this.useBackend) {
      try {
        await axios.post(
          CACHE_API_ENDPOINT,
          {
            key: fullKey,
            value: stringValue,
            ttl: ttlSeconds
          },
          {
            timeout: 3000,
            withCredentials: true
          }
        );
        console.debug(`Cache: SET ${fullKey} in backend`, { ttl: ttlSeconds });
        
        // Also store in localStorage as backup
        this.setInLocalStorage(fullKey, stringValue, ttlSeconds);
        return;
      } catch (error) {
        console.warn(`Cache: Backend SET failed for ${fullKey}, using localStorage:`, error);
        this.useBackend = false; // Switch to fallback
      }
    }

    // Fallback to localStorage
    this.setInLocalStorage(fullKey, stringValue, ttlSeconds);
    console.debug(`Cache: SET ${fullKey} in localStorage`, { ttl: ttlSeconds });
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
      console.error(`Cache: Failed to parse JSON for ${key}:`, error);
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

    // Try backend first
    if (this.useBackend) {
      try {
        await axios.delete(`${CACHE_API_ENDPOINT}/${encodeURIComponent(fullKey)}`, {
          timeout: 3000,
          withCredentials: true
        });
        console.debug(`Cache: DELETE ${fullKey} from backend`);
        
        // Also delete from localStorage
        localStorage.removeItem(fullKey);
        return true;
      } catch (error) {
        console.warn(`Cache: Backend DELETE failed for ${fullKey}, using localStorage:`, error);
        this.useBackend = false; // Switch to fallback
      }
    }

    // Fallback to localStorage
    try {
      localStorage.removeItem(fullKey);
      console.debug(`Cache: DELETE ${fullKey} from localStorage`);
      return true;
    } catch (error) {
      console.error(`Cache: Error deleting from localStorage for ${fullKey}:`, error);
      return false;
    }
  }

  /**
   * Check if a key exists in cache
   * @param key - Cache key
   * @returns true if exists, false otherwise
   */
  async exists(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  /**
   * Clear all cache entries in this namespace
   */
  async clear(): Promise<void> {
    const pattern = this.namespace ? `${this.namespace}:` : '';

    // Try backend first
    if (this.useBackend) {
      try {
        await axios.post(
          `${CACHE_API_ENDPOINT}/clear`,
          { namespace: this.namespace },
          {
            timeout: 3000,
            withCredentials: true
          }
        );
        console.debug(`Cache: Cleared backend namespace "${this.namespace}"`);
      } catch (error) {
        console.warn(`Cache: Backend CLEAR failed for namespace "${this.namespace}":`, error);
        this.useBackend = false; // Switch to fallback
      }
    }

    // Clear from localStorage
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(pattern)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.debug(`Cache: Cleared localStorage namespace "${this.namespace}" (${keysToRemove.length} keys)`);
    } catch (error) {
      console.error(`Cache: Error clearing localStorage namespace "${this.namespace}":`, error);
    }
  }

  /**
   * Get cache status information
   */
  getStatus(): { using: StorageBackend; available: boolean } {
    return {
      using: this.useBackend ? 'backend' : 'localStorage',
      available: true // localStorage is always available in browsers
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.backendCheckTimer) {
      clearInterval(this.backendCheckTimer);
      this.backendCheckTimer = null;
    }
  }
}

// Export default instances for common use cases
export const cacheClient = new CacheClient('app');
export const userCache = new CacheClient('user');
export const sessionCache = new CacheClient('session');
export const tempCache = new CacheClient('temp');

// Export class for custom namespaces
export default CacheClient;
