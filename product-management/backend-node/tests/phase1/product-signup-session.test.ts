import { productSignupSessionService } from '../../src/services/productSignupSession.service';
import { getRedisClient } from '../../src/config/redis';
import ProductSignupSessionModel from '../../src/models/ProductSignupSession';
import ProductModel from '../../src/models/Product';

/**
 * Phase 1 Validation Tests
 * Tests for ProductSignupSession service with Redis storage
 */

describe('ProductSignupSession Service - Phase 1', () => {
  const testUserId = '507f1f77bcf86cd799439011';
  const testTenantId = 'test-tenant-123';
  const testProductId = '507f1f77bcf86cd799439012';

  beforeAll(async () => {
    // Ensure Redis is connected
    try {
      const redis = getRedisClient();
      await redis.ping();
      console.log('✅ Redis connected for tests');
    } catch (error) {
      console.error('❌ Redis not connected:', error);
      throw error;
    }
  });

  afterEach(async () => {
    // Cleanup test data from Redis and MongoDB
    const redis = getRedisClient();
    const keys = await redis.keys('signup-session:*');
    if (keys.length > 0) {
      await redis.del(keys);
    }

    const resumeKeys = await redis.keys('resume-token:*');
    if (resumeKeys.length > 0) {
      await redis.del(resumeKeys);
    }

    await ProductSignupSessionModel.deleteMany({ tenantId: testTenantId });
  });

  describe('Session Creation', () => {
    it('should create a session with unique sessionId and resumeToken', async () => {
      const mockProduct = {
        _id: testProductId,
        name: 'Test Product',
        status: 'active',
        pricing: {
          model: 'subscription',
          currency: 'USD',
          tiers: [
            { name: 'small', price: 10, displayName: 'Small', description: 'Small tier', features: [] }
          ]
        }
      };

      // Mock ProductModel.findById
      jest.spyOn(ProductModel, 'findById').mockResolvedValueOnce(mockProduct as any);

      const result = await productSignupSessionService.createSession({
        userId: testUserId,
        tenantId: testTenantId,
        productId: testProductId,
        selectedTier: 'small',
        lockedPrice: 10,
        currency: 'USD'
      });

      expect(result.sessionId).toBeDefined();
      expect(result.sessionId).toMatch(/^sess_/);
      expect(result.resumeToken).toBeDefined();
      expect(result.expiresAt).toBeInstanceOf(Date);

      // Verify stored in Redis
      const redis = getRedisClient();
      const stored = await redis.get(`signup-session:${result.sessionId}`);
      expect(stored).not.toBeNull();

      const session = JSON.parse(stored!);
      expect(session.userId).toBe(testUserId);
      expect(session.productId).toBe(testProductId);
      expect(session.lockedPrice).toBe(10);
    });

    it('should enforce rate limit (max 5 sessions per hour)', async () => {
      const mockProduct = {
        _id: testProductId,
        name: 'Test Product',
        status: 'active',
        pricing: { model: 'subscription', currency: 'USD', tiers: [] }
      };

      jest.spyOn(ProductModel, 'findById').mockResolvedValue(mockProduct as any);

      // Create 5 sessions
      for (let i = 0; i < 5; i++) {
        await productSignupSessionService.createSession({
          userId: testUserId,
          tenantId: testTenantId,
          productId: testProductId,
          lockedPrice: 10
        });
      }

      // 6th session should fail
      await expect(
        productSignupSessionService.createSession({
          userId: testUserId,
          tenantId: testTenantId,
          productId: testProductId,
          lockedPrice: 10
        })
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should fail if product does not exist', async () => {
      jest.spyOn(ProductModel, 'findById').mockResolvedValueOnce(null);

      await expect(
        productSignupSessionService.createSession({
          userId: testUserId,
          tenantId: testTenantId,
          productId: 'invalid-product-id',
          lockedPrice: 10
        })
      ).rejects.toThrow('Product not found');
    });

    it('should fail if product is not active', async () => {
      const inactiveProduct = {
        _id: testProductId,
        name: 'Inactive Product',
        status: 'coming-soon',
        pricing: { model: 'subscription', currency: 'USD', tiers: [] }
      };

      jest.spyOn(ProductModel, 'findById').mockResolvedValueOnce(inactiveProduct as any);

      await expect(
        productSignupSessionService.createSession({
          userId: testUserId,
          tenantId: testTenantId,
          productId: testProductId,
          lockedPrice: 10
        })
      ).rejects.toThrow('Product is not active');
    });
  });

  describe('Session Update', () => {
    it('should update session step and data', async () => {
      const mockProduct = {
        _id: testProductId,
        status: 'active',
        pricing: { model: 'subscription', currency: 'USD', tiers: [] }
      };

      jest.spyOn(ProductModel, 'findById').mockResolvedValue(mockProduct as any);

      const { sessionId } = await productSignupSessionService.createSession({
        userId: testUserId,
        tenantId: testTenantId,
        productId: testProductId,
        lockedPrice: 10
      });

      const updated = await productSignupSessionService.updateStep(
        sessionId,
        testUserId,
        'payment-validated',
        {
          paymentMethodId: 'pm_test123',
          termsAccepted: true
        }
      );

      expect(updated.currentStep).toBe('payment-validated');
      expect(updated.paymentMethodId).toBe('pm_test123');
      expect(updated.termsAccepted).toBe(true);
    });

    it('should prevent unauthorized user from updating session', async () => {
      const mockProduct = {
        _id: testProductId,
        status: 'active',
        pricing: { model: 'subscription', currency: 'USD', tiers: [] }
      };

      jest.spyOn(ProductModel, 'findById').mockResolvedValue(mockProduct as any);

      const { sessionId } = await productSignupSessionService.createSession({
        userId: testUserId,
        tenantId: testTenantId,
        productId: testProductId,
        lockedPrice: 10
      });

      await expect(
        productSignupSessionService.updateStep(
          sessionId,
          'different-user-id',
          'payment-validated'
        )
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('Resume Token Validation', () => {
    it('should validate resume token and mark as used', async () => {
      const mockProduct = {
        _id: testProductId,
        status: 'active',
        pricing: { model: 'subscription', currency: 'USD', tiers: [] }
      };

      jest.spyOn(ProductModel, 'findById').mockResolvedValue(mockProduct as any);

      const { sessionId, resumeToken } = await productSignupSessionService.createSession({
        userId: testUserId,
        tenantId: testTenantId,
        productId: testProductId,
        lockedPrice: 10
      });

      const validation = await productSignupSessionService.validateResumeToken(resumeToken);

      expect(validation.valid).toBe(true);
      expect(validation.session).toBeDefined();
      expect(validation.session.sessionId).toBe(sessionId);

      // Verify token is marked as used
      expect(validation.session.resumeTokenUsed).toBe(true);
    });

    it('should fail to validate same resume token twice (one-time use)', async () => {
      const mockProduct = {
        _id: testProductId,
        status: 'active',
        pricing: { model: 'subscription', currency: 'USD', tiers: [] }
      };

      jest.spyOn(ProductModel, 'findById').mockResolvedValue(mockProduct as any);

      const { resumeToken } = await productSignupSessionService.createSession({
        userId: testUserId,
        tenantId: testTenantId,
        productId: testProductId,
        lockedPrice: 10
      });

      // First use - should succeed
      const firstValidation = await productSignupSessionService.validateResumeToken(resumeToken);
      expect(firstValidation.valid).toBe(true);

      // Second use - should fail
      const secondValidation = await productSignupSessionService.validateResumeToken(resumeToken);
      expect(secondValidation.valid).toBe(false);
      expect(secondValidation.reason).toContain('expired or already used');
    });
  });

  describe('Payment Replay Protection', () => {
    it('should prevent multiple charge attempts within 60 seconds', async () => {
      const mockProduct = {
        _id: testProductId,
        status: 'active',
        pricing: { model: 'subscription', currency: 'USD', tiers: [] }
      };

      jest.spyOn(ProductModel, 'findById').mockResolvedValue(mockProduct as any);

      const { sessionId } = await productSignupSessionService.createSession({
        userId: testUserId,
        tenantId: testTenantId,
        productId: testProductId,
        lockedPrice: 10
      });

      // First charge attempt - should succeed
      await productSignupSessionService.recordChargeAttempt(sessionId);

      // Second attempt within 60 seconds - should fail
      await expect(
        productSignupSessionService.recordChargeAttempt(sessionId)
      ).rejects.toThrow(/Please wait.*seconds before retrying/);
    });
  });

  describe('Session Completion', () => {
    it('should mark session as complete with subscriptionId', async () => {
      const mockProduct = {
        _id: testProductId,
        status: 'active',
        pricing: { model: 'subscription', currency: 'USD', tiers: [] }
      };

      jest.spyOn(ProductModel, 'findById').mockResolvedValue(mockProduct as any);

      const { sessionId } = await productSignupSessionService.createSession({
        userId: testUserId,
        tenantId: testTenantId,
        productId: testProductId,
        lockedPrice: 10
      });

      const subscriptionId = 'sub_test123';
      const completed = await productSignupSessionService.completeSession(sessionId, subscriptionId);

      expect(completed.currentStep).toBe('complete');
      expect(completed.completedSubscriptionId).toBe(subscriptionId);
    });
  });

  describe('Session Cancellation', () => {
    it('should cancel session', async () => {
      const mockProduct = {
        _id: testProductId,
        status: 'active',
        pricing: { model: 'subscription', currency: 'USD', tiers: [] }
      };

      jest.spyOn(ProductModel, 'findById').mockResolvedValue(mockProduct as any);

      const { sessionId } = await productSignupSessionService.createSession({
        userId: testUserId,
        tenantId: testTenantId,
        productId: testProductId,
        lockedPrice: 10
      });

      await productSignupSessionService.cancelSession(sessionId, testUserId);

      const session = await productSignupSessionService.getSession(sessionId);
      expect(session.cancelledAt).toBeDefined();
    });

    it('should prevent unauthorized user from cancelling session', async () => {
      const mockProduct = {
        _id: testProductId,
        status: 'active',
        pricing: { model: 'subscription', currency: 'USD', tiers: [] }
      };

      jest.spyOn(ProductModel, 'findById').mockResolvedValue(mockProduct as any);

      const { sessionId } = await productSignupSessionService.createSession({
        userId: testUserId,
        tenantId: testTenantId,
        productId: testProductId,
        lockedPrice: 10
      });

      await expect(
        productSignupSessionService.cancelSession(sessionId, 'different-user-id')
      ).rejects.toThrow('Unauthorized');
    });
  });
});
