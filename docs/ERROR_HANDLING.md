# Frontend Error Handling & Resilience Guide

## Overview

This document covers comprehensive error handling strategies in React applications, including error boundaries, API error handling, async error management, user feedback, and recovery mechanisms.

**Error Handling Principles:**
- Fail gracefully with helpful messages
- Provide recovery options when possible
- Log errors for debugging and monitoring
- Prevent entire app crash from component errors
- Show context-appropriate error messages

## Error Boundaries

### Basic Error Boundary

```typescript
// src/components/common/ErrorBoundary.tsx
import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo);
    }

    // Log to error tracking service (Sentry, LogRocket, etc.)
    logErrorToService(error, errorInfo);

    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <ErrorFallback
            error={this.state.error}
            errorInfo={this.state.errorInfo}
            onReset={() => this.setState({ hasError: false, error: null, errorInfo: null })}
          />
        )
      );
    }

    return this.props.children;
  }
}

// Fallback UI component
interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, errorInfo, onReset }) => {
  return (
    <div
      style={{
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: '#fee',
        border: '1px solid #f99',
        borderRadius: '0.5rem',
        margin: '1rem',
      }}
    >
      <h2>Something went wrong</h2>
      <p>We encountered an error. Please try refreshing the page.</p>

      {process.env.NODE_ENV === 'development' && error && (
        <details style={{ whiteSpace: 'pre-wrap', marginTop: '1rem', textAlign: 'left' }}>
          <summary>Error details (development only)</summary>
          <p>{error.toString()}</p>
          {errorInfo && <p>{errorInfo.componentStack}</p>}
        </details>
      )}

      <button
        onClick={onReset}
        style={{
          marginTop: '1rem',
          padding: '0.5rem 1rem',
          backgroundColor: '#1a9aff',
          color: 'white',
          border: 'none',
          borderRadius: '0.375rem',
          cursor: 'pointer',
        }}
      >
        Try Again
      </button>
    </div>
  );
};
```

### Feature-Level Error Boundaries

```typescript
// Wrap feature components with error boundaries
import { ErrorBoundary } from './ErrorBoundary';

export const DashboardPage: React.FC = () => {
  return (
    <div>
      <Header />
      
      <ErrorBoundary fallback={<DashboardError />}>
        <StatsSection />
      </ErrorBoundary>

      <ErrorBoundary fallback={<ChatError />}>
        <ChatAssistant />
      </ErrorBoundary>

      <ErrorBoundary fallback={<AnalyticsError />}>
        <AnalyticsSection />
      </ErrorBoundary>
    </div>
  );
};

const DashboardError = () => (
  <div style={{ padding: '1rem', backgroundColor: '#fee', borderRadius: '0.5rem' }}>
    <p>Unable to load dashboard stats. Please try refreshing.</p>
  </div>
);

const ChatError = () => (
  <div style={{ padding: '1rem', backgroundColor: '#fee', borderRadius: '0.5rem' }}>
    <p>Chat assistant temporarily unavailable.</p>
  </div>
);

const AnalyticsError = () => (
  <div style={{ padding: '1rem', backgroundColor: '#fee', borderRadius: '0.5rem' }}>
    <p>Unable to load analytics data.</p>
  </div>
);
```

## API Error Handling

### Centralized Error Handler

```typescript
// src/services/api/errorHandler.ts
import axios, { AxiosError } from 'axios';

export interface ApiError {
  message: string;
  code: string;
  status: number;
  details?: Record<string, any>;
}

export class ApiErrorHandler {
  static handle(error: AxiosError): ApiError {
    const status = error.response?.status || 0;
    const data = error.response?.data as any;

    // Handle different error types
    if (status === 401) {
      // Unauthorized - trigger logout
      return {
        message: 'Session expired. Please login again.',
        code: 'UNAUTHORIZED',
        status,
      };
    }

    if (status === 403) {
      // Forbidden
      return {
        message: 'You do not have permission to access this resource.',
        code: 'FORBIDDEN',
        status,
      };
    }

    if (status === 404) {
      // Not found
      return {
        message: 'Resource not found.',
        code: 'NOT_FOUND',
        status,
      };
    }

    if (status === 422) {
      // Validation error
      return {
        message: 'Please check your input and try again.',
        code: 'VALIDATION_ERROR',
        status,
        details: data?.errors,
      };
    }

    if (status === 429) {
      // Rate limit
      return {
        message: 'Too many requests. Please try again later.',
        code: 'RATE_LIMITED',
        status,
      };
    }

    if (status >= 500) {
      // Server error
      return {
        message: 'Server error. Please try again later.',
        code: 'SERVER_ERROR',
        status,
      };
    }

    if (!error.response) {
      // Network error
      return {
        message: 'Network error. Check your connection and try again.',
        code: 'NETWORK_ERROR',
        status: 0,
      };
    }

    // Default error
    return {
      message: data?.message || 'An unexpected error occurred.',
      code: data?.code || 'UNKNOWN_ERROR',
      status,
    };
  }
}

// Setup axios interceptor
export const setupApiErrorHandling = () => {
  axios.interceptors.response.use(
    response => response,
    error => {
      const apiError = ApiErrorHandler.handle(error);

      if (apiError.code === 'UNAUTHORIZED') {
        // Trigger logout and redirect to login
        window.location.href = '/login';
      }

      throw apiError;
    }
  );
};
```

### API Request Error Hook

```typescript
// src/hooks/useApiWithErrorHandling.ts
import { useState, useCallback } from 'react';
import axios, { AxiosError } from 'axios';
import { ApiErrorHandler, ApiError } from '../services/api/errorHandler';

interface UseApiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: ApiError) => void;
}

export function useApiWithErrorHandling<T>(
  url: string,
  options: UseApiOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const execute = useCallback(
    async (config?: any) => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.get<T>(url, config);
        setData(response.data);
        options.onSuccess?.(response.data);
        return response.data;
      } catch (err) {
        const apiError = ApiErrorHandler.handle(err as AxiosError);
        setError(apiError);
        options.onError?.(apiError);
        throw apiError;
      } finally {
        setLoading(false);
      }
    },
    [url, options]
  );

  return { data, loading, error, execute };
}
```

## Error Recovery Strategies

### Retry Logic with Exponential Backoff

```typescript
// src/utils/retry.ts
export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: any) => boolean;
}

export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    backoffMultiplier = 2,
    shouldRetry = () => true,
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if shouldn't retry
      if (!shouldRetry(error)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelayMs * Math.pow(backoffMultiplier, attempt),
        maxDelayMs
      );

      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 0.1 * delay;

      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }
  }

  throw lastError;
}

// Usage in API call
const fetchData = async () => {
  return retryAsync(
    () => axios.get('/api/data'),
    {
      maxRetries: 3,
      initialDelayMs: 1000,
      shouldRetry: (error: AxiosError) => {
        // Retry on network errors and 5xx status codes
        return !error.response || error.response.status >= 500;
      },
    }
  );
};
```

### Fallback Data Strategy

```typescript
// src/hooks/useFallbackData.ts
export function useFallbackData<T>(
  primaryFetch: () => Promise<T>,
  fallbackFetch?: () => Promise<T>,
  fallbackData?: T
) {
  const [data, setData] = useState<T | undefined>(fallbackData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const result = await primaryFetch();
        setData(result);
        setError(null);
      } catch (err) {
        // Try fallback fetch
        if (fallbackFetch) {
          try {
            const fallbackResult = await fallbackFetch();
            setData(fallbackResult);
            setError(null);
            return;
          } catch (fallbackErr) {
            // Both failed, use fallback data if available
            if (!fallbackData) {
              setError(err as Error);
            }
          }
        } else if (!fallbackData) {
          setError(err as Error);
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [primaryFetch, fallbackFetch, fallbackData]);

  return { data, loading, error };
}
```

## User-Facing Error Messages

### Error Message Strategy

```typescript
// src/constants/errorMessages.ts
export const ERROR_MESSAGES: Record<string, string> = {
  // Auth errors
  INVALID_CREDENTIALS: 'Email or password is incorrect.',
  SESSION_EXPIRED: 'Your session has expired. Please login again.',
  UNAUTHORIZED_ACCESS: 'You do not have permission to access this resource.',

  // Validation errors
  EMAIL_REQUIRED: 'Email address is required.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  PASSWORD_REQUIRED: 'Password is required.',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters.',

  // Network errors
  NETWORK_ERROR: 'Unable to connect. Check your internet connection.',
  REQUEST_TIMEOUT: 'Request timed out. Please try again.',
  SERVER_ERROR: 'Server error. Please try again later.',

  // Generic
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
};

export const getUserFriendlyMessage = (errorCode: string): string => {
  return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.UNKNOWN_ERROR;
};
```

### Error Toast Notification

```typescript
// src/components/notifications/ErrorNotification.tsx
import { useNotification } from '../../hooks/useNotification';
import { ApiError } from '../../services/api/errorHandler';
import { getUserFriendlyMessage } from '../../constants/errorMessages';

export const useErrorNotification = () => {
  const { addNotification } = useNotification();

  const showError = (error: ApiError | Error) => {
    let message: string;

    if (error instanceof Error && 'code' in error) {
      const apiError = error as ApiError;
      message = getUserFriendlyMessage(apiError.code);
    } else if (error instanceof Error) {
      message = error.message;
    } else {
      message = 'An unexpected error occurred.';
    }

    addNotification({
      type: 'error',
      message,
      duration: 5000,
    });
  };

  const showValidationErrors = (errors: Record<string, string>) => {
    Object.entries(errors).forEach(([field, message]) => {
      addNotification({
        type: 'error',
        message: `${field}: ${message}`,
        duration: 4000,
      });
    });
  };

  return { showError, showValidationErrors };
};
```

## Error Logging and Monitoring

### Error Tracking Setup

```typescript
// src/services/logging/errorTracking.ts
export interface ErrorContext {
  userId?: string;
  tenantId?: string;
  route?: string;
  action?: string;
  [key: string]: any;
}

export class ErrorTracker {
  private static context: ErrorContext = {};

  static setContext(context: Partial<ErrorContext>) {
    this.context = { ...this.context, ...context };
  }

  static captureError(error: Error, tags?: Record<string, string>) {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Tracked error:', error);
    }

    // Send to error tracking service (Sentry)
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        tags,
        contexts: { app: this.context },
      });
    }

    // Send to backend logging endpoint
    this.sendToBackend(error, tags);
  }

  private static sendToBackend(error: Error, tags?: Record<string, string>) {
    const payload = {
      message: error.message,
      stack: error.stack,
      context: this.context,
      tags,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };

    // Use beacon API for reliability
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/errors', JSON.stringify(payload));
    } else {
      // Fallback to regular fetch
      fetch('/api/errors', {
        method: 'POST',
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {
        // Silently fail - don't break the app
      });
    }
  }
}

// Setup context on app load
export const initializeErrorTracking = (userId?: string, tenantId?: string) => {
  ErrorTracker.setContext({ userId, tenantId });

  // Capture uncaught errors
  window.addEventListener('error', event => {
    ErrorTracker.captureError(event.error);
  });

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', event => {
    ErrorTracker.captureError(
      event.reason instanceof Error ? event.reason : new Error(String(event.reason))
    );
  });
};
```

## Common Error Scenarios

### Loading State Errors

```typescript
// Component with loading and error states
const DataComponent: React.FC<{ dataId: string }> = ({ dataId }) => {
  const { data, loading, error, execute } = useApiWithErrorHandling(
    `/api/data/${dataId}`
  );

  if (loading) {
    return <Skeleton />;
  }

  if (error) {
    return (
      <div>
        <p>{error.message}</p>
        <button onClick={() => execute()}>Try Again</button>
      </div>
    );
  }

  return <DataDisplay data={data} />;
};
```

### Form Submission Errors

```typescript
const SubmitForm: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showError, showValidationErrors } = useErrorNotification();

  const handleSubmit = async (values: any) => {
    setIsSubmitting(true);
    try {
      await axios.post('/api/submit', values);
      // Success handling
    } catch (error) {
      const apiError = error as ApiError;
      
      if (apiError.code === 'VALIDATION_ERROR' && apiError.details) {
        showValidationErrors(apiError.details);
      } else {
        showError(apiError);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return <Form onSubmit={handleSubmit} isLoading={isSubmitting} />;
};
```

## Error Handling Checklist

- [ ] Error boundaries wrap all feature sections
- [ ] API errors caught and transformed to user-friendly messages
- [ ] Network errors handled gracefully
- [ ] Retry logic with exponential backoff for transient failures
- [ ] 401/403 errors trigger re-authentication
- [ ] Validation errors displayed field-by-field
- [ ] Loading states prevent repeated requests
- [ ] Error context preserved for debugging
- [ ] Errors logged to backend/monitoring service
- [ ] User sees helpful, non-technical messages
- [ ] Recovery options available (Retry, Go Back, etc.)
- [ ] No silent failures
- [ ] Error pages styled consistently
- [ ] Accessibility maintained in error states
- [ ] Error testing included in test suite

## Related Documentation

- [TESTING_STRATEGY.md](TESTING_STRATEGY.md) - Testing error scenarios
- [COMPONENT_PATTERNS.md](COMPONENT_PATTERNS.md) - Error boundary patterns
- [HOOKS_CONVENTIONS.md](HOOKS_CONVENTIONS.md) - Error handling in hooks

