/**
 * Unit tests — listing pipeline routes
 *
 * Verifies the proxy correctly forwards start/status/review/pending
 * requests to the Java listing-service.
 */

import request from 'supertest';
import express from 'express';

jest.mock('../../../src/middleware/auth', () => ({
  authenticateSession: (_req: any, _res: any, next: any) => {
    _req.user = { tenantId: 'tenant-test', role: 'ANALYST' };
    next();
  },
}));

jest.mock('../../../src/middleware/subscription-guard', () => ({
  requireSubscription: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../../src/services/apiClient', () => ({
  javaListingClient: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

import { javaListingClient } from '../../../src/services/apiClient';
import pipelineRouter from '../../../src/routes/listing-pipeline-routes';

const mockClient = javaListingClient as jest.Mocked<typeof javaListingClient>;

const app = express();
app.use(express.json());
app.use('/api/listing-pipeline', pipelineRouter);

const RUN_ID = 'run-abc-123';

describe('Listing pipeline routes', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── POST /start ─────────────────────────────────────────────────────────────
  describe('POST /api/listing-pipeline/start', () => {
    it('starts a pipeline and returns runId', async () => {
      mockClient.post.mockResolvedValue({
        data: { runId: RUN_ID, status: 'ingest', message: 'Pipeline started.' },
      });

      const res = await request(app)
        .post('/api/listing-pipeline/start')
        .send({ listingId: 'lst-001', photos: [{ originalPath: '/tmp/photo1.jpg' }] });

      expect(res.status).toBe(200);
      expect(res.body.runId).toBe(RUN_ID);
      expect(res.body.status).toBe('ingest');
    });

    it('forwards tenant header', async () => {
      mockClient.post.mockResolvedValue({ data: { runId: RUN_ID, status: 'ingest' } });

      await request(app)
        .post('/api/listing-pipeline/start')
        .send({ listingId: 'lst-001', photos: [] });

      expect(mockClient.post).toHaveBeenCalledWith(
        '/api/pipeline/start',
        expect.any(Object),
        expect.objectContaining({ headers: { 'X-Tenant-Id': 'tenant-test' } })
      );
    });

    it('returns 502 when Java service is unavailable', async () => {
      mockClient.post.mockRejectedValue({ message: 'ECONNREFUSED', response: { status: 502 } });

      const res = await request(app)
        .post('/api/listing-pipeline/start')
        .send({ listingId: 'lst-001', photos: [] });

      expect(res.status).toBe(502);
    });
  });

  // ── GET /:runId/status ──────────────────────────────────────────────────────
  describe('GET /api/listing-pipeline/:runId/status', () => {
    it('returns pipeline run status', async () => {
      mockClient.get.mockResolvedValue({
        data: {
          runId: RUN_ID,
          status: 'review_1',
          pausedAt: 'review_1',
          listingFields: { bedrooms: 3 },
          errors: [],
        },
      });

      const res = await request(app).get(`/api/listing-pipeline/${RUN_ID}/status`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('review_1');
      expect(res.body.listingFields.bedrooms).toBe(3);
    });

    it('proxies the runId path param correctly', async () => {
      mockClient.get.mockResolvedValue({ data: {} });

      await request(app).get(`/api/listing-pipeline/${RUN_ID}/status`);

      expect(mockClient.get).toHaveBeenCalledWith(
        `/api/pipeline/${RUN_ID}/status`,
        expect.any(Object)
      );
    });
  });

  // ── POST /:runId/review/1 ───────────────────────────────────────────────────
  describe('POST /api/listing-pipeline/:runId/review/1', () => {
    it('submits review gate 1 and returns confirmation', async () => {
      mockClient.post.mockResolvedValue({
        data: { runId: RUN_ID, message: 'Review accepted. Pipeline resuming.' },
      });

      const res = await request(app)
        .post(`/api/listing-pipeline/${RUN_ID}/review/1`)
        .send({ approved: true, edits: { bedrooms: 4 }, notes: 'Corrected count' });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/Review accepted/);
    });

    it('forwards review body to Java service', async () => {
      mockClient.post.mockResolvedValue({ data: { runId: RUN_ID } });
      const reviewBody = { approved: true, edits: { bedrooms: 4 } };

      await request(app)
        .post(`/api/listing-pipeline/${RUN_ID}/review/1`)
        .send(reviewBody);

      expect(mockClient.post).toHaveBeenCalledWith(
        `/api/pipeline/${RUN_ID}/review/1`,
        reviewBody,
        expect.any(Object)
      );
    });
  });

  // ── POST /:runId/review/2 ───────────────────────────────────────────────────
  describe('POST /api/listing-pipeline/:runId/review/2', () => {
    it('submits review gate 2 and returns confirmation', async () => {
      mockClient.post.mockResolvedValue({
        data: { runId: RUN_ID, message: 'Results persisted.' },
      });

      const res = await request(app)
        .post(`/api/listing-pipeline/${RUN_ID}/review/2`)
        .send({ approved: true, edits: { mlsDescription: 'Updated copy...' } });

      expect(res.status).toBe(200);
    });
  });

  // ── GET /pending ────────────────────────────────────────────────────────────
  describe('GET /api/listing-pipeline/pending', () => {
    it('returns list of pending reviews for the tenant', async () => {
      mockClient.get.mockResolvedValue({
        data: { pendingReviews: [{ runId: RUN_ID, status: 'review_1' }], count: 1 },
      });

      const res = await request(app).get('/api/listing-pipeline/pending');

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.pendingReviews[0].runId).toBe(RUN_ID);
    });
  });
});
