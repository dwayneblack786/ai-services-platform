/**
 * Circuit Breaker Monitoring Routes
 * 
 * Provides endpoints to monitor and control circuit breakers
 */

import express, { Request, Response } from 'express';
import { javaVAClient } from '../services/apiClient';
import { authenticateToken } from '../middleware/auth';
import logger from '../utils/logger';

const router = express.Router();

/**
 * GET /api/circuit/stats
 * Get circuit breaker statistics
 */
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const stats = javaVAClient.getStats();
    
    res.json({
      success: true,
      stats: {
        ...stats,
        // Add additional computed fields
        isHealthy: stats.state === 'CLOSED',
        uptime: stats.lastSuccessTime 
          ? Date.now() - stats.lastSuccessTime 
          : null,
        timeSinceLastFailure: stats.lastFailureTime
          ? Date.now() - stats.lastFailureTime
          : null,
      }
    });
  } catch (error: any) {
    logger.error('Error getting circuit stats', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: 'Failed to get circuit breaker statistics'
    });
  }
});

/**
 * POST /api/circuit/reset
 * Manually reset the circuit breaker
 */
router.post('/reset', authenticateToken, async (req: Request, res: Response) => {
  try {
    javaVAClient.resetCircuit();
    
    res.json({
      success: true,
      message: 'Circuit breaker reset successfully',
      stats: javaVAClient.getStats()
    });
  } catch (error: any) {
    logger.error('Error resetting circuit', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: 'Failed to reset circuit breaker'
    });
  }
});

/**
 * GET /api/circuit/health
 * Check Java VA service health through circuit breaker
 */
router.get('/health', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Attempt a lightweight health check
    const healthResponse = await javaVAClient.get('/health', undefined, () => ({
      status: 'unavailable',
      message: 'Circuit breaker fallback - service unavailable'
    }));

    const circuitStats = javaVAClient.getStats();
    
    res.json({
      success: true,
      health: healthResponse.data,
      circuit: {
        state: circuitStats.state,
        isHealthy: circuitStats.state === 'CLOSED',
        failureCount: circuitStats.failureCount,
        lastCheck: Date.now()
      }
    });
  } catch (error: any) {
    logger.error('Health check failed', { error: error.message, stack: error.stack });
    
    const circuitStats = javaVAClient.getStats();
    
    res.status(503).json({
      success: false,
      error: 'Service health check failed',
      circuit: {
        state: circuitStats.state,
        isHealthy: false,
        failureCount: circuitStats.failureCount,
        lastCheck: Date.now()
      }
    });
  }
});

export default router;
