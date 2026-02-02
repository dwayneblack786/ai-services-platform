import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry for frontend error tracking
 */
export const initializeSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    console.warn('Sentry DSN not configured. Frontend error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE || 'development',
    integrations: [
      Sentry.browserTracingIntegration(),
      // Note: Session Replay requires @sentry/replay package
      // Install with: npm install --save @sentry/replay
      // Then add: Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true })
    ],
    // Performance Monitoring
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    // Release tracking
    release: import.meta.env.VITE_APP_VERSION,
    // Ignore common errors
    ignoreErrors: [
      // Network errors
      'Network request failed',
      'Failed to fetch',
      'NetworkError',
      // Browser extension errors
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
    ],
    beforeSend(event) {
      // Filter out development errors
      if (import.meta.env.MODE === 'development') {
        console.log('Sentry event (dev mode):', event);
        return null; // Don't send to Sentry in development
      }

      // Add user context from localStorage if available
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          event.user = {
            id: user.id,
            email: user.email,
            username: user.name,
          };
        } catch (e) {
          // Ignore parse errors
        }
      }

      return event;
    },
  });

  console.log('✅ Sentry initialized for frontend');
};

/**
 * Set user context for Sentry
 */
export const setUserContext = (user: { id: string; email: string; name?: string } | null) => {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.name,
    });
  } else {
    Sentry.setUser(null);
  }
};

/**
 * Capture an exception manually
 */
export const captureException = (error: Error, context?: Record<string, any>) => {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    Sentry.captureException(error);
  });
};

/**
 * Capture a message
 */
export const captureMessage = (
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
  context?: Record<string, any>
) => {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    Sentry.captureMessage(message, level);
  });
};

/**
 * Add breadcrumb for tracking user actions
 */
export const addBreadcrumb = (message: string, category?: string, data?: Record<string, any>) => {
  Sentry.addBreadcrumb({
    message,
    category: category || 'user-action',
    level: 'info',
    data,
  });
};
