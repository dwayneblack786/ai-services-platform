/**
 * Metrics API Routes (Phase 7)
 *
 * Endpoints for Java/Python services to report metrics
 * and for frontend to fetch aggregated statistics.
 */

import { Router, Request, Response } from 'express';
import metricsService, { InvocationMetric } from '../services/metrics.service';

const router = Router();

/**
 * POST /api/pms/metrics/report
 *
 * Report invocation metrics from Java/Python services
 */
router.post('/report', async (req: Request, res: Response) => {
  try {
    const { promptVersionId, invocations } = req.body;

    if (!promptVersionId) {
      return res.status(400).json({ error: 'promptVersionId is required' });
    }

    if (!invocations || !Array.isArray(invocations) || invocations.length === 0) {
      return res.status(400).json({ error: 'invocations array is required and must not be empty' });
    }

    // Validate invocation format
    for (const inv of invocations) {
      if (typeof inv.success !== 'boolean') {
        return res.status(400).json({ error: 'Each invocation must have a success boolean' });
      }
      if (typeof inv.latency !== 'number' || inv.latency < 0) {
        return res.status(400).json({ error: 'Each invocation must have a non-negative latency number' });
      }
      if (!inv.timestamp) {
        return res.status(400).json({ error: 'Each invocation must have a timestamp' });
      }
    }

    const metrics = await metricsService.recordInvocations(promptVersionId, invocations as InvocationMetric[]);

    res.json({
      recorded: invocations.length,
      metrics: {
        totalUses: metrics.totalUses,
        avgLatency: Math.round(metrics.avgLatency * 10) / 10,
        errorRate: Math.round(metrics.errorRate * 1000) / 1000
      }
    });
  } catch (error: any) {
    console.error('Error recording metrics:', error);
    res.status(500).json({ error: error.message || 'Failed to record metrics' });
  }
});

/**
 * GET /api/pms/metrics/:versionId
 *
 * Get aggregated metrics for a prompt version
 */
router.get('/:versionId', async (req: Request, res: Response) => {
  try {
    const { versionId } = req.params;

    const metrics = await metricsService.getMetrics(versionId);

    res.json({
      promptVersionId: versionId,
      metrics
    });
  } catch (error: any) {
    console.error('Error fetching metrics:', error);

    if (error.message === 'Prompt version not found') {
      return res.status(404).json({ error: 'Prompt version not found' });
    }

    res.status(500).json({ error: error.message || 'Failed to fetch metrics' });
  }
});

/**
 * DELETE /api/pms/metrics/:versionId/reset
 *
 * Reset metrics for a prompt version (testing/admin only)
 */
router.delete('/:versionId/reset', async (req: Request, res: Response) => {
  try {
    const { versionId } = req.params;

    await metricsService.resetMetrics(versionId);

    res.json({ success: true, message: 'Metrics reset successfully' });
  } catch (error: any) {
    console.error('Error resetting metrics:', error);

    if (error.message === 'Prompt version not found') {
      return res.status(404).json({ error: 'Prompt version not found' });
    }

    res.status(500).json({ error: error.message || 'Failed to reset metrics' });
  }
});

export default router;
