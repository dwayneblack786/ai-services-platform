import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { Request, Response, NextFunction, Application } from 'express';

/**
 * Initialize Sentry
 */
export const initializeSentry = (app: Application) => {
  if (!process.env.SENTRY_DSN) {
    console.warn('Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
      nodeProfilingIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Profiling
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Release tracking
    release: process.env.npm_package_version,
  });

  // Setup request handlers
  app.use(Sentry.expressErrorHandler());
};

/**
 * Custom error logging with context
 */
export const captureError = (
  error: Error,
  context?: {
    user?: { id: string; email: string };
    request?: Request;
    extra?: Record<string, any>;
  }
) => {
  Sentry.withScope((scope: any) => {
    if (context?.user) {
      scope.setUser({
        id: context.user.id,
        email: context.user.email,
      });
    }

    if (context?.extra) {
      scope.setExtras(context.extra);
    }

    if (context?.request) {
      scope.setContext('request', {
        method: context.request.method,
        url: context.request.url,
        headers: context.request.headers,
      });
    }

    Sentry.captureException(error);
  });
};

/**
 * Middleware to add user context to Sentry
 */
export const sentryUserContext = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.user) {
    Sentry.setUser({
      id: (req.user as any).id || (req.user as any)._id,
      email: (req.user as any).email,
      username: (req.user as any).name,
    });
  }
  next();
};

/**
 * Capture message with severity
 */
export const captureMessage = (
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
  extra?: Record<string, any>
) => {
  Sentry.withScope((scope: any) => {
    if (extra) {
      scope.setExtras(extra);
    }
    Sentry.captureMessage(message, level);
  });
};

