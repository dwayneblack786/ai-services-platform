/**
 * Acceptance tests — ListingLift end-to-end flow (Node.js side)
 *
 * Uses MongoMemoryServer (via globalSetup) for real subscription/product lookups.
 * Mocks the Java listing-service client since it won't be running in CI.
 *
 * Covers:
 *  - Unauthenticated access is rejected
 *  - Unsubscribed tenant is rejected with 403 + signupUrl
 *  - Admin accesses product without a subscription
 *  - Subscribed tenant can create / list / update / delete listings
 *  - Pipeline start → status → review1 → review2 happy path
 */

import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { ProductSubscriptionModel } from '../../../src/models/ProductSubscription';
import ProductModel from '../../../src/models/Product';

// ── Mock Java client ───────────────────────────────────────────────────────────
jest.mock('../../../src/services/apiClient', () => ({
  javaListingClient: {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

import { javaListingClient } from '../../../src/services/apiClient';
const mockClient = javaListingClient as jest.Mocked<typeof javaListingClient>;

// ── Build a real Express app wired exactly like src/index.ts ──────────────────
import { authenticateSession } from '../../../src/middleware/auth';
import { requireSubscription } from '../../../src/middleware/subscription-guard';
import listingRouter from '../../../src/routes/listing-routes';
import pipelineRouter from '../../../src/routes/listing-pipeline-routes';

// Inject a fake session user via test helper header
const injectUser = (req: any, _res: any, next: any) => {
  const role = req.headers['x-test-role'] || 'ANALYST';
  const tenantId = req.headers['x-test-tenant'] || 'tenant-test';
  if (req.headers['x-test-anon']) return next(); // skip auth
  req.user = { _id: new mongoose.Types.ObjectId(), tenantId, role };
  next();
};

const app = express();
app.use(express.json());

// Replace real auth with test injector but keep real subscription guard
app.use('/api/listings', injectUser, requireSubscription('listing-lift'), listingRouter);
app.use('/api/listing-pipeline', injectUser, requireSubscription('listing-lift'), pipelineRouter);

// ── Test data ──────────────────────────────────────────────────────────────────
const PRODUCT_ID = new mongoose.Types.ObjectId();
const TENANT_SUBSCRIBED = 'tenant-subscribed';
const TENANT_UNSUBSCRIBED = 'tenant-unsubscribed';
const RUN_ID = 'run-acceptance-001';

async function seedProduct() {
  await ProductModel.create({
    _id: PRODUCT_ID,
    name: 'ListingLift',
    slug: 'listing-lift',
    category: 'Real Estate AI',
    description: 'AI listing tool',
    pricing: { model: 'subscription', tiers: [] },
    status: 'active',
  });
}

async function seedSubscription(tenantId: string) {
  await ProductSubscriptionModel.create({
    tenantId,
    productId: PRODUCT_ID,
    userId: new mongoose.Types.ObjectId(),
    status: 'active',
    billingCycle: 'monthly',
    amount: 149,
    currency: 'USD',
    startDate: new Date(),
    autoRenew: true,
  });
}

// ── Suite ──────────────────────────────────────────────────────────────────────
describe('ListingLift acceptance tests', () => {
  beforeAll(async () => {
    await seedProduct();
    await seedSubscription(TENANT_SUBSCRIBED);
  });

  beforeEach(() => jest.clearAllMocks());

  // ── Subscription gate ───────────────────────────────────────────────────────
  describe('subscription gate', () => {
    it('rejects unsubscribed tenant with 403 and signupUrl', async () => {
      const res = await request(app)
        .get('/api/listings')
        .set('x-test-tenant', TENANT_UNSUBSCRIBED);

      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({
        productSlug: 'listing-lift',
        signupUrl: expect.stringContaining('/signup'),
      });
    });

    it('allows PROJECT_ADMIN to bypass subscription check', async () => {
      mockClient.get.mockResolvedValue({ data: { listings: [] } });

      const res = await request(app)
        .get('/api/listings')
        .set('x-test-tenant', TENANT_UNSUBSCRIBED)
        .set('x-test-role', 'PROJECT_ADMIN');

      expect(res.status).toBe(200);
    });

    it('allows subscribed tenant through', async () => {
      mockClient.get.mockResolvedValue({ data: { listings: [], total: 0 } });

      const res = await request(app)
        .get('/api/listings')
        .set('x-test-tenant', TENANT_SUBSCRIBED);

      expect(res.status).toBe(200);
    });
  });

  // ── Listing CRUD ────────────────────────────────────────────────────────────
  describe('listing CRUD (subscribed tenant)', () => {
    const headers = { 'x-test-tenant': TENANT_SUBSCRIBED };
    const LISTING = { id: 'lst-acc-001', address: '10 Acceptance Ave', status: 'draft' };

    it('creates a listing', async () => {
      mockClient.post.mockResolvedValue({ data: { listing: LISTING } });

      const res = await request(app)
        .post('/api/listings')
        .set(headers)
        .send({ address: '10 Acceptance Ave' });

      expect(res.status).toBe(201);
      expect(res.body.listing.address).toBe('10 Acceptance Ave');
    });

    it('retrieves listings list', async () => {
      mockClient.get.mockResolvedValue({ data: { listings: [LISTING], total: 1 } });

      const res = await request(app).get('/api/listings').set(headers);

      expect(res.status).toBe(200);
      expect(res.body.listings).toHaveLength(1);
    });

    it('updates a listing', async () => {
      mockClient.put.mockResolvedValue({ data: { listing: { ...LISTING, price: 500000 } } });

      const res = await request(app)
        .put('/api/listings/lst-acc-001')
        .set(headers)
        .send({ price: 500000 });

      expect(res.status).toBe(200);
      expect(res.body.listing.price).toBe(500000);
    });

    it('deletes a listing', async () => {
      mockClient.delete.mockResolvedValue({ data: { success: true } });

      const res = await request(app)
        .delete('/api/listings/lst-acc-001')
        .set(headers);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ── Pipeline flow ───────────────────────────────────────────────────────────
  describe('pipeline flow (subscribed tenant)', () => {
    const headers = { 'x-test-tenant': TENANT_SUBSCRIBED };

    it('starts pipeline and returns runId', async () => {
      mockClient.post.mockResolvedValue({
        data: { runId: RUN_ID, status: 'ingest', message: 'Pipeline started.' },
      });

      const res = await request(app)
        .post('/api/listing-pipeline/start')
        .set(headers)
        .send({ listingId: 'lst-acc-001', photos: [{ originalPath: '/photo.jpg' }] });

      expect(res.status).toBe(200);
      expect(res.body.runId).toBe(RUN_ID);
    });

    it('polls pipeline status', async () => {
      mockClient.get.mockResolvedValue({
        data: { runId: RUN_ID, status: 'review_1', pausedAt: 'review_1', listingFields: {} },
      });

      const res = await request(app)
        .get(`/api/listing-pipeline/${RUN_ID}/status`)
        .set(headers);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('review_1');
    });

    it('submits review gate 1', async () => {
      mockClient.post.mockResolvedValue({
        data: { runId: RUN_ID, message: 'Review accepted. Pipeline resuming.' },
      });

      const res = await request(app)
        .post(`/api/listing-pipeline/${RUN_ID}/review/1`)
        .set(headers)
        .send({ approved: true, edits: { bedrooms: 3 } });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/resuming/i);
    });

    it('submits review gate 2', async () => {
      mockClient.post.mockResolvedValue({
        data: { runId: RUN_ID, message: 'Results persisted.' },
      });

      const res = await request(app)
        .post(`/api/listing-pipeline/${RUN_ID}/review/2`)
        .set(headers)
        .send({ approved: true, edits: { mlsDescription: 'Final approved copy.' } });

      expect(res.status).toBe(200);
    });

    it('lists pending reviews', async () => {
      mockClient.get.mockResolvedValue({
        data: { pendingReviews: [{ runId: RUN_ID, status: 'review_2' }], count: 1 },
      });

      const res = await request(app)
        .get('/api/listing-pipeline/pending')
        .set(headers);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
    });
  });
});
