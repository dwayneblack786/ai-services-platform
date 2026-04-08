/**
 * Unit tests — subscription-guard middleware
 *
 * Verifies that:
 *  - ADMIN / PROJECT_ADMIN roles always bypass the check
 *  - Missing product returns 403 with productSlug
 *  - No active subscription returns 403 with signupUrl
 *  - Active/trial subscription passes through to next()
 *  - Unauthenticated request returns 401
 */

import { Request, Response, NextFunction } from 'express';
import { requireSubscription } from '../../../src/middleware/subscription-guard';

// ── Model mocks ────────────────────────────────────────────────────────────────
jest.mock('../../../src/models/Product', () => ({
  default: { findOne: jest.fn() },
}));
jest.mock('../../../src/models/ProductSubscription', () => ({
  ProductSubscriptionModel: { findOne: jest.fn() },
}));

import ProductModel from '../../../src/models/Product';
import { ProductSubscriptionModel } from '../../../src/models/ProductSubscription';

const mockProduct = jest.mocked(ProductModel.findOne as jest.Mock);
const mockSub = jest.mocked(ProductSubscriptionModel.findOne as jest.Mock);

// ── Helpers ────────────────────────────────────────────────────────────────────
const makeMocks = (userOverrides: Record<string, unknown> = {}) => {
  const req = {
    user: { tenantId: 'tenant-abc', role: 'ANALYST', ...userOverrides },
  } as unknown as Request;

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;

  const next = jest.fn() as NextFunction;
  return { req, res, next };
};

const lean = (value: unknown) =>
  jest.fn().mockResolvedValue(value);

const PRODUCT = { _id: 'prod-001', name: 'ListingLift', slug: 'listing-lift' };

// ── Tests ──────────────────────────────────────────────────────────────────────
describe('requireSubscription middleware', () => {
  const middleware = requireSubscription('listing-lift');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authentication', () => {
    it('returns 401 when req.user is missing', async () => {
      const { req, res, next } = makeMocks();
      (req as any).user = undefined;

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when tenantId is missing', async () => {
      const { req, res, next } = makeMocks({ tenantId: undefined });

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('admin bypass', () => {
    it('calls next() immediately for ADMIN role', async () => {
      const { req, res, next } = makeMocks({ role: 'ADMIN' });

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(mockProduct).not.toHaveBeenCalled();
    });

    it('calls next() immediately for PROJECT_ADMIN role', async () => {
      const { req, res, next } = makeMocks({ role: 'PROJECT_ADMIN' });

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(mockProduct).not.toHaveBeenCalled();
    });
  });

  describe('product lookup', () => {
    it('returns 403 with productSlug when product is not found', async () => {
      mockProduct.mockReturnValue({ lean: lean(null) } as any);
      const { req, res, next } = makeMocks();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      const body = (res.json as jest.Mock).mock.calls[0][0];
      expect(body).toMatchObject({ productSlug: 'listing-lift' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('subscription check', () => {
    beforeEach(() => {
      mockProduct.mockReturnValue({ lean: lean(PRODUCT) } as any);
    });

    it('returns 403 with signupUrl when tenant has no active subscription', async () => {
      mockSub.mockReturnValue({ lean: lean(null) } as any);
      const { req, res, next } = makeMocks();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      const body = (res.json as jest.Mock).mock.calls[0][0];
      expect(body).toMatchObject({
        productId: 'prod-001',
        productSlug: 'listing-lift',
        signupUrl: '/products/prod-001/signup',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next() when tenant has an active subscription', async () => {
      mockSub.mockReturnValue({ lean: lean({ status: 'active' }) } as any);
      const { req, res, next } = makeMocks();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('calls next() when tenant has a trial subscription', async () => {
      mockSub.mockReturnValue({ lean: lean({ status: 'trial' }) } as any);
      const { req, res, next } = makeMocks();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('queries subscription with correct tenantId and productId filter', async () => {
      mockSub.mockReturnValue({ lean: lean({ status: 'active' }) } as any);
      const { req, res, next } = makeMocks({ tenantId: 'tenant-xyz' });

      await middleware(req, res, next);

      expect(mockSub).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-xyz',
          productId: PRODUCT._id,
          status: { $in: ['active', 'trial'] },
        })
      );
    });
  });

  describe('error handling', () => {
    it('returns 500 when the database throws', async () => {
      mockProduct.mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error('DB error')),
      } as any);
      const { req, res, next } = makeMocks();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
