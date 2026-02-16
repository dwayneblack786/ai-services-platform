import crypto from 'crypto';
import { getRedisClient } from '../config/redis';
import ProductSignupSessionModel, { IProductSignupSession } from '../models/ProductSignupSession';
import ProductModel from '../models/Product';
import { ObjectId } from 'mongodb';

/**
 * ProductSignupSession Service
 * Manages product signup sessions with Redis as primary storage
 * MongoDB used as fallback and for analytics
 */

const REDIS_PREFIX = 'signup-session:';
const RESUME_TOKEN_PREFIX = 'resume-token:';
const USER_SESSION_RATE_LIMIT_PREFIX = 'session-rate-limit:';
const SESSION_TTL = 60 * 60; // 1 hour in seconds
const RESUME_TOKEN_TTL = 30 * 60; // 30 minutes in seconds
const RATE_LIMIT_WINDOW = 60 * 60; // 1 hour in seconds
const MAX_SESSIONS_PER_HOUR = 5;

export interface SessionCreateParams {
  userId: string;
  tenantId: string;
  productId: string;
  selectedTier?: 'small' | 'medium' | 'large';
  lockedPrice: number;
  currency?: string;
}

export interface SessionUpdateData {
  paymentMethodId?: string;
  termsAccepted?: boolean;
  [key: string]: any;
}

export interface SessionValidationResult {
  valid: boolean;
  reason?: string;
  session?: any;
}

export class ProductSignupSessionService {
  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `sess_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
  }

  /**
   * Generate resume token
   */
  private generateResumeToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Check rate limit for session creation
   */
  private async checkRateLimit(userId: string): Promise<boolean> {
    const redis = getRedisClient();
    const key = `${USER_SESSION_RATE_LIMIT_PREFIX}${userId}`;

    const count = await redis.incr(key);

    if (count === 1) {
      // First session in this window, set expiration
      await redis.expire(key, RATE_LIMIT_WINDOW);
    }

    return count <= MAX_SESSIONS_PER_HOUR;
  }

  /**
   * Store session in Redis
   */
  private async storeInRedis(sessionId: string, sessionData: any): Promise<void> {
    const redis = getRedisClient();
    const key = `${REDIS_PREFIX}${sessionId}`;

    await redis.setEx(key, SESSION_TTL, JSON.stringify(sessionData));
  }

  /**
   * Get session from Redis
   */
  private async getFromRedis(sessionId: string): Promise<any | null> {
    const redis = getRedisClient();
    const key = `${REDIS_PREFIX}${sessionId}`;

    const data = await redis.get(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data);
  }

  /**
   * Update session in Redis
   */
  private async updateInRedis(sessionId: string, updates: any): Promise<void> {
    const redis = getRedisClient();
    const key = `${REDIS_PREFIX}${sessionId}`;

    const existing = await this.getFromRedis(sessionId);

    if (!existing) {
      throw new Error('Session not found in Redis');
    }

    const updated = {
      ...existing,
      ...updates,
      lastAccessedAt: new Date().toISOString()
    };

    await redis.setEx(key, SESSION_TTL, JSON.stringify(updated));
  }

  /**
   * Store resume token in Redis
   */
  private async storeResumeToken(resumeToken: string, sessionId: string): Promise<void> {
    const redis = getRedisClient();
    const key = `${RESUME_TOKEN_PREFIX}${resumeToken}`;

    await redis.setEx(key, RESUME_TOKEN_TTL, sessionId);
  }

  /**
   * Get session ID from resume token
   */
  private async getSessionIdFromToken(resumeToken: string): Promise<string | null> {
    const redis = getRedisClient();
    const key = `${RESUME_TOKEN_PREFIX}${resumeToken}`;

    return await redis.get(key);
  }

  /**
   * Delete resume token (one-time use)
   */
  private async deleteResumeToken(resumeToken: string): Promise<void> {
    const redis = getRedisClient();
    const key = `${RESUME_TOKEN_PREFIX}${resumeToken}`;

    await redis.del(key);
  }

  /**
   * Persist session to MongoDB (for analytics and fallback)
   */
  private async persistToMongo(sessionData: any): Promise<void> {
    try {
      await ProductSignupSessionModel.create(sessionData);
    } catch (error: any) {
      console.error('[ProductSignupSession] Error persisting to MongoDB:', error);
      // Don't throw - Redis is primary, Mongo is fallback
    }
  }

  /**
   * Create a new signup session
   */
  async createSession(params: SessionCreateParams): Promise<{ sessionId: string; resumeToken: string; expiresAt: Date }> {
    const { userId, tenantId, productId, selectedTier, lockedPrice, currency = 'USD' } = params;

    // Check rate limit
    const allowedByRateLimit = await this.checkRateLimit(userId);

    if (!allowedByRateLimit) {
      throw new Error('Rate limit exceeded. Maximum 5 sessions per hour.');
    }

    // Validate product exists
    const product = await ProductModel.findById(productId);

    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    // Validate product is active
    if (product.status !== 'active') {
      throw new Error(`Product is not active: ${product.status}`);
    }

    // Validate tier if subscription model
    if (product.pricing.model === 'subscription' && selectedTier) {
      const tier = product.pricing.tiers?.find(t => t.name === selectedTier);

      if (!tier) {
        throw new Error(`Invalid pricing tier: ${selectedTier}`);
      }
    }

    const sessionId = this.generateSessionId();
    const resumeToken = this.generateResumeToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL * 1000);

    const sessionData = {
      sessionId,
      userId: new ObjectId(userId),
      tenantId,
      productId: new ObjectId(productId),
      selectedTierId: selectedTier,
      lockedPrice,
      currency,
      termsAccepted: false,
      paymentValidated: false,
      currentStep: 'initiated',
      resumeToken,
      resumeTokenUsed: false,
      lastAccessedAt: now.toISOString(),
      metadata: {},
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    // Store in Redis (primary)
    await this.storeInRedis(sessionId, sessionData);

    // Store resume token mapping
    await this.storeResumeToken(resumeToken, sessionId);

    // Persist to MongoDB (fallback/analytics)
    await this.persistToMongo(sessionData);

    console.log(`[ProductSignupSession] Created session: ${sessionId} for user: ${userId}`);

    return {
      sessionId,
      resumeToken,
      expiresAt
    };
  }

  /**
   * Get active session for user and product
   */
  async getActiveSession(userId: string, productId: string): Promise<any | null> {
    // Check MongoDB for active sessions (since Redis sessions expire)
    const session = await ProductSignupSessionModel.findOne({
      userId: new ObjectId(userId),
      productId: new ObjectId(productId),
      completedSubscriptionId: null,
      cancelledAt: null,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    if (!session) {
      return null;
    }

    // Try to get from Redis first
    const redisSession = await this.getFromRedis(session.sessionId);

    if (redisSession) {
      return redisSession;
    }

    // If not in Redis but in Mongo (and not expired), restore to Redis
    const sessionData = session.toObject();
    await this.storeInRedis(session.sessionId, sessionData);

    return sessionData;
  }

  /**
   * Update session step
   */
  async updateStep(
    sessionId: string,
    userId: string,
    step: 'tier-selected' | 'payment-validated' | 'complete',
    data?: SessionUpdateData
  ): Promise<any> {
    const session = await this.getFromRedis(sessionId);

    if (!session) {
      throw new Error('Session not found or expired');
    }

    // Security: Verify ownership
    if (session.userId.toString() !== userId) {
      throw new Error('Unauthorized: Session does not belong to user');
    }

    const updates: any = {
      currentStep: step,
      updatedAt: new Date().toISOString()
    };

    if (data) {
      Object.assign(updates, data);

      // Merge metadata
      if (data.metadata) {
        updates.metadata = { ...session.metadata, ...data.metadata };
      }
    }

    // Update in Redis
    await this.updateInRedis(sessionId, updates);

    // If payment validated, persist to MongoDB (important milestone)
    if (step === 'payment-validated') {
      try {
        await ProductSignupSessionModel.findOneAndUpdate(
          { sessionId },
          { $set: updates },
          { upsert: true }
        );
      } catch (error: any) {
        console.error('[ProductSignupSession] Error updating MongoDB:', error);
      }
    }

    return { ...session, ...updates };
  }

  /**
   * Validate session
   */
  async validateSession(sessionId: string, userId: string): Promise<SessionValidationResult> {
    const session = await this.getFromRedis(sessionId);

    if (!session) {
      return {
        valid: false,
        reason: 'Session not found or expired'
      };
    }

    // Security: Verify ownership
    if (session.userId.toString() !== userId) {
      return {
        valid: false,
        reason: 'Unauthorized'
      };
    }

    // Check expiration with 5-minute grace period
    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    const gracePeriod = 5 * 60 * 1000; // 5 minutes

    if (now.getTime() > expiresAt.getTime() + gracePeriod) {
      return {
        valid: false,
        reason: 'Session expired'
      };
    }

    // Validate product still exists and is active
    const product = await ProductModel.findById(session.productId);

    if (!product) {
      return {
        valid: false,
        reason: 'Product no longer available'
      };
    }

    if (product.status !== 'active') {
      return {
        valid: false,
        reason: 'Product is no longer active'
      };
    }

    // Validate pricing tier still exists
    if (session.selectedTierId) {
      const tier = product.pricing.tiers?.find(t => t.name === session.selectedTierId);

      if (!tier) {
        return {
          valid: false,
          reason: 'Selected pricing tier no longer available'
        };
      }
    }

    return {
      valid: true,
      session
    };
  }

  /**
   * Validate resume token
   */
  async validateResumeToken(resumeToken: string): Promise<SessionValidationResult> {
    const sessionId = await this.getSessionIdFromToken(resumeToken);

    if (!sessionId) {
      return {
        valid: false,
        reason: 'Resume token expired or already used'
      };
    }

    const session = await this.getFromRedis(sessionId);

    if (!session) {
      return {
        valid: false,
        reason: 'Session not found'
      };
    }

    if (session.resumeTokenUsed) {
      return {
        valid: false,
        reason: 'Resume token already used'
      };
    }

    // Mark token as used (one-time use security)
    await this.updateInRedis(sessionId, { resumeTokenUsed: true });

    // Delete the resume token from Redis
    await this.deleteResumeToken(resumeToken);

    return {
      valid: true,
      session
    };
  }

  /**
   * Record charge attempt (payment replay protection)
   */
  async recordChargeAttempt(sessionId: string): Promise<void> {
    const session = await this.getFromRedis(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    // Check if last charge was within 60 seconds
    if (session.lastChargeAttempt) {
      const lastAttempt = new Date(session.lastChargeAttempt);
      const now = new Date();
      const secondsSinceLastAttempt = (now.getTime() - lastAttempt.getTime()) / 1000;

      if (secondsSinceLastAttempt < 60) {
        throw new Error(`Please wait ${Math.ceil(60 - secondsSinceLastAttempt)} seconds before retrying`);
      }
    }

    await this.updateInRedis(sessionId, {
      lastChargeAttempt: new Date().toISOString()
    });
  }

  /**
   * Complete session (mark as successful)
   */
  async completeSession(sessionId: string, subscriptionId: string): Promise<any> {
    const session = await this.getFromRedis(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    const updates = {
      currentStep: 'complete',
      completedSubscriptionId: subscriptionId,
      updatedAt: new Date().toISOString()
    };

    // Update in Redis
    await this.updateInRedis(sessionId, updates);

    // Persist completion to MongoDB
    try {
      await ProductSignupSessionModel.findOneAndUpdate(
        { sessionId },
        { $set: updates },
        { upsert: true }
      );
    } catch (error: any) {
      console.error('[ProductSignupSession] Error completing in MongoDB:', error);
    }

    return { ...session, ...updates };
  }

  /**
   * Cancel session
   */
  async cancelSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.getFromRedis(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    // Security: Verify ownership
    if (session.userId.toString() !== userId) {
      throw new Error('Unauthorized');
    }

    const updates = {
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Update in Redis
    await this.updateInRedis(sessionId, updates);

    // Persist cancellation to MongoDB
    try {
      await ProductSignupSessionModel.findOneAndUpdate(
        { sessionId },
        { $set: updates },
        { upsert: true }
      );
    } catch (error: any) {
      console.error('[ProductSignupSession] Error cancelling in MongoDB:', error);
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<any | null> {
    // Try Redis first
    const redisSession = await this.getFromRedis(sessionId);

    if (redisSession) {
      return redisSession;
    }

    // Fallback to MongoDB
    const mongoSession = await ProductSignupSessionModel.findOne({ sessionId });

    if (!mongoSession) {
      return null;
    }

    const sessionData = mongoSession.toObject();

    // Restore to Redis if not expired
    if (new Date(sessionData.expiresAt) > new Date()) {
      await this.storeInRedis(sessionId, sessionData);
    }

    return sessionData;
  }
}

// Singleton instance
export const productSignupSessionService = new ProductSignupSessionService();
