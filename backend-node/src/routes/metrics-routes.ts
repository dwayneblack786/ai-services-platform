import express, { Router, Request, Response } from 'express';
import { isAuthenticated } from '../middleware/auth';
import logger from '../utils/logger';

const router: Router = express.Router();

/**
 * System health and metrics endpoint
 * Provides real-time monitoring data for operational dashboards
 * 
 * GET /api/metrics - Requires authentication
 */
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const io = req.app.locals.io;
    
    // Collect system metrics
    const metrics = {
      // Server uptime
      uptime: {
        seconds: Math.floor(process.uptime()),
        human: formatUptime(process.uptime())
      },

      // Memory usage
      memory: {
        used: formatBytes(process.memoryUsage().heapUsed),
        total: formatBytes(process.memoryUsage().heapTotal),
        rss: formatBytes(process.memoryUsage().rss),
        external: formatBytes(process.memoryUsage().external),
        percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100)
      },

      // CPU usage (requires time to calculate)
      cpu: {
        usage: formatCpuUsage(process.cpuUsage()),
        loadAverage: process.platform !== 'win32' ? require('os').loadavg() : null
      },

      // Process information
      process: {
        pid: process.pid,
        version: process.version,
        platform: process.platform,
        arch: process.arch
      },

      // Socket.IO connections (WebSocket stats)
      connections: {
        active: io ? io.engine.clientsCount : 0,
        sockets: io ? await getSocketCount(io) : 0
      },

      // Node.js event loop metrics
      eventLoop: {
        // Active handles (timers, sockets, etc.)
        activeHandles: (process as any)._getActiveHandles ? 
          (process as any)._getActiveHandles().length : null,
        
        // Active requests (pending I/O operations)
        activeRequests: (process as any)._getActiveRequests ? 
          (process as any)._getActiveRequests().length : null
      },

      // Environment information
      environment: {
        nodeEnv: process.env.NODE_ENV || 'unknown',
        port: process.env.PORT || 'unknown'
      },

      // Timestamp
      timestamp: new Date().toISOString(),
      
      // Server status
      status: 'healthy'
    };

    logger.info('Metrics endpoint accessed', {
      userId: (req.user as any)?.id,
      clientsCount: metrics.connections.active
    });

    res.json(metrics);
  } catch (error: any) {
    logger.error('Failed to collect metrics', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to collect system metrics'
    });
  }
});

/**
 * Simplified metrics endpoint (public or less detailed)
 * Returns basic health check without authentication
 * 
 * GET /api/metrics/health
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

/**
 * Real-time metrics streaming (optional)
 * Streams metrics updates via Server-Sent Events (SSE)
 * 
 * GET /api/metrics/stream
 */
router.get('/stream', isAuthenticated, (req: Request, res: Response) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send metrics every 5 seconds
  const intervalId = setInterval(() => {
    const metrics = {
      memory: process.memoryUsage().heapUsed,
      uptime: process.uptime(),
      connections: req.app.locals.io?.engine.clientsCount || 0,
      timestamp: new Date().toISOString()
    };

    res.write(`data: ${JSON.stringify(metrics)}\n\n`);
  }, 5000);

  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(intervalId);
    logger.debug('Metrics stream closed', { userId: (req.user as any)?.id });
  });
});

/**
 * Client-side error logging endpoint
 * Receives error logs from frontend applications
 * 
 * POST /api/metrics/client-logs
 */
router.post('/client-logs', express.json(), (req: Request, res: Response) => {
  try {
    const { level, message, context, error } = req.body;

    // Log with appropriate level
    const logContext = {
      source: 'frontend',
      userId: (req.user as any)?.id || 'anonymous',
      ip: req.ip,
      userAgent: req.get('user-agent'),
      ...context
    };

    switch (level) {
      case 'ERROR':
        logger.error(`[Frontend] ${message}`, error, logContext);
        break;
      case 'WARN':
        logger.warn(`[Frontend] ${message}`, logContext);
        break;
      case 'INFO':
        logger.info(`[Frontend] ${message}`, logContext);
        break;
      default:
        logger.debug(`[Frontend] ${message}`, logContext);
    }

    res.json({ success: true });
  } catch (err: any) {
    logger.error('Failed to process client log', { error: err.message });
    res.status(500).json({ success: false });
  }
});

// Helper functions

/**
 * Format uptime in human-readable format
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
}

/**
 * Format CPU usage
 */
function formatCpuUsage(usage: NodeJS.CpuUsage): string {
  const total = usage.user + usage.system;
  return `${(total / 1000000).toFixed(2)}s`;
}

/**
 * Get total socket count from Socket.IO
 */
async function getSocketCount(io: any): Promise<number> {
  try {
    const sockets = await io.fetchSockets();
    return sockets.length;
  } catch {
    return 0;
  }
}

export default router;
