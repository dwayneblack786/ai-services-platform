/**
 * Unit tests — listing CRUD routes
 *
 * Mocks the Java listing-service client and auth/subscription middleware
 * so tests focus purely on the proxy logic and error forwarding.
 */

import request from 'supertest';
import express from 'express';

// ── Mock middleware ────────────────────────────────────────────────────────────
jest.mock('../../../src/middleware/auth', () => ({
  authenticateSession: (_req: any, _res: any, next: any) => {
    _req.user = { tenantId: 'tenant-test', role: 'ANALYST', _id: 'user-001' };
    next();
  },
}));

jest.mock('../../../src/middleware/subscription-guard', () => ({
  requireSubscription: () => (_req: any, _res: any, next: any) => next(),
}));

// ── Mock apiClient ─────────────────────────────────────────────────────────────
jest.mock('../../../src/services/apiClient', () => ({
  javaListingClient: {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

import { javaListingClient } from '../../../src/services/apiClient';
import listingRouter from '../../../src/routes/listing-routes';

const mockClient = javaListingClient as jest.Mocked<typeof javaListingClient>;

const app = express();
app.use(express.json());
app.use('/api/listings', listingRouter);

// ── Fixtures ───────────────────────────────────────────────────────────────────
const LISTING = {
  id: 'lst-001',
  address: '123 Oak Street',
  price: 450000,
  bedrooms: 3,
  bathrooms: 2,
  status: 'draft',
};

describe('Listing CRUD routes', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── POST /api/listings ──────────────────────────────────────────────────────
  describe('POST /api/listings', () => {
    it('creates a listing and returns 201', async () => {
      mockClient.post.mockResolvedValue({ data: { listing: LISTING } });

      const res = await request(app)
        .post('/api/listings')
        .send({ address: '123 Oak Street', price: 450000 });

      expect(res.status).toBe(201);
      expect(res.body.listing.id).toBe('lst-001');
    });

    it('forwards X-Tenant-Id header to Java service', async () => {
      mockClient.post.mockResolvedValue({ data: {} });

      await request(app)
        .post('/api/listings')
        .send({ address: '123 Main' });

      expect(mockClient.post).toHaveBeenCalledWith(
        '/api/listings',
        expect.any(Object),
        expect.objectContaining({ headers: { 'X-Tenant-Id': 'tenant-test' } })
      );
    });

    it('returns 500 when Java service fails', async () => {
      mockClient.post.mockRejectedValue({ message: 'connection refused', response: { status: 503 } });

      const res = await request(app)
        .post('/api/listings')
        .send({ address: '123 Main' });

      expect(res.status).toBe(503);
    });
  });

  // ── GET /api/listings ───────────────────────────────────────────────────────
  describe('GET /api/listings', () => {
    it('returns listing list', async () => {
      mockClient.get.mockResolvedValue({ data: { listings: [LISTING], total: 1 } });

      const res = await request(app).get('/api/listings');

      expect(res.status).toBe(200);
      expect(res.body.listings).toHaveLength(1);
    });

    it('passes limit and offset query params', async () => {
      mockClient.get.mockResolvedValue({ data: { listings: [] } });

      await request(app).get('/api/listings?limit=10&offset=20');

      expect(mockClient.get).toHaveBeenCalledWith(
        '/api/listings?limit=10&offset=20',
        expect.any(Object)
      );
    });
  });

  // ── GET /api/listings/:id ───────────────────────────────────────────────────
  describe('GET /api/listings/:id', () => {
    it('returns a single listing', async () => {
      mockClient.get.mockResolvedValue({ data: { listing: LISTING } });

      const res = await request(app).get('/api/listings/lst-001');

      expect(res.status).toBe(200);
      expect(res.body.listing.address).toBe('123 Oak Street');
    });

    it('returns 404 when Java service returns 404', async () => {
      mockClient.get.mockRejectedValue({ message: 'not found', response: { status: 404 } });

      const res = await request(app).get('/api/listings/missing-id');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Listing not found');
    });
  });

  // ── PUT /api/listings/:id ───────────────────────────────────────────────────
  describe('PUT /api/listings/:id', () => {
    it('updates a listing and returns updated data', async () => {
      const updated = { ...LISTING, price: 500000 };
      mockClient.put.mockResolvedValue({ data: { listing: updated } });

      const res = await request(app)
        .put('/api/listings/lst-001')
        .send({ price: 500000 });

      expect(res.status).toBe(200);
      expect(res.body.listing.price).toBe(500000);
    });
  });

  // ── DELETE /api/listings/:id ────────────────────────────────────────────────
  describe('DELETE /api/listings/:id', () => {
    it('deletes a listing and returns success', async () => {
      mockClient.delete.mockResolvedValue({ data: { success: true } });

      const res = await request(app).delete('/api/listings/lst-001');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
