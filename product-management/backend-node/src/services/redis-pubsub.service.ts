/**
 * Redis Pub/Sub Service (Phase 7)
 *
 * Enables cross-service cache invalidation via Redis Pub/Sub.
 * When a prompt is updated/promoted/deleted, publish an event that
 * Java/Python services can subscribe to and invalidate their local caches.
 */

import { createClient, RedisClientType } from 'redis';

export interface CacheInvalidationEvent {
  event: 'prompt_updated' | 'prompt_promoted' | 'prompt_deleted' | 'prompt_archived';
  promptId: string;
  promptVersionId: string;
  tenantId?: string;
  productId?: string;
  channelType: 'voice' | 'chat' | 'sms' | 'whatsapp' | 'email';
  environment: 'development' | 'testing' | 'staging' | 'production';
  timestamp: string;
}

class RedisPubSubService {
  private publisher: RedisClientType | null = null;
  private subscriber: RedisClientType | null = null;
  private readonly CHANNEL = 'pms:cache:invalidate';

  /**
   * Initialize publisher and subscriber clients
   */
  async init(): Promise<void> {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    try {
      // Create separate clients for pub and sub (Redis requirement)
      this.publisher = createClient({ url: redisUrl }) as RedisClientType;
      this.subscriber = createClient({ url: redisUrl }) as RedisClientType;

      await this.publisher.connect();
      await this.subscriber.connect();

      console.log('✅ Redis Pub/Sub clients connected');
    } catch (error: any) {
      console.warn('⚠️  Redis Pub/Sub unavailable:', error.message);
      // Don't throw - gracefully degrade if Redis unavailable
      this.publisher = null;
      this.subscriber = null;
    }
  }

  /**
   * Publish cache invalidation event
   */
  async publishCacheInvalidation(event: CacheInvalidationEvent): Promise<void> {
    if (!this.publisher) {
      console.warn('⚠️  Redis publisher not available, skipping cache invalidation');
      return;
    }

    try {
      const message = JSON.stringify(event);
      const subscriberCount = await this.publisher.publish(this.CHANNEL, message);

      console.log(`📢 Published cache invalidation: ${event.event} for ${event.promptVersionId} (${subscriberCount} subscribers)`);
    } catch (error: any) {
      console.error('❌ Failed to publish cache invalidation:', error.message);
      // Don't throw - cache invalidation is best-effort
    }
  }

  /**
   * Subscribe to cache invalidation events
   * (Primarily for testing, Java/Python services will subscribe directly)
   */
  async subscribe(handler: (event: CacheInvalidationEvent) => void): Promise<void> {
    if (!this.subscriber) {
      console.warn('⚠️  Redis subscriber not available');
      return;
    }

    try {
      await this.subscriber.subscribe(this.CHANNEL, (message) => {
        try {
          const event: CacheInvalidationEvent = JSON.parse(message);
          handler(event);
        } catch (error: any) {
          console.error('❌ Failed to parse cache invalidation event:', error.message);
        }
      });

      console.log(`✅ Subscribed to ${this.CHANNEL}`);
    } catch (error: any) {
      console.error('❌ Failed to subscribe to cache invalidation:', error.message);
    }
  }

  /**
   * Unsubscribe from cache invalidation events
   */
  async unsubscribe(): Promise<void> {
    if (!this.subscriber) return;

    try {
      await this.subscriber.unsubscribe(this.CHANNEL);
      console.log(`✅ Unsubscribed from ${this.CHANNEL}`);
    } catch (error: any) {
      console.error('❌ Failed to unsubscribe:', error.message);
    }
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    try {
      if (this.publisher) await this.publisher.quit();
      if (this.subscriber) await this.subscriber.quit();
      console.log('✅ Redis Pub/Sub clients closed');
    } catch (error: any) {
      console.error('❌ Failed to close Redis Pub/Sub clients:', error.message);
    }
  }
}

// Singleton instance
export const redisPubSubService = new RedisPubSubService();
