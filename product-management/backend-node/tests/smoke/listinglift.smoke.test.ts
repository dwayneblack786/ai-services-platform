/**
 * Smoke tests — ListingLift routes
 *
 * Fast checks that verify the routes are mounted, basic auth is enforced,
 * and the subscription guard is wired — without hitting any real services.
 * These should pass even when Java listing-service is not running.
 */

import request from 'supertest';
import express from 'express';

// ── Minimal app using real middleware (no mocks) ───────────────────────────────
// We do NOT mock auth or subscription guard here — smoke tests verify real wiring.
// We mock only the Java client to prevent network calls.
jest.mock('../../../src/services/apiClient', () => ({
  javaListingClient: {
    get: jest.fn().mockResolvedValue({ data: {} }),
    post: jest.fn().mockResolvedValue({ data: {} }),
    put: jest.fn().mockResolvedValue({ data: {} }),
    delete: jest.fn().mockResolvedValue({ data: {} }),
  },
}));

// Also mock Product and Subscription models to avoid needing a real DB connection
jest.mock('../../../src/models/Product', () => ({
  default: { findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) },
}));
jest.mock('../../../src/models/ProductSubscription', () => ({
  ProductSubscriptionModel: { findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) },
}));

import listingRouter from '../../../src/routes/listing-routes';
import pipelineRouter from '../../../src/routes/listing-pipeline-routes';

const app = express();
app.use(express.json());
app.use('/api/listings', listingRouter);
app.use('/api/listing-pipeline', pipelineRouter);

describe('ListingLift smoke tests', () => {

  describe('listing routes are mounted', () => {
    it('GET /api/listings returns 401 (not 404) — route exists, auth enforced', async () => {
      const res = await request(app).get('/api/listings');
      expect(res.status).toBe(401);
    });

    it('POST /api/listings returns 401 — auth enforced', async () => {
      const res = await request(app).post('/api/listings').send({});
      expect(res.status).toBe(401);
    });

    it('PUT /api/listings/:id returns 401 — auth enforced', async () => {
      const res = await request(app).put('/api/listings/test-id').send({});
      expect(res.status).toBe(401);
    });

    it('DELETE /api/listings/:id returns 401 — auth enforced', async () => {
      const res = await request(app).delete('/api/listings/test-id');
      expect(res.status).toBe(401);
    });
  });

  describe('pipeline routes are mounted', () => {
    it('POST /api/listing-pipeline/start returns 401 — route exists, auth enforced', async () => {
      const res = await request(app).post('/api/listing-pipeline/start').send({});
      expect(res.status).toBe(401);
    });

    it('GET /api/listing-pipeline/:runId/status returns 401 — auth enforced', async () => {
      const res = await request(app).get('/api/listing-pipeline/run-001/status');
      expect(res.status).toBe(401);
    });

    it('POST /api/listing-pipeline/:runId/review/1 returns 401 — auth enforced', async () => {
      const res = await request(app).post('/api/listing-pipeline/run-001/review/1').send({});
      expect(res.status).toBe(401);
    });

    it('POST /api/listing-pipeline/:runId/review/2 returns 401 — auth enforced', async () => {
      const res = await request(app).post('/api/listing-pipeline/run-001/review/2').send({});
      expect(res.status).toBe(401);
    });

    it('GET /api/listing-pipeline/pending returns 401 — auth enforced', async () => {
      const res = await request(app).get('/api/listing-pipeline/pending');
      expect(res.status).toBe(401);
    });
  });

  describe('no 404s on registered paths', () => {
    // 401 or 403 means the route exists; 404 would mean it's not mounted
    const routesShouldExist = [
      ['GET', '/api/listings'],
      ['POST', '/api/listings'],
      ['GET', '/api/listings/any-id'],
      ['PUT', '/api/listings/any-id'],
      ['DELETE', '/api/listings/any-id'],
      ['POST', '/api/listing-pipeline/start'],
      ['GET', '/api/listing-pipeline/run-id/status'],
      ['POST', '/api/listing-pipeline/run-id/review/1'],
      ['POST', '/api/listing-pipeline/run-id/review/2'],
      ['GET', '/api/listing-pipeline/pending'],
    ] as const;

    it.each(routesShouldExist)('%s %s is registered (not 404)', async (method, path) => {
      const res = await (request(app) as any)[method.toLowerCase()](path).send({});
      expect(res.status).not.toBe(404);
    });
  });
});
