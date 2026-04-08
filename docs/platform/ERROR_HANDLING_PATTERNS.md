# Error Handling & Resilience Patterns

## Overview

This document provides comprehensive documentation on **error handling, retry logic, circuit breakers, and resilience patterns** across the AI Services Platform. It covers:

- **Circuit Breaker Pattern** - Preventing cascading failures
- **Retry Logic** - Exponential backoff with jitter
- **Fallback Strategies** - Graceful degradation
- **Error Classification** - Transient vs permanent errors
- **Monitoring & Alerting** - Error tracking
- **Best Practices** - Implementation guidelines

---

## Table of Contents

1. [Error Types & Classification](#error-types--classification)
2. [Circuit Breaker Implementation](#circuit-breaker-implementation)
3. [Retry Logic with Exponential Backoff](#retry-logic-with-exponential-backoff)
4. [Fallback Strategies](#fallback-strategies)
5. [Frontend Error Handling](#frontend-error-handling)
6. [Backend Error Handling](#backend-error-handling)
7. [Java Error Handling](#java-error-handling)
8. [Error Recovery Patterns](#error-recovery-patterns)
9. [Monitoring & Observability](#monitoring--observability)

---

## Error Types & Classification

### 1. Transient Errors (Retry-able)

**Definition:** Temporary failures that may succeed if retried

| Error Type | Examples | Recovery Strategy |
|------------|----------|-------------------|
| **Network Timeout** | Connection timeout, read timeout | Retry with exponential backoff |
| **Service Unavailable (503)** | Server restart, deployment | Retry with circuit breaker |
| **Rate Limit (429)** | Too many requests | Retry after delay (respect Retry-After header) |
| **Database Lock** | Concurrent update conflict | Retry with jitter |
| **LLM API Overload** | OpenAI capacity issues | Retry with longer timeout |

**Code Example:**
```typescript
const isTransientError = (error: AxiosError): boolean => {
  return (
    !error.response ||
    error.response.status === 503 ||
    error.response.status === 429 ||
    error.response.status >= 500 ||
    error.code === 'ECONNABORTED' ||
    error.code === 'ETIMEDOUT'
  );
};
```

---

### 2. Permanent Errors (Non-retry-able)

**Definition:** Failures that won't succeed even if retried

| Error Type | Examples | Recovery Strategy |
|------------|----------|-------------------|
| **Authentication Failure (401)** | Invalid JWT, expired token | Redirect to login |
| **Authorization Failure (403)** | Insufficient permissions | Show error message |
| **Not Found (404)** | Session doesn't exist | Create new session |
| **Bad Request (400)** | Invalid input, validation error | Show validation errors |
| **Conflict (409)** | Duplicate resource | Show conflict error |

**Code Example:**
```typescript
const isPermanentError = (error: AxiosError): boolean => {
  return error.response && [400, 401, 403, 404, 409].includes(error.response.status);
};
```

---

### 3. Catastrophic Errors (System-Level)

**Definition:** Critical failures requiring immediate attention

| Error Type | Examples | Recovery Strategy |
|------------|----------|-------------------|
| **Out of Memory** | Heap exhausted | Restart service |
| **Database Unavailable** | MongoDB down | Circuit breaker + fallback |
| **LLM API Key Invalid** | API key expired | Alert ops team |
| **gRPC Server Down** | Java service crashed | Circuit breaker + REST fallback |

---

## Circuit Breaker Implementation

### Concept

**Purpose:** Prevent cascading failures by failing fast when a service is unhealthy

**States:**
1. **CLOSED** (Normal) - Requests pass through normally
2. **OPEN** (Failing) - Requests fail immediately without attempting call
3. **HALF_OPEN** (Testing) - Limited requests allowed to test recovery

### State Transition Diagram

```
         Success Count < Threshold
    ┌──────────────────────────────┐
    │                              │
    ▼                              │
┌─────────┐                   ┌────────────┐
│ CLOSED  │────Failures───────>│   OPEN     │
│ (Normal)│  > Threshold       │ (Failing)  │
└─────────┘                   └────────────┘
    ▲                              │
    │                              │
    │          Timeout Elapsed     │
    │         ┌────────────────────┘
    │         ▼
    │    ┌────────────┐
    └────│ HALF_OPEN  │
         │ (Testing)  │
         └────────────┘
```

### Implementation

**File:** `backend-node/src/services/circuitBreaker.ts`

```typescript
export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  name: string;
  failureThreshold: number;    // Failures to open circuit (default: 5)
  successThreshold: number;    // Successes to close circuit (default: 2)
  timeout: number;             // Time in OPEN before HALF_OPEN (default: 60s)
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private nextAttemptTime: number = 0;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      failureThreshold: config.failureThreshold || 5,
      successThreshold: config.successThreshold || 2,
      timeout: config.timeout || 60000,
      name: config.name || 'CircuitBreaker'
    };
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(
    fn: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    // Check if circuit is OPEN
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        console.log(`[${this.config.name}] Circuit OPEN, failing fast`);
        
        if (fallback) {
          console.log(`[${this.config.name}] Using fallback`);
          return await fallback();
        }
        
        throw new Error(`Circuit breaker is OPEN for ${this.config.name}`);
      } else {
        // Timeout elapsed, move to HALF_OPEN
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
        console.log(`[${this.config.name}] Circuit moved to HALF_OPEN`);
      }
    }

    try {
      // Execute function
      const result = await fn();

      // Record success
      this.onSuccess();

      return result;

    } catch (error) {
      // Record failure
      this.onFailure();

      // Use fallback if available
      if (fallback && this.state === CircuitState.OPEN) {
        console.log(`[${this.config.name}] Using fallback after failure`);
        return await fallback();
      }

      throw error;
    }
  }

  /**
   * Handle successful call
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.config.successThreshold) {
        console.log(`[${this.config.name}] Circuit closed after ${this.successCount} successes`);
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  /**
   * Handle failed call
   */
  private onFailure(): void {
    this.failureCount++;

    console.log(
      `[${this.config.name}] Failure count: ${this.failureCount}/${this.config.failureThreshold}`
    );

    if (this.failureCount >= this.config.failureThreshold) {
      this.openCircuit();
    }
  }

  /**
   * Open the circuit
   */
  private openCircuit(): void {
    this.state = CircuitState.OPEN;
    this.nextAttemptTime = Date.now() + this.config.timeout;

    console.log(
      `[${this.config.name}] Circuit opened, will retry after ${this.config.timeout}ms`
    );
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Reset circuit to CLOSED (for testing/manual intervention)
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttemptTime = 0;
    console.log(`[${this.config.name}] Circuit manually reset`);
  }
}
```

### Usage Example

```typescript
import { CircuitBreaker } from './circuitBreaker';

const javaServiceBreaker = new CircuitBreaker({
  name: 'JavaVAService',
  failureThreshold: 5,     // Open after 5 failures
  successThreshold: 2,      // Close after 2 successes in HALF_OPEN
  timeout: 60000            // Try again after 60 seconds
});

async function callJavaService(data: any) {
  return await javaServiceBreaker.execute(
    // Primary function
    async () => {
      const response = await axios.post('http://localhost:8136/chat/message', data);
      return response.data;
    },
    // Fallback function
    async () => {
      return {
        message: "I'm temporarily unavailable. Please try again shortly.",
        intent: 'system_error',
        requiresAction: false
      };
    }
  );
}
```

### Monitoring Circuit State

```typescript
// Expose circuit breaker state via API
app.get('/health/circuit-breakers', (req, res) => {
  res.json({
    javaVAService: {
      state: javaServiceBreaker.getState(),
      healthy: javaServiceBreaker.getState() === CircuitState.CLOSED
    }
  });
});

// Output:
{
  "javaVAService": {
    "state": "OPEN",
    "healthy": false
  }
}
```

---

## Retry Logic with Exponential Backoff

### Concept

**Purpose:** Retry transient failures with increasing delays to avoid overwhelming failing services

**Formula:** `delay = baseDelay × 2^attempt + jitter`

**Example:**
- Attempt 1: 1s + random(0-1s) = 1-2s
- Attempt 2: 2s + random(0-1s) = 2-3s
- Attempt 3: 4s + random(0-1s) = 4-5s
- Attempt 4: 8s + random(0-1s) = 8-9s

### Implementation

**File:** `backend-node/src/services/apiClient.ts`

```typescript
export interface RetryConfig {
  retries: number;                                    // Max retry attempts
  retryDelay: number;                                 // Base delay in ms
  retryCondition?: (error: AxiosError) => boolean;   // Should retry?
}

export class ApiClient {
  private retryConfig: RetryConfig;

  constructor(config: ApiClientConfig) {
    this.retryConfig = {
      retries: config.retryAttempts || 3,
      retryDelay: 1000, // 1 second base
      retryCondition: (error: AxiosError) => {
        // Retry on network errors or 5xx server errors
        return (
          !error.response ||
          (error.response.status >= 500 && error.response.status < 600) ||
          error.code === 'ECONNABORTED' ||
          error.code === 'ETIMEDOUT'
        );
      },
    };
  }

  /**
   * Retry logic with exponential backoff and jitter
   */
  private async retryRequest<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    attempt: number = 0
  ): Promise<AxiosResponse<T>> {
    try {
      // Attempt request
      return await requestFn();

    } catch (error) {
      const axiosError = error as AxiosError;

      // Check if should retry
      const shouldRetry =
        attempt < this.retryConfig.retries &&
        this.retryConfig.retryCondition?.(axiosError);

      if (shouldRetry) {
        // Calculate delay with exponential backoff
        const exponentialDelay = this.retryConfig.retryDelay * Math.pow(2, attempt);
        
        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 1000;
        
        const totalDelay = exponentialDelay + jitter;

        console.log(
          `[${this.name}] Retrying request (attempt ${attempt + 1}/${
            this.retryConfig.retries
          }) after ${Math.round(totalDelay)}ms`
        );

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, totalDelay));

        // Recursive retry
        return this.retryRequest(requestFn, attempt + 1);
      }

      // No more retries, throw error
      throw error;
    }
  }
}
```

### Retry with Rate Limit Handling

```typescript
private async retryRequest<T>(
  requestFn: () => Promise<AxiosResponse<T>>,
  attempt: number = 0
): Promise<AxiosResponse<T>> {
  try {
    return await requestFn();
  } catch (error) {
    const axiosError = error as AxiosError;

    // Special handling for rate limits
    if (axiosError.response?.status === 429) {
      const retryAfter = axiosError.response.headers['retry-after'];
      const delay = retryAfter
        ? parseInt(retryAfter) * 1000
        : this.retryConfig.retryDelay * Math.pow(2, attempt);

      console.log(`[Rate Limited] Retrying after ${delay}ms`);

      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.retryRequest(requestFn, attempt + 1);
    }

    // ... rest of retry logic
  }
}
```

### Retry Decision Matrix

| Status Code | Error Type | Retry? | Max Attempts | Backoff |
|-------------|-----------|--------|--------------|---------|
| 408 | Timeout | ✅ Yes | 3 | Exponential |
| 429 | Rate Limit | ✅ Yes | 5 | Retry-After header |
| 500 | Server Error | ✅ Yes | 3 | Exponential |
| 502 | Bad Gateway | ✅ Yes | 3 | Exponential |
| 503 | Unavailable | ✅ Yes | 3 | Exponential |
| 504 | Gateway Timeout | ✅ Yes | 3 | Exponential |
| 400 | Bad Request | ❌ No | 0 | N/A |
| 401 | Unauthorized | ❌ No | 0 | N/A |
| 403 | Forbidden | ❌ No | 0 | N/A |
| 404 | Not Found | ❌ No | 0 | N/A |

---

## Fallback Strategies

### 1. Default Response Fallback

**Use Case:** Return safe default when service unavailable

```typescript
const response = await javaVAClient.post(
  '/chat/message',
  { sessionId, message },
  { timeout: 30000 },
  // Fallback function
  () => ({
    sessionId,
    message: "I'm temporarily unavailable. Our service will be back shortly.",
    intent: 'system_error',
    requiresAction: false
  })
);
```

---

### 2. Cache Fallback

**Use Case:** Return cached response when service fails

```typescript
import { redisClient } from './redis';

async function getChatResponse(sessionId: string, message: string) {
  const cacheKey = `response:${sessionId}:${hashMessage(message)}`;

  try {
    // Try primary service
    const response = await javaVAClient.post('/chat/message', { sessionId, message });

    // Cache successful response
    await redisClient.setex(cacheKey, 3600, JSON.stringify(response.data));

    return response.data;

  } catch (error) {
    console.log('[Fallback] Checking cache');

    // Fallback to cache
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      console.log('[Fallback] Cache hit');
      return JSON.parse(cached);
    }

    // No cache available
    throw error;
  }
}
```

---

### 3. Alternative Service Fallback

**Use Case:** Switch to backup service when primary fails

```typescript
async function processMessage(message: string) {
  try {
    // Try primary LLM (OpenAI)
    return await openaiClient.generate(message);

  } catch (error) {
    console.log('[Fallback] Switching to Claude');

    // Fallback to Claude
    return await claudeClient.generate(message);
  }
}
```

---

### 4. Degraded Functionality Fallback

**Use Case:** Provide limited features when full service unavailable

```typescript
async function handleChatMessage(sessionId: string, message: string) {
  const circuitState = javaServiceBreaker.getState();

  if (circuitState === CircuitState.OPEN) {
    // Degraded mode: keyword matching only
    return {
      message: getDegradedResponse(message),
      intent: classifyLocally(message),
      requiresAction: false,
      degraded: true
    };
  }

  // Full service available
  return await callJavaService(sessionId, message);
}

function getDegradedResponse(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('appointment')) {
    return "I can help you book an appointment. Please call us at 1-800-555-0123.";
  }
  
  if (lowerMessage.includes('hours')) {
    return "Our business hours are Monday-Friday, 9 AM to 5 PM EST.";
  }

  return "I'm currently operating in limited mode. Please try again later or contact support.";
}
```

---

## Frontend Error Handling

### Error Boundary Component

**Purpose:** Catch React errors and show fallback UI

```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    
    // Log to error tracking service
    if (window.analytics) {
      window.analytics.track('Error', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h1>Something went wrong</h1>
          <p>We're sorry for the inconvenience. Please refresh the page.</p>
          <button onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage:
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

---

### Socket Error Handling

```typescript
useEffect(() => {
  if (!socket) return;

  // Connection errors
  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error);
    setConnectionError('Unable to connect to server');
    setConnectionStatus('Error 🔴');
  });

  // Disconnect handling
  socket.on('disconnect', (reason) => {
    console.warn('[Socket] Disconnected:', reason);
    setConnectionStatus('Disconnected 🔴');

    if (reason === 'io server disconnect') {
      // Server forcefully disconnected, need manual reconnect
      setTimeout(() => socket.connect(), 1000);
    }
    // For other reasons, Socket.IO auto-reconnects
  });

  // Reconnection attempts
  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log(`[Socket] Reconnecting... (attempt ${attemptNumber})`);
    setConnectionStatus(`Reconnecting... (${attemptNumber}) 🟡`);
  });

  // Successful reconnection
  socket.on('reconnect', (attemptNumber) => {
    console.log(`[Socket] Reconnected after ${attemptNumber} attempts`);
    setConnectionStatus('Connected 🟢');
    setConnectionError('');

    // Re-join session
    if (sessionId) {
      socket.emit('chat:join-session', sessionId);
    }
  });

  // Reconnection failed
  socket.on('reconnect_failed', () => {
    console.error('[Socket] Reconnection failed');
    setConnectionError('Unable to reconnect. Please refresh the page.');
    setConnectionStatus('Failed 🔴');
  });

  // Chat-specific errors
  socket.on('chat:error', ({ error, canRetry, circuitState }) => {
    console.error('[Chat] Error:', error);
    
    if (circuitState === 'OPEN') {
      setError('Our service is temporarily unavailable. Please try again in a few minutes.');
    } else if (canRetry) {
      setError('Failed to send message. Please try again.');
    } else {
      setError(error);
    }
  });

  return () => {
    socket.off('connect_error');
    socket.off('disconnect');
    socket.off('reconnect_attempt');
    socket.off('reconnect');
    socket.off('reconnect_failed');
    socket.off('chat:error');
  };
}, [socket, sessionId]);
```

---

### Graceful Degradation

```typescript
const AssistantChat = () => {
  const { socket, isConnected } = useSocket();
  const [useREST, setUseREST] = useState(false);

  const sendMessage = async (content: string) => {
    if (socket && isConnected && !useREST) {
      // Try WebSocket first
      try {
        socket.emit('chat:send-message', { sessionId, message: content });
      } catch (error) {
        console.error('[WebSocket] Failed, falling back to REST');
        setUseREST(true);
        await sendViaREST(content);
      }
    } else {
      // Fallback to REST API
      await sendViaREST(content);
    }
  };

  const sendViaREST = async (content: string) => {
    try {
      const response = await axios.post('/api/chat/message', {
        sessionId,
        message: content
      });

      setMessages(prev => [...prev, response.data]);
    } catch (error) {
      setError('Failed to send message. Please check your connection.');
    }
  };

  return (
    // ... component JSX
  );
};
```

---

## Backend Error Handling

### Global Error Handler

```typescript
// Express global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[Global Error Handler]', err);

  // Log to monitoring service
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userId: req.user?.id
  });

  // Don't leak error details in production
  const errorResponse = process.env.NODE_ENV === 'production'
    ? { error: 'Internal server error' }
    : { error: err.message, stack: err.stack };

  res.status(500).json(errorResponse);
});
```

---

### Socket.IO Error Handling

```typescript
export function setupChatHandlers(socket: AuthenticatedSocket): void {
  socket.on('chat:send-message', async (data: ChatMessageData) => {
    try {
      // ... process message

    } catch (error: any) {
      console.error('[Chat Socket] Error:', error);

      // Classify error type
      let userMessage: string;
      let canRetry: boolean;

      if (error.response?.status === 404) {
        userMessage = 'Session not found. Please start a new chat.';
        canRetry = false;
      } else if (error.code === 'ETIMEDOUT') {
        userMessage = 'Request timed out. Please try again.';
        canRetry = true;
      } else if (javaVAClient.getCircuitState() === 'OPEN') {
        userMessage = 'Our service is temporarily unavailable. Please try again in a few minutes.';
        canRetry = false;
      } else {
        userMessage = 'Failed to process message. Please try again.';
        canRetry = true;
      }

      // Send error to client
      socket.emit('chat:error', {
        error: userMessage,
        canRetry,
        circuitState: javaVAClient.getCircuitState(),
        timestamp: new Date()
      });

      // Always stop typing indicator
      socket.emit('chat:typing', { isTyping: false });
    }
  });
}
```

---

## Java Error Handling

### Global Exception Handler

```java
@ControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LogFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(SessionNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleSessionNotFound(SessionNotFoundException ex) {
        logger.warn("Session not found: {}", ex.getSessionId());
        
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(new ErrorResponse("SESSION_NOT_FOUND", ex.getMessage()));
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ErrorResponse> handleUnauthorized(UnauthorizedException ex) {
        logger.warn("Unauthorized access: {}", ex.getMessage());
        
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(new ErrorResponse("UNAUTHORIZED", ex.getMessage()));
    }

    @ExceptionHandler(LlmTimeoutException.class)
    public ResponseEntity<ErrorResponse> handleLlmTimeout(LlmTimeoutException ex) {
        logger.error("LLM timeout: {}", ex.getMessage());
        
        return ResponseEntity.status(HttpStatus.GATEWAY_TIMEOUT)
            .body(new ErrorResponse("LLM_TIMEOUT", "Request took too long. Please try again."));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex) {
        logger.error("Unhandled exception", ex);
        
        // Don't leak internal details
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(new ErrorResponse("INTERNAL_ERROR", "An error occurred processing your request"));
    }
}
```

---

### LLM Client with Retry

```java
@Service
public class LlmClient {

    private static final int MAX_RETRIES = 3;
    private static final long INITIAL_DELAY_MS = 1000;

    public String generate(String prompt, List<Turn> history) {
        return retryWithBackoff(() -> {
            try {
                return callOpenAI(prompt, history);
            } catch (SocketTimeoutException e) {
                throw new LlmTimeoutException("OpenAI request timed out", e);
            } catch (HttpClientErrorException e) {
                if (e.getStatusCode().value() == 429) {
                    throw new RetryableException("Rate limited", e);
                }
                throw e;
            }
        }, MAX_RETRIES);
    }

    private <T> T retryWithBackoff(Supplier<T> operation, int maxRetries) {
        int attempt = 0;
        long delay = INITIAL_DELAY_MS;

        while (true) {
            try {
                return operation.get();

            } catch (RetryableException e) {
                attempt++;

                if (attempt >= maxRetries) {
                    logger.error("Max retries exceeded");
                    throw e;
                }

                logger.warn("Retry attempt {}/{} after {}ms", attempt, maxRetries, delay);

                try {
                    Thread.sleep(delay);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException(ie);
                }

                delay *= 2; // Exponential backoff
            }
        }
    }
}
```

---

## Error Recovery Patterns

### 1. Automatic Session Recovery

```typescript
socket.on('chat:session-not-found', async ({ sessionId }) => {
  console.log('[Recovery] Session not found, creating new one');

  try {
    // Create new session
    const response = await axios.post('/api/chat/session', {
      productId: 'va-service'
    });

    // Update local state
    setSessionId(response.data.sessionId);

    // Rejoin via WebSocket
    socket.emit('chat:join-session', response.data.sessionId);

    // Notify user
    setMessages(prev => [...prev, {
      role: 'system',
      content: 'Your previous session expired. Started a new conversation.'
    }]);

  } catch (error) {
    setError('Failed to recover session. Please refresh the page.');
  }
});
```

---

### 2. Message Queue for Offline Support

```typescript
class MessageQueue {
  private queue: Message[] = [];
  private processing = false;

  async add(message: Message) {
    this.queue.push(message);
    this.process();
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const message = this.queue[0];

      try {
        await sendMessage(message);
        this.queue.shift(); // Remove on success

      } catch (error) {
        console.error('[Queue] Failed to send message, will retry');
        await sleep(5000);
        // Keep in queue for retry
      }
    }

    this.processing = false;
  }
}

// Usage:
const messageQueue = new MessageQueue();

const handleSend = (content: string) => {
  messageQueue.add({ sessionId, content });
};
```

---

## Monitoring & Observability

### Error Metrics

```typescript
import { Counter, Histogram } from 'prom-client';

// Error counters
const errorCounter = new Counter({
  name: 'chat_errors_total',
  help: 'Total number of chat errors',
  labelNames: ['error_type', 'service']
});

// Latency histogram
const latencyHistogram = new Histogram({
  name: 'chat_latency_seconds',
  help: 'Chat request latency',
  labelNames: ['endpoint', 'status']
});

// Track errors
socket.on('chat:send-message', async (data) => {
  const startTime = Date.now();

  try {
    await processMessage(data);

    latencyHistogram.labels('/chat/message', 'success')
      .observe((Date.now() - startTime) / 1000);

  } catch (error) {
    errorCounter.labels(error.name, 'java-va').inc();

    latencyHistogram.labels('/chat/message', 'error')
      .observe((Date.now() - startTime) / 1000);

    throw error;
  }
});
```

---

### Health Check Endpoints

```typescript
app.get('/health', (req, res) => {
  const health = {
    status: 'UP',
    timestamp: new Date().toISOString(),
    services: {
      mongodb: checkMongoDB(),
      javaVA: javaVAClient.getCircuitState() === 'CLOSED',
      redis: checkRedis()
    },
    circuitBreakers: {
      javaVA: javaVAClient.getCircuitState()
    }
  };

  const allHealthy = Object.values(health.services).every(s => s);
  const statusCode = allHealthy ? 200 : 503;

  res.status(statusCode).json(health);
});

// Output:
{
  "status": "DEGRADED",
  "timestamp": "2026-01-15T10:30:00.000Z",
  "services": {
    "mongodb": true,
    "javaVA": false,
    "redis": true
  },
  "circuitBreakers": {
    "javaVA": "OPEN"
  }
}
```

---

## Summary

### Key Resilience Patterns

| Pattern | Purpose | When to Use |
|---------|---------|-------------|
| **Circuit Breaker** | Fail fast when service unhealthy | External service calls |
| **Retry with Backoff** | Recover from transient failures | Network errors, rate limits |
| **Fallback** | Graceful degradation | Critical user flows |
| **Timeout** | Prevent hanging requests | All external calls |
| **Error Boundary** | Catch React errors | Component tree root |
| **Health Checks** | Monitor service status | All services |

### Best Practices

1. ✅ **Always set timeouts** on external calls
2. ✅ **Use circuit breakers** for external services
3. ✅ **Implement fallbacks** for critical paths
4. ✅ **Log errors with context** (user ID, session ID, etc.)
5. ✅ **Classify errors** (transient vs permanent)
6. ✅ **Provide user-friendly messages** (don't leak internals)
7. ✅ **Monitor error rates** and set alerts
8. ✅ **Test failure scenarios** (chaos engineering)

---

**Previous Document:** [END_TO_END_INTEGRATION_GUIDE.md](./END_TO_END_INTEGRATION_GUIDE.md)

**Document Version:** 1.0.0  
**Last Updated:** January 15, 2026  
**Documentation Complete:** ✅ All 5 documents created
