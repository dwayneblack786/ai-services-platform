import express from 'express';
import { javaListingClient } from '../services/apiClient';
import { authenticateSession } from '../middleware/auth';
import { requireSubscription } from '../middleware/subscription-guard';

const router = express.Router();
router.use(authenticateSession);
router.use(requireSubscription('listing-lift'));

/**
 * Listing CRUD — proxies to Java listing-service.
 * All requests are tenant-scoped via X-Tenant-Id header.
 */

// POST /api/listings — create a draft listing
router.post('/', async (req, res) => {
  try {
    const user = req.user as any;
    const response = await javaListingClient.post('/api/listings', req.body, {
      headers: { 'X-Tenant-Id': user.tenantId },
    });
    res.status(201).json(response.data);
  } catch (err: any) {
    console.error('[listing-routes] POST /api/listings:', err.message);
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});

// GET /api/listings — list listings for tenant
router.get('/', async (req, res) => {
  try {
    const user = req.user as any;
    const { limit = 50, offset = 0 } = req.query;
    const response = await javaListingClient.get(`/api/listings?limit=${limit}&offset=${offset}`, {
      headers: { 'X-Tenant-Id': user.tenantId },
    });
    res.json(response.data);
  } catch (err: any) {
    console.error('[listing-routes] GET /api/listings:', err.message);
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});

// GET /api/listings/:id
router.get('/:id', async (req, res) => {
  try {
    const user = req.user as any;
    const response = await javaListingClient.get(`/api/listings/${req.params.id}`, {
      headers: { 'X-Tenant-Id': user.tenantId },
    });
    res.json(response.data);
  } catch (err: any) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: status === 404 ? 'Listing not found' : err.message });
  }
});

// PUT /api/listings/:id
router.put('/:id', async (req, res) => {
  try {
    const user = req.user as any;
    const response = await javaListingClient.put(`/api/listings/${req.params.id}`, req.body, {
      headers: { 'X-Tenant-Id': user.tenantId },
    });
    res.json(response.data);
  } catch (err: any) {
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});

// DELETE /api/listings/:id
router.delete('/:id', async (req, res) => {
  try {
    const user = req.user as any;
    const response = await javaListingClient.delete(`/api/listings/${req.params.id}`, {
      headers: { 'X-Tenant-Id': user.tenantId },
    });
    res.json(response.data);
  } catch (err: any) {
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});

export default router;
