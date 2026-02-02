import { Router, Request, Response } from 'express';
import { cacheService } from '../services/cache.service';
import logger from '../utils/logger';
import { getErrorMessage } from '../utils/error-guards';

const router = Router();

/**
 * Health check endpoint for cache service
 * GET /api/cache/health
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const status = cacheService.getStatus();
    res.json({
      status: 'ok',
      backend: status.using,
      ready: status.ready
    });
  } catch (error) {
    logger.error('Cache health check failed', { error: getErrorMessage(error) });
    res.status(500).json({
      status: 'error',
      message: 'Cache health check failed'
    });
  }
});

/**
 * Get a value from cache
 * GET /api/cache/:key
 */
router.get('/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    
    if (!key) {
      return res.status(400).json({ error: 'Key is required' });
    }

    const value = await cacheService.get(key);
    
    if (value === null) {
      return res.status(404).json({ error: 'Key not found' });
    }

    res.json({ value });
  } catch (error) {
    logger.error('Cache GET failed', { 
      key: req.params.key,
      error: getErrorMessage(error) 
    });
    res.status(500).json({ error: 'Failed to get cache value' });
  }
});

/**
 * Set a value in cache
 * POST /api/cache
 * Body: { key: string, value: any, ttl?: number }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { key, value, ttl } = req.body;

    if (!key) {
      return res.status(400).json({ error: 'Key is required' });
    }

    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }

    await cacheService.set(key, value, ttl);
    
    res.json({ 
      success: true,
      message: 'Value cached successfully'
    });
  } catch (error) {
    logger.error('Cache SET failed', { 
      key: req.body.key,
      error: getErrorMessage(error) 
    });
    res.status(500).json({ error: 'Failed to set cache value' });
  }
});

/**
 * Delete a value from cache
 * DELETE /api/cache/:key
 */
router.delete('/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;

    if (!key) {
      return res.status(400).json({ error: 'Key is required' });
    }

    const deleted = await cacheService.delete(key);
    
    res.json({ 
      success: true,
      deleted
    });
  } catch (error) {
    logger.error('Cache DELETE failed', { 
      key: req.params.key,
      error: getErrorMessage(error) 
    });
    res.status(500).json({ error: 'Failed to delete cache value' });
  }
});

/**
 * Clear all cache entries in a namespace
 * POST /api/cache/clear
 * Body: { namespace?: string }
 */
router.post('/clear', async (req: Request, res: Response) => {
  try {
    const { namespace } = req.body;

    if (namespace) {
      // Create a namespaced cache service and clear it
      const { default: CacheService } = await import('../services/cache.service');
      const namespacedCache = new CacheService(namespace);
      await namespacedCache.clear();
    } else {
      // Clear default cache
      await cacheService.clear();
    }
    
    res.json({ 
      success: true,
      message: `Cache cleared${namespace ? ` for namespace: ${namespace}` : ''}`
    });
  } catch (error) {
    logger.error('Cache CLEAR failed', { 
      namespace: req.body.namespace,
      error: getErrorMessage(error) 
    });
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

/**
 * Check if a key exists in cache
 * HEAD /api/cache/:key
 */
router.head('/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;

    if (!key) {
      return res.status(400).end();
    }

    const exists = await cacheService.exists(key);
    
    if (exists) {
      res.status(200).end();
    } else {
      res.status(404).end();
    }
  } catch (error) {
    logger.error('Cache EXISTS failed', { 
      key: req.params.key,
      error: getErrorMessage(error) 
    });
    res.status(500).end();
  }
});

export default router;
