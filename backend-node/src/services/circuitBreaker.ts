/**
 * Circuit Breaker Pattern Implementation
 * 
 * Prevents cascading failures by detecting failing services and providing
 * fast-fail responses instead of waiting for timeouts.
 * 
 * States:
 * - CLOSED: Normal operation, requests flow through
 * - OPEN: Service is failing, requests fail immediately
 * - HALF_OPEN: Testing if service has recovered
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening circuit
  successThreshold: number;       // Number of successes to close circuit from half-open
  timeout: number;                // Time in ms before attempting to close circuit
  name: string;                   // Circuit breaker name for logging
  monitoringWindow?: number;      // Time window for counting failures (default: 60000ms)
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  totalRequests: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  nextAttemptTime: number | null;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount: number = 0;
  private successCount: number = 0;
  private nextAttemptTime: number = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private totalRequests: number = 0;
  private config: Required<CircuitBreakerConfig>;

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      ...config,
      monitoringWindow: config.monitoringWindow || 60000, // 1 minute default
    };
    
    console.log(`[CircuitBreaker:${this.config.name}] Initialized with:`, {
      failureThreshold: this.config.failureThreshold,
      successThreshold: this.config.successThreshold,
      timeout: this.config.timeout,
    });
  }

  /**
   * Execute a request through the circuit breaker
   */
  async execute<T>(
    request: () => Promise<T>,
    fallback?: () => T | Promise<T>
  ): Promise<T> {
    this.totalRequests++;

    // Check if circuit is open
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttemptTime) {
        console.log(
          `[CircuitBreaker:${this.config.name}] Circuit is OPEN, failing fast`
        );
        
        if (fallback) {
          return await Promise.resolve(fallback());
        }
        
        throw new Error(
          `Circuit breaker is OPEN for ${this.config.name}. Service is temporarily unavailable.`
        );
      }
      
      // Time to try again
      this.state = 'HALF_OPEN';
      this.successCount = 0;
      console.log(
        `[CircuitBreaker:${this.config.name}] Moving to HALF_OPEN state`
      );
    }

    try {
      const result = await request();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      
      if (fallback) {
        console.log(
          `[CircuitBreaker:${this.config.name}] Request failed, using fallback`
        );
        return await Promise.resolve(fallback());
      }
      
      throw error;
    }
  }

  /**
   * Handle successful request
   */
  private onSuccess(): void {
    this.lastSuccessTime = Date.now();
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      console.log(
        `[CircuitBreaker:${this.config.name}] Success in HALF_OPEN (${this.successCount}/${this.config.successThreshold})`
      );

      if (this.successCount >= this.config.successThreshold) {
        this.close();
      }
    }
  }

  /**
   * Handle failed request
   */
  private onFailure(): void {
    this.lastFailureTime = Date.now();
    this.failureCount++;
    this.successCount = 0;

    console.log(
      `[CircuitBreaker:${this.config.name}] Failure detected (${this.failureCount}/${this.config.failureThreshold})`
    );

    if (
      this.failureCount >= this.config.failureThreshold ||
      this.state === 'HALF_OPEN'
    ) {
      this.open();
    }
  }

  /**
   * Open the circuit
   */
  private open(): void {
    this.state = 'OPEN';
    this.nextAttemptTime = Date.now() + this.config.timeout;
    
    console.error(
      `[CircuitBreaker:${this.config.name}] Circuit OPENED. Will retry at ${new Date(
        this.nextAttemptTime
      ).toISOString()}`
    );
  }

  /**
   * Close the circuit
   */
  private close(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    
    console.log(`[CircuitBreaker:${this.config.name}] Circuit CLOSED`);
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalRequests: this.totalRequests,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttemptTime: this.state === 'OPEN' ? this.nextAttemptTime : null,
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttemptTime = 0;
    
    console.log(`[CircuitBreaker:${this.config.name}] Circuit manually reset`);
  }

  /**
   * Force open the circuit (for maintenance)
   */
  forceOpen(): void {
    this.state = 'OPEN';
    this.nextAttemptTime = Date.now() + this.config.timeout;
    
    console.log(`[CircuitBreaker:${this.config.name}] Circuit manually opened`);
  }
}
