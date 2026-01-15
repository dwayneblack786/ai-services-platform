# Logging, Monitoring & Performance Tracking

## Overview

This guide covers structured logging, performance monitoring, metrics collection, and alerting strategies for production applications.

**Implementation Status:** Current backend uses console.log for logging throughout the codebase. This document covers recommended structured logging patterns using Winston/Pino, performance monitoring, and health checks that can be implemented for production deployments.

**Logging Principles:**
- Structured logging for easy parsing
- Proper log levels
- Contextual information
- Performance tracking
- Alert on anomalies

## Structured Logging Setup

### Winston Logger Configuration

```typescript
// src/config/logger.ts
import winston from 'winston';
import path from 'path';

const logDir = path.join(process.cwd(), 'logs');

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf(
    info =>
      `${info.timestamp} ${info.level}: ${info.message}`
  )
);

const transports = [
  // Console output
  new winston.transports.Console(),

  // Error logs
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),

  // Combined logs
  new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),
];

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  levels: logLevels,
  format,
  transports,
});
```

### Contextual Logging

```typescript
// src/middleware/loggingMiddleware.ts
import { v4 as uuidv4 } from 'uuid';

export function contextLoggingMiddleware(
  req: ICustomRequest,
  res: Response,
  next: NextFunction
) {
  // Create request context
  const requestId = uuidv4();
  const startTime = Date.now();

  // Attach to request
  req.requestId = requestId;

  // Log request
  logger.info('HTTP Request', {
    requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    userId: req.userId,
    tenantId: req.tenantId,
    timestamp: new Date().toISOString(),
  });

  // Capture response
  const originalJson = res.json.bind(res);
  res.json = function (data: any) {
    const duration = Date.now() - startTime;

    logger.info('HTTP Response', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.userId,
      timestamp: new Date().toISOString(),
    });

    return originalJson(data);
  };

  // Handle errors
  const originalSend = res.send.bind(res);
  res.send = function (data: any) {
    const duration = Date.now() - startTime;

    if (res.statusCode >= 400) {
      logger.warn('HTTP Error', {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userId: req.userId,
      });
    }

    return originalSend(data);
  };

  next();
}
```

## Performance Monitoring

### Performance Metrics Collection

```typescript
// src/monitoring/performanceMonitoring.ts
export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: Date;
  metadata?: any;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 10000;

  recordMetric(
    name: string,
    duration: number,
    metadata?: any
  ): void {
    this.metrics.push({
      name,
      duration,
      timestamp: new Date(),
      metadata,
    });

    // Keep memory bounded
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log slow operations
    if (duration > 1000) {
      logger.warn('Slow operation detected', {
        name,
        duration: `${duration}ms`,
        metadata,
      });
    }
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary(name: string) {
    const relevant = this.metrics.filter(m => m.name === name);

    if (relevant.length === 0) {
      return null;
    }

    const durations = relevant.map(m => m.duration);
    const sum = durations.reduce((a, b) => a + b, 0);
    const avg = sum / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);

    return {
      count: relevant.length,
      average: avg.toFixed(2),
      min,
      max,
      p95: this.calculatePercentile(durations, 0.95),
      p99: this.calculatePercentile(durations, 0.99),
    };
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[Math.max(0, index)];
  }
}

export const perfMonitor = new PerformanceMonitor();
```

### Operation Timing Decorator

```typescript
// src/decorators/timed.ts
export function timed(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const startTime = Date.now();

    try {
      return await originalMethod.apply(this, args);
    } finally {
      const duration = Date.now() - startTime;
      perfMonitor.recordMetric(`${target.constructor.name}.${propertyKey}`, duration);
    }
  };

  return descriptor;
}

// Usage
export class UserService {
  @timed
  async getUser(userId: string) {
    // Implementation
  }
}
```

## Database Query Monitoring

### Query Performance Tracking

```typescript
// src/middleware/mongooseLogging.ts
import mongoose from 'mongoose';

/**
 * Monitor Mongoose query performance
 */
export function setupMongooseLogging() {
  mongoose.connection.on('open', () => {
    mongoose.set('debug', (collection, method, query) => {
      const startTime = Date.now();

      // Track query completion
      const onResponse = () => {
        const duration = Date.now() - startTime;

        if (duration > 100) {
          // Log slow queries
          logger.warn('Slow Mongoose query', {
            collection,
            method,
            duration: `${duration}ms`,
            query: JSON.stringify(query),
          });
        } else {
          logger.debug('Mongoose query', {
            collection,
            method,
            duration: `${duration}ms`,
          });
        }
      };

      // Schedule response logging on next tick
      process.nextTick(onResponse);
    });
  });
}
```

## Error Tracking & Reporting

### Error Tracking Service

```typescript
// src/services/errorTracking.ts
export interface ErrorReport {
  message: string;
  stack?: string;
  context: {
    userId?: string;
    tenantId?: string;
    path?: string;
    method?: string;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
}

export class ErrorTracker {
  /**
   * Report error to tracking service (Sentry, DataDog, etc.)
   */
  static reportError(error: Error, context: any = {}): void {
    const severity = this.determineSeverity(error);

    const report: ErrorReport = {
      message: error.message,
      stack: error.stack,
      context,
      severity,
      timestamp: new Date(),
    };

    // Log locally
    logger.error('Error tracked', report);

    // Send to remote service
    this.sendToRemoteService(report);
  }

  private static determineSeverity(error: Error): ErrorReport['severity'] {
    if (error.message.includes('CRITICAL')) {
      return 'critical';
    }
    if (error.message.includes('unauthorized') || error.message.includes('forbidden')) {
      return 'high';
    }
    return 'medium';
  }

  private static sendToRemoteService(report: ErrorReport): void {
    // Implementation for Sentry, DataDog, or custom service
    if (process.env.SENTRY_DSN) {
      // Send to Sentry
    }

    // Send to your backend logging service
    fetch(`${process.env.LOG_SERVICE_URL}/errors`, {
      method: 'POST',
      body: JSON.stringify(report),
      keepalive: true,
    }).catch(err => {
      console.error('Failed to send error report:', err);
    });
  }
}
```

## Metrics & Dashboards

### Metrics Collection

```typescript
// src/monitoring/metrics.ts
export class Metrics {
  private static counters: Map<string, number> = new Map();
  private static gauges: Map<string, number> = new Map();
  private static histograms: Map<string, number[]> = new Map();

  /**
   * Increment counter
   */
  static incrementCounter(name: string, value: number = 1): void {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);
  }

  /**
   * Set gauge value
   */
  static setGauge(name: string, value: number): void {
    this.gauges.set(name, value);
  }

  /**
   * Record histogram value
   */
  static recordHistogram(name: string, value: number): void {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, []);
    }
    this.histograms.get(name)!.push(value);
  }

  /**
   * Export metrics in Prometheus format
   */
  static exportPrometheus(): string {
    let output = '';

    // Export counters
    for (const [name, value] of this.counters) {
      output += `# TYPE ${name} counter\n`;
      output += `${name} ${value}\n\n`;
    }

    // Export gauges
    for (const [name, value] of this.gauges) {
      output += `# TYPE ${name} gauge\n`;
      output += `${name} ${value}\n\n`;
    }

    // Export histograms
    for (const [name, values] of this.histograms) {
      output += `# TYPE ${name} histogram\n`;
      const sorted = [...values].sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);
      output += `${name}_sum ${sum}\n`;
      output += `${name}_count ${values.length}\n\n`;
    }

    return output;
  }
}

// Expose metrics endpoint
router.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(Metrics.exportPrometheus());
});
```

## Health Checks

### Health Check Endpoint

```typescript
// src/routes/healthRoutes.ts
export const healthRouter = Router();

/**
 * Liveness probe (is service running?)
 */
healthRouter.get('/live', (req, res) => {
  res.json({ status: 'alive' });
});

/**
 * Readiness probe (is service ready to handle requests?)
 */
healthRouter.get('/ready', async (req, res, next) => {
  try {
    // Check database
    await mongoose.connection.db?.admin().ping();

    // Check Redis
    await redis.ping();

    // Check external services
    await externalServiceHealthCheck();

    res.json({
      status: 'ready',
      checks: {
        database: 'ok',
        redis: 'ok',
        externalServices: 'ok',
      },
    });
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(503).json({
      status: 'not-ready',
      error: (error as Error).message,
    });
  }
});

/**
 * Startup probe (did service start successfully?)
 */
healthRouter.get('/startup', async (req, res) => {
  if (appStartupComplete) {
    res.json({ status: 'started' });
  } else {
    res.status(503).json({ status: 'starting' });
  }
});
```

## Alerting

### Alert Rules

```typescript
// src/monitoring/alerting.ts
export interface AlertRule {
  name: string;
  condition: () => Promise<boolean>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: () => Promise<void>;
}

export class AlertManager {
  private rules: AlertRule[] = [];

  registerRule(rule: AlertRule): void {
    this.rules.push(rule);
  }

  async checkAlerts(): Promise<void> {
    for (const rule of this.rules) {
      try {
        const shouldAlert = await rule.condition();
        if (shouldAlert) {
          logger.error(`ALERT: ${rule.name}`, { severity: rule.severity });
          await rule.action();
        }
      } catch (error) {
        logger.error(`Failed to evaluate alert rule: ${rule.name}`, error);
      }
    }
  }

  startMonitoring(intervalMs: number = 60000): void {
    setInterval(() => this.checkAlerts(), intervalMs);
  }
}

// Setup alert rules
const alertManager = new AlertManager();

alertManager.registerRule({
  name: 'High error rate',
  condition: async () => {
    const metrics = perfMonitor.getMetricsSummary('error_count');
    return metrics ? metrics.count > 100 : false;
  },
  severity: 'high',
  action: async () => {
    await sendAlert('High error rate detected in production');
  },
});

alertManager.registerRule({
  name: 'Database query timeout',
  condition: async () => {
    const metrics = perfMonitor.getMetricsSummary('database_query');
    return metrics ? parseInt(metrics.p99) > 5000 : false;
  },
  severity: 'medium',
  action: async () => {
    await sendAlert('Database queries are slow');
  },
});

// Start monitoring
alertManager.startMonitoring();
```

## Logging & Monitoring Best Practices Checklist

- [ ] Structured logging with all requests
- [ ] Appropriate log levels used
- [ ] Contextual information included (user, tenant, request ID)
- [ ] Performance metrics tracked
- [ ] Slow operations logged/alerted
- [ ] Error tracking integrated
- [ ] Health check endpoints implemented
- [ ] Metrics exposed in standard format
- [ ] Log retention policy defined
- [ ] Sensitive data excluded from logs
- [ ] Database queries monitored
- [ ] External API calls tracked
- [ ] Alert rules configured
- [ ] Dashboard configured for visualization
- [ ] Regular log review process

## Related Documentation

- [BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md) - Backend structure
- [SERVICE_PATTERNS.md](SERVICE_PATTERNS.md) - Service patterns
- [ERROR_HANDLING.md](ERROR_HANDLING.md) - Error handling
- [EXTERNAL_APIS.md](EXTERNAL_APIS.md) - API integration

