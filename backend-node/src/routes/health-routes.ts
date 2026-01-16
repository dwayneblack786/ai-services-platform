import express, { Request, Response } from 'express';
import { getDB } from '../config/database';
import { redisClient } from '../config/redis';
import { javaVAClient } from '../services/apiClient';
import { getCircuitBreakerStats } from '../services/circuitBreaker';

const router = express.Router();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    mongodb: ServiceHealth;
    redis: ServiceHealth;
    javaVA: ServiceHealth;
    circuitBreakers: CircuitBreakerHealth;
  };
  system: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    nodeVersion: string;
    environment: string;
  };
}

interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  message?: string;
  details?: any;
}

interface CircuitBreakerHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  circuits: {
    [key: string]: {
      state: string;
      failureCount: number;
      successCount: number;
      totalRequests: number;
    };
  };
}

/**
 * GET /health
 * Basic health check - returns 200 if server is responding
 */
router.get('/', async (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /health/detailed
 * Comprehensive health check with all dependencies
 */
router.get('/detailed', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const healthStatus: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      mongodb: await checkMongoDB(),
      redis: await checkRedis(),
      javaVA: await checkJavaVAService(),
      circuitBreakers: getCircuitBreakerHealth()
    },
    system: {
      memory: getMemoryUsage(),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    }
  };

  // Determine overall health status
  const serviceStatuses = [
    healthStatus.services.mongodb.status,
    healthStatus.services.redis.status,
    healthStatus.services.javaVA.status
  ];

  if (serviceStatuses.includes('down')) {
    healthStatus.status = 'unhealthy';
  } else if (serviceStatuses.includes('degraded')) {
    healthStatus.status = 'degraded';
  }

  // Add circuit breaker health to overall status
  if (healthStatus.services.circuitBreakers.status === 'unhealthy') {
    healthStatus.status = 'unhealthy';
  } else if (healthStatus.services.circuitBreakers.status === 'degraded' && healthStatus.status === 'healthy') {
    healthStatus.status = 'degraded';
  }

  const responseTime = Date.now() - startTime;
  
  // Return appropriate HTTP status
  const httpStatus = healthStatus.status === 'healthy' ? 200 : 
                     healthStatus.status === 'degraded' ? 200 : 503;

  res.status(httpStatus).json({
    ...healthStatus,
    responseTime: `${responseTime}ms`
  });
});

/**
 * GET /health/liveness
 * Kubernetes liveness probe - checks if server should be restarted
 */
router.get('/liveness', (req: Request, res: Response) => {
  // If server can respond, it's alive
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /health/readiness
 * Kubernetes readiness probe - checks if server can handle requests
 */
router.get('/readiness', async (req: Request, res: Response) => {
  try {
    // Check critical services
    const mongoHealth = await checkMongoDB();
    
    if (mongoHealth.status === 'down') {
      return res.status(503).json({
        status: 'not_ready',
        reason: 'MongoDB connection failed',
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Check MongoDB connection
 */
async function checkMongoDB(): Promise<ServiceHealth> {
  const startTime = Date.now();
  try {
    const db = getDB();
    await db.admin().ping();
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'up',
      responseTime,
      message: 'MongoDB is connected'
    };
  } catch (error) {
    return {
      status: 'down',
      message: error instanceof Error ? error.message : 'MongoDB connection failed'
    };
  }
}

/**
 * Check Redis connection
 */
async function checkRedis(): Promise<ServiceHealth> {
  const startTime = Date.now();
  try {
    if (!redisClient.isOpen) {
      return {
        status: 'down',
        message: 'Redis client is not connected'
      };
    }

    await redisClient.ping();
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'up',
      responseTime,
      message: 'Redis is connected',
      details: {
        ready: redisClient.isReady
      }
    };
  } catch (error) {
    return {
      status: 'down',
      message: error instanceof Error ? error.message : 'Redis connection failed'
    };
  }
}

/**
 * Check Java VA Service
 */
async function checkJavaVAService(): Promise<ServiceHealth> {
  const startTime = Date.now();
  try {
    // Try to ping the Java service
    const response = await javaVAClient.get('/health', {
      timeout: 3000 // 3 second timeout for health check
    });
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'up',
      responseTime,
      message: 'Java VA service is responding',
      details: response.data
    };
  } catch (error) {
    // Check if circuit breaker is open
    const circuitStats = getCircuitBreakerStats();
    const javaVACircuit = Object.entries(circuitStats).find(([name]) => 
      name.includes('java') || name.includes('va')
    );

    if (javaVACircuit && javaVACircuit[1].state === 'OPEN') {
      return {
        status: 'degraded',
        message: 'Java VA service circuit breaker is OPEN'
      };
    }

    return {
      status: 'down',
      message: error instanceof Error ? error.message : 'Java VA service is not responding'
    };
  }
}

/**
 * Get circuit breaker health status
 */
function getCircuitBreakerHealth(): CircuitBreakerHealth {
  const stats = getCircuitBreakerStats();
  
  const circuits: CircuitBreakerHealth['circuits'] = {};
  let openCount = 0;
  let halfOpenCount = 0;

  for (const [name, circuitStats] of Object.entries(stats)) {
    circuits[name] = {
      state: circuitStats.state,
      failureCount: circuitStats.failureCount,
      successCount: circuitStats.successCount,
      totalRequests: circuitStats.totalRequests
    };

    if (circuitStats.state === 'OPEN') openCount++;
    if (circuitStats.state === 'HALF_OPEN') halfOpenCount++;
  }

  let status: CircuitBreakerHealth['status'];
  if (openCount > 0) {
    status = 'unhealthy';
  } else if (halfOpenCount > 0) {
    status = 'degraded';
  } else {
    status = 'healthy';
  }

  return { status, circuits };
}

/**
 * Get memory usage statistics
 */
function getMemoryUsage() {
  const used = process.memoryUsage();
  const total = used.heapTotal;
  
  return {
    used: Math.round(used.heapUsed / 1024 / 1024), // MB
    total: Math.round(total / 1024 / 1024), // MB
    percentage: Math.round((used.heapUsed / total) * 100)
  };
}

export default router;
