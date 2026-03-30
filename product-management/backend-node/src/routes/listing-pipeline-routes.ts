import express from 'express';
import { javaListingClient } from '../services/apiClient';
import { authenticateSession } from '../middleware/auth';
import { requireSubscription } from '../middleware/subscription-guard';

const router = express.Router();
router.use(authenticateSession);
router.use(requireSubscription('listing-lift'));

/**
 * Listing pipeline routes — trigger and manage the multi-agent pipeline.
 * Proxies to Java listing-service pipeline endpoints.
 */

// POST /api/listing-pipeline/start — start agent pipeline for a listing
router.post('/start', async (req, res) => {
  try {
    const user = req.user as any;
    const response = await javaListingClient.post('/api/pipeline/start', req.body, {
      headers: { 'X-Tenant-Id': user.tenantId },
    });
    res.json(response.data);
  } catch (err: any) {
    console.error('[pipeline-routes] POST /start:', err.message);
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});

// GET /api/listing-pipeline/:runId/status — poll pipeline progress
router.get('/:runId/status', async (req, res) => {
  try {
    const user = req.user as any;
    const response = await javaListingClient.get(`/api/pipeline/${req.params.runId}/status`, {
      headers: { 'X-Tenant-Id': user.tenantId },
    });
    res.json(response.data);
  } catch (err: any) {
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});

// POST /api/listing-pipeline/:runId/review/1 — submit human review gate 1
router.post('/:runId/review/1', async (req, res) => {
  try {
    const user = req.user as any;
    const response = await javaListingClient.post(
      `/api/pipeline/${req.params.runId}/review/1`,
      req.body,
      { headers: { 'X-Tenant-Id': user.tenantId } }
    );
    res.json(response.data);
  } catch (err: any) {
    console.error('[pipeline-routes] POST review/1:', err.message);
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});

// POST /api/listing-pipeline/:runId/review/2 — submit human review gate 2
router.post('/:runId/review/2', async (req, res) => {
  try {
    const user = req.user as any;
    const response = await javaListingClient.post(
      `/api/pipeline/${req.params.runId}/review/2`,
      req.body,
      { headers: { 'X-Tenant-Id': user.tenantId } }
    );
    res.json(response.data);
  } catch (err: any) {
    console.error('[pipeline-routes] POST review/2:', err.message);
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});

// GET /api/listing-pipeline/pending — list runs awaiting human review
router.get('/pending', async (req, res) => {
  try {
    const user = req.user as any;
    const response = await javaListingClient.get('/api/pipeline/pending', {
      headers: { 'X-Tenant-Id': user.tenantId },
    });
    res.json(response.data);
  } catch (err: any) {
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});

export default router;
