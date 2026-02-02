import * as appInsights from 'applicationinsights';
import { Request, Response, NextFunction } from 'express';

let client: appInsights.TelemetryClient | null = null;

/**
 * Initialize Application Insights
 */
export const initializeAppInsights = () => {
  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

  if (!connectionString) {
    console.warn('Application Insights connection string not configured. Telemetry disabled.');
    return null;
  }

  // Setup Application Insights
  appInsights
    .setup(connectionString)
    .setAutoDependencyCorrelation(true)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true, true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true, true)
    .setUseDiskRetryCaching(true)
    .setSendLiveMetrics(true)
    .setDistributedTracingMode(appInsights.DistributedTracingModes.AI_AND_W3C)
    .start();

  client = appInsights.defaultClient;

  // Set cloud role name for better filtering in Azure
  client.context.tags[client.context.keys.cloudRole] = 'backend-node';
  client.context.tags[client.context.keys.cloudRoleInstance] = process.env.HOSTNAME || 'local';

  // Add common properties
  client.commonProperties = {
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
  };

  console.log('✅ Application Insights initialized');
  return client;
};

/**
 * Get the Application Insights client
 */
export const getAppInsightsClient = (): appInsights.TelemetryClient | null => {
  return client;
};

/**
 * Middleware to track custom events and metrics
 */
export const appInsightsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!client) {
    return next();
  }

  const startTime = Date.now();

  // Track when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    // Track custom request metrics
    client!.trackRequest({
      name: `${req.method} ${req.route?.path || req.path}`,
      url: req.url,
      duration,
      resultCode: res.statusCode.toString(),
      success: res.statusCode < 400,
      properties: {
        method: req.method,
        path: req.path,
        query: JSON.stringify(req.query),
        userAgent: req.get('user-agent'),
      },
    });

    // Track slow requests
    if (duration > 1000) {
      client!.trackMetric({
        name: 'SlowRequest',
        value: duration,
        properties: {
          method: req.method,
          path: req.path,
        },
      });
    }
  });

  next();
};

/**
 * Track custom events
 */
export const trackEvent = (
  name: string,
  properties?: Record<string, string>,
  measurements?: Record<string, number>
) => {
  if (client) {
    client.trackEvent({
      name,
      properties,
      measurements,
    });
  }
};

/**
 * Track custom metrics
 */
export const trackMetric = (
  name: string,
  value: number,
  properties?: Record<string, string>
) => {
  if (client) {
    client.trackMetric({
      name,
      value,
      properties,
    });
  }
};

/**
 * Track dependencies (external API calls)
 */
export const trackDependency = (
  dependencyType: string,
  name: string,
  data: string,
  duration: number,
  success: boolean
) => {
  if (client) {
    client.trackDependency({
      dependencyTypeName: dependencyType,
      name,
      data,
      duration,
      success,
      resultCode: success ? 200 : 500,
    });
  }
};

/**
 * Track exceptions
 */
export const trackException = (
  error: Error,
  properties?: Record<string, string>
) => {
  if (client) {
    client.trackException({
      exception: error,
      properties,
    });
  }
};

/**
 * Flush telemetry (useful before process exit)
 */
export const flushAppInsights = async (): Promise<void> => {
  if (client) {
    client!.flush();
    // Wait for telemetry to be sent
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
  }
};
