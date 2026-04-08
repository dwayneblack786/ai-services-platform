# External APIs & Integration Patterns

📑 **Table of Contents**
- [Overview](#overview)
- [API Client Abstraction](#api-client-abstraction)
  - [Base API Client](#base-api-client)
- [Specific API Implementations](#specific-api-implementations)
  - [Payment Gateway Integration](#payment-gateway-integration)
  - [AI Service Integration](#ai-service-integration)
- [Rate Limiting](#rate-limiting)
  - [Rate Limiter Implementation](#rate-limiter-implementation)
  - [Rate Limit Middleware](#rate-limit-middleware)
- [Retry Strategies](#retry-strategies)
  - [Intelligent Retry Logic](#intelligent-retry-logic)
- [Circuit Breaker Pattern](#circuit-breaker-pattern)
- [API Response Caching](#api-response-caching)
- [External API Best Practices Checklist](#external-api-best-practices-checklist)
- [Related Documentation](#related-documentation)

---

## Overview

This guide covers consuming external APIs, handling rate limiting, implementing retry logic, and managing API dependencies safely.

**Implementation Status:** Current backend integrates with Java VA microservice via Axios with basic error handling. The infero-api.ts client provides a foundation that can be extended with retry logic, rate limiting, and circuit breaker patterns. This document covers both the current implementation and recommended production patterns.

**API Integration Principles:**
- Abstract external API calls
- Handle rate limiting gracefully
- Implement retry strategies
- Monitor API health
- Cache API responses

## API Client Abstraction

### Base API Client

```typescript
// src/services/apiClients/baseClient.ts
import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';

export interface ClientConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
  retryAttempts?: number;
}

export class ApiClient {
  private client: AxiosInstance;
  private retryAttempts: number;

  constructor(config: ClientConfig) {
    this.retryAttempts = config.retryAttempts || 3;

    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
      },
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(request => {
      console.log('API Request:', request.method?.toUpperCase(), request.url);
      return request;
    });

    // Add response interceptor
    this.client.interceptors.response.use(
      response => response,
      error => this.handleError(error)
    );
  }

  async get<T>(url: string, config?: any): Promise<T> {
    return this.retryRequest(() => this.client.get<T>(url, config));
  }

  async post<T>(url: string, data: any, config?: any): Promise<T> {
    return this.retryRequest(() => this.client.post<T>(url, data, config));
  }

  async put<T>(url: string, data: any, config?: any): Promise<T> {
    return this.retryRequest(() => this.client.put<T>(url, data, config));
  }

  async delete<T>(url: string, config?: any): Promise<T> {
    return this.retryRequest(() => this.client.delete<T>(url, config));
  }

  /**
   * Retry with exponential backoff
   */
  private async retryRequest<T>(
    request: () => Promise<AxiosResponse<T>>,
    attempt: number = 0
  ): Promise<T> {
    try {
      const response = await request();
      return response.data;
    } catch (error: any) {
      // Don't retry on client errors (4xx)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw error;
      }

      // Retry on server errors and network errors
      if (attempt < this.retryAttempts) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`Retry attempt ${attempt + 1}/${this.retryAttempts} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryRequest(request, attempt + 1);
      }

      throw error;
    }
  }

  private handleError(error: AxiosError) {
    console.error('API Error:', {
      status: error.response?.status,
      message: error.message,
      url: error.config?.url,
    });
    throw error;
  }
}
```

## Specific API Implementations

### Payment Gateway Integration

```typescript
// src/services/apiClients/stripeClient.ts
import Stripe from 'stripe';
import { ApiClient } from './baseClient';

export class StripeClient {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2023-10-16',
    });
  }

  async createPaymentIntent(
    amount: number,
    currency: string = 'usd'
  ): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.create({
      amount,
      currency,
    });
  }

  async createCharge(
    amount: number,
    paymentMethodId: string
  ): Promise<Stripe.Charge> {
    return this.stripe.charges.create({
      amount,
      currency: 'usd',
      payment_method: paymentMethodId,
    });
  }

  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    return this.stripe.customers.retrieve(customerId);
  }

  async handleWebhook(signature: string, body: Buffer): Promise<Stripe.Event> {
    return this.stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  }
}
```

### AI Service Integration

```typescript
// src/services/apiClients/aiServiceClient.ts
export interface AIRequest {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIResponse {
  id: string;
  content: string;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export class AIServiceClient extends ApiClient {
  constructor() {
    super({
      baseUrl: process.env.AI_SERVICE_URL || 'https://api.ai-service.com',
      apiKey: process.env.AI_SERVICE_KEY,
      timeout: 60000, // 60 seconds for AI calls
    });
  }

  async generateText(request: AIRequest): Promise<AIResponse> {
    return this.post<AIResponse>('/generate', {
      prompt: request.prompt,
      model: request.model || 'gpt-3.5-turbo',
      temperature: request.temperature ?? 0.7,
      maxTokens: request.maxTokens || 1000,
    });
  }

  async analyzeImage(imageUrl: string): Promise<{ analysis: string }> {
    return this.post<{ analysis: string }>('/analyze-image', {
      imageUrl,
    });
  }
}
```

## Rate Limiting

### Rate Limiter Implementation

```typescript
// src/services/rateLimiter.ts
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // Time window in milliseconds
}

export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(config: RateLimitConfig) {
    this.maxRequests = config.maxRequests;
    this.windowMs = config.windowMs;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get requests for this key
    let requests = this.requests.get(key) || [];

    // Remove old requests outside window
    requests = requests.filter(time => time > windowStart);

    // Check if at limit
    if (requests.length >= this.maxRequests) {
      return false;
    }

    // Record new request
    requests.push(now);
    this.requests.set(key, requests);

    // Cleanup old keys periodically
    if (Math.random() < 0.01) {
      this.cleanup();
    }

    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, requests] of this.requests.entries()) {
      const active = requests.filter(time => time > now - this.windowMs);
      if (active.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, active);
      }
    }
  }
}

// Per-API rate limiters
export const stripeRateLimiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60000, // 100 requests per minute
});

export const aiServiceRateLimiter = new RateLimiter({
  maxRequests: 50,
  windowMs: 60000, // 50 requests per minute
});
```

### Rate Limit Middleware

```typescript
// src/middleware/rateLimitMiddleware.ts
export function createRateLimitMiddleware(limiter: RateLimiter) {
  return (req: ICustomRequest, res: Response, next: NextFunction) => {
    const key = req.userId || req.ip; // Use user ID or IP

    if (!limiter.isAllowed(key)) {
      return res.status(429).json({
        error: 'Too many requests',
        code: 'RATE_LIMITED',
        retryAfter: 60,
      });
    }

    next();
  };
}

// Usage
router.post(
  '/generate-text',
  createRateLimitMiddleware(aiServiceRateLimiter),
  generateTextHandler
);
```

## Retry Strategies

### Intelligent Retry Logic

```typescript
// src/utils/retryUtils.ts
export interface RetryConfig {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: any) => boolean;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    backoffMultiplier = 2,
    shouldRetry = (error) => !error.response || error.response.status >= 500,
  } = config;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!shouldRetry(error) || attempt === maxRetries) {
        throw error;
      }

      const delay = Math.min(
        initialDelayMs * Math.pow(backoffMultiplier, attempt),
        maxDelayMs
      );

      const jitter = Math.random() * 0.1 * delay;
      const totalDelay = delay + jitter;

      console.log(
        `Retry attempt ${attempt + 1}/${maxRetries} after ${totalDelay}ms`
      );

      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
  }

  throw lastError;
}

// Usage
const result = await retryWithBackoff(
  () => aiServiceClient.generateText(request),
  {
    maxRetries: 3,
    initialDelayMs: 1000,
    shouldRetry: (error) => error.response?.status >= 500,
  }
);
```

## Circuit Breaker Pattern

```typescript
// src/patterns/circuitBreaker.ts
export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half-open',
}

export class CircuitBreaker<T> {
  private state: CircuitState = CircuitState.CLOSED;
  private failures = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;

  constructor(
    private fn: () => Promise<T>,
    private config = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000,
    }
  ) {}

  async execute(): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (
        this.lastFailureTime &&
        Date.now() - this.lastFailureTime > this.config.timeout
      ) {
        console.log('Circuit breaker entering HALF_OPEN state');
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await this.fn();

      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordSuccess(): void {
    this.failures = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        console.log('Circuit breaker entering CLOSED state');
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  private recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.config.failureThreshold) {
      console.error('Circuit breaker entering OPEN state');
      this.state = CircuitState.OPEN;
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

// Usage
const stripeBreaker = new CircuitBreaker(
  () => stripeClient.createCharge(amount, methodId),
  { failureThreshold: 5, timeout: 30000 }
);

try {
  const charge = await stripeBreaker.execute();
} catch (error) {
  if (error.message.includes('Circuit breaker is OPEN')) {
    // Use fallback payment method
  }
}
```

## API Response Caching

```typescript
// src/services/cachedApiClient.ts
export class CachedApiClient extends ApiClient {
  private cache: Map<string, { data: any; expiry: number }> = new Map();

  async getCached<T>(
    url: string,
    ttlMs: number = 5 * 60 * 1000
  ): Promise<T> {
    const cached = this.cache.get(url);

    if (cached && Date.now() < cached.expiry) {
      console.log('Cache hit:', url);
      return cached.data;
    }

    const data = await this.get<T>(url);

    this.cache.set(url, {
      data,
      expiry: Date.now() + ttlMs,
    });

    return data;
  }

  invalidateCache(pattern?: string): void {
    if (pattern) {
      const regex = new RegExp(pattern);
      Array.from(this.cache.keys())
        .filter(key => regex.test(key))
        .forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }
}
```

## External API Best Practices Checklist

- [ ] Use abstraction layer for external APIs
- [ ] Implement retry logic with exponential backoff
- [ ] Handle rate limiting gracefully
- [ ] Implement circuit breaker pattern
- [ ] Cache API responses appropriately
- [ ] Monitor API health and performance
- [ ] Set appropriate timeouts
- [ ] Log all API calls and errors
- [ ] Validate API responses
- [ ] Use API keys securely (env vars)
- [ ] Implement fallback strategies
- [ ] Test API integrations regularly
- [ ] Handle different API error codes
- [ ] Implement request deduplication
- [ ] Track API quota usage

## Related Documentation

- [CACHING_STRATEGIES.md](CACHING_STRATEGIES.md) - Caching patterns
- [MIDDLEWARE_GUIDE.md](MIDDLEWARE_GUIDE.md) - Middleware patterns
- [ERROR_HANDLING.md](ERROR_HANDLING.md) - Error handling
- [LOGGING_MONITORING.md](LOGGING_MONITORING.md) - Monitoring

