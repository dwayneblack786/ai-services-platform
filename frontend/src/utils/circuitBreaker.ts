/**
 * Circuit Breaker Pattern Implementation for Frontend
 * 
 * Prevents cascading failures by detecting failing services and providing
 * fast-fail responses with user-friendly error messages.
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  name: string;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  totalRequests: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount: number = 0;
  private successCount: number = 0;
  private nextAttemptTime: number = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private totalRequests: number = 0;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
    console.log(`[CircuitBreaker:${this.config.name}] Initialized`);
  }

  async execute<T>(
    request: () => Promise<T>,
    fallback?: () => T | Promise<T>
  ): Promise<T> {
    this.totalRequests++;

    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttemptTime) {
        console.warn(
          `[CircuitBreaker:${this.config.name}] Circuit is OPEN, using fallback`
        );
        
        if (fallback) {
          return await Promise.resolve(fallback());
        }
        
        throw new Error(
          `Service temporarily unavailable. Please try again in a moment.`
        );
      }
      
      this.state = 'HALF_OPEN';
      this.successCount = 0;
    }

    try {
      const result = await request();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      
      if (fallback) {
        return await Promise.resolve(fallback());
      }
      
      throw error;
    }
  }

  private onSuccess(): void {
    this.lastSuccessTime = Date.now();
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;

      if (this.successCount >= this.config.successThreshold) {
        this.close();
      }
    }
  }

  private onFailure(): void {
    this.lastFailureTime = Date.now();
    this.failureCount++;
    this.successCount = 0;

    if (
      this.failureCount >= this.config.failureThreshold ||
      this.state === 'HALF_OPEN'
    ) {
      this.open();
    }
  }

  private open(): void {
    this.state = 'OPEN';
    this.nextAttemptTime = Date.now() + this.config.timeout;
    
    console.error(
      `[CircuitBreaker:${this.config.name}] Circuit OPENED until ${new Date(
        this.nextAttemptTime
      ).toLocaleTimeString()}`
    );
  }

  private close(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    
    console.log(`[CircuitBreaker:${this.config.name}] Circuit CLOSED`);
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalRequests: this.totalRequests,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
    };
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.totalRequests = 0;
    this.nextAttemptTime = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    console.log(`[CircuitBreaker:${this.config.name}] Circuit manually reset`);
  }
}
