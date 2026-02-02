/**
 * Centralized API Client with Circuit Breaker and Retry Logic
 * 
 * Wraps axios calls with:
 * - Circuit breaker for fault tolerance
 * - Exponential backoff retry
 * - Request/response logging
 * - Error standardization
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { CircuitBreaker, registerCircuitBreaker } from './circuitBreaker';

export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  retryAttempts?: number;
  circuitBreakerConfig?: {
    failureThreshold?: number;
    successThreshold?: number;
    timeout?: number;
  };
  name?: string;
}

export interface RetryConfig {
  retries: number;
  retryDelay: number;
  retryCondition?: (error: AxiosError) => boolean;
}

export class ApiClient {
  private axiosInstance: AxiosInstance;
  private circuitBreaker: CircuitBreaker;
  private retryConfig: RetryConfig;
  private name: string;

  constructor(config: ApiClientConfig) {
    this.name = config.name || 'ApiClient';
    
    // Create axios instance
    this.axiosInstance = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Setup interceptors
    this.setupInterceptors();

    // Configure retry logic
    this.retryConfig = {
      retries: config.retryAttempts || 3,
      retryDelay: 1000, // Start with 1 second
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

    // Create circuit breaker
    this.circuitBreaker = new CircuitBreaker({
      name: this.name,
      failureThreshold: config.circuitBreakerConfig?.failureThreshold || 5,
      successThreshold: config.circuitBreakerConfig?.successThreshold || 2,
      timeout: config.circuitBreakerConfig?.timeout || 60000, // 1 minute
    });

    // Register circuit breaker for health checks
    registerCircuitBreaker(this.name, this.circuitBreaker);
  }

  /**
   * Setup request/response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        console.log(`[${this.name}] Request:`, {
          method: config.method?.toUpperCase(),
          url: config.url,
          baseURL: config.baseURL,
        });
        return config;
      },
      (error) => {
        console.error(`[${this.name}] Request error:`, error.message);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        console.log(`[${this.name}] Response:`, {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error: AxiosError) => {
        if (error.response) {
          console.error(`[${this.name}] Response error:`, {
            status: error.response.status,
            url: error.config?.url,
            message: error.message,
          });
        } else if (error.request) {
          console.error(`[${this.name}] No response received:`, {
            url: error.config?.url,
            message: error.message,
          });
        } else {
          console.error(`[${this.name}] Request setup error:`, error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Retry logic with exponential backoff
   */
  private async retryRequest<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    attempt: number = 0
  ): Promise<AxiosResponse<T>> {
    try {
      return await requestFn();
    } catch (error) {
      const axiosError = error as AxiosError;
      
      if (
        attempt < this.retryConfig.retries &&
        this.retryConfig.retryCondition?.(axiosError)
      ) {
        const delay = this.retryConfig.retryDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
        const totalDelay = delay + jitter;
        
        console.log(
          `[${this.name}] Retrying request (attempt ${attempt + 1}/${
            this.retryConfig.retries
          }) after ${Math.round(totalDelay)}ms`
        );
        
        await new Promise((resolve) => setTimeout(resolve, totalDelay));
        return this.retryRequest(requestFn, attempt + 1);
      }
      
      throw error;
    }
  }

  /**
   * Execute request with circuit breaker and retry logic
   */
  private async executeRequest<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    fallback?: () => T | Promise<T>
  ): Promise<AxiosResponse<T>> {
    return await this.circuitBreaker.execute(
      async () => {
        return await this.retryRequest(requestFn);
      },
      fallback
        ? async () => {
            const fallbackData = await Promise.resolve(fallback());
            return {
              data: fallbackData,
              status: 200,
              statusText: 'OK (Fallback)',
              headers: {},
              config: {} as AxiosRequestConfig,
            } as AxiosResponse<T>;
          }
        : undefined
    );
  }

  /**
   * GET request
   */
  async get<T>(
    url: string,
    config?: AxiosRequestConfig,
    fallback?: () => T | Promise<T>
  ): Promise<AxiosResponse<T>> {
    return this.executeRequest(
      () => this.axiosInstance.get<T>(url, config),
      fallback
    );
  }

  /**
   * POST request
   */
  async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
    fallback?: () => T | Promise<T>
  ): Promise<AxiosResponse<T>> {
    return this.executeRequest(
      () => this.axiosInstance.post<T>(url, data, config),
      fallback
    );
  }

  /**
   * PUT request
   */
  async put<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
    fallback?: () => T | Promise<T>
  ): Promise<AxiosResponse<T>> {
    return this.executeRequest(
      () => this.axiosInstance.put<T>(url, data, config),
      fallback
    );
  }

  /**
   * PATCH request
   */
  async patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
    fallback?: () => T | Promise<T>
  ): Promise<AxiosResponse<T>> {
    return this.executeRequest(
      () => this.axiosInstance.patch<T>(url, data, config),
      fallback
    );
  }

  /**
   * DELETE request
   */
  async delete<T>(
    url: string,
    config?: AxiosRequestConfig,
    fallback?: () => T | Promise<T>
  ): Promise<AxiosResponse<T>> {
    return this.executeRequest(
      () => this.axiosInstance.delete<T>(url, config),
      fallback
    );
  }

  /**
   * Get circuit breaker state
   */
  getCircuitState() {
    return this.circuitBreaker.getState();
  }

  /**
   * Get circuit breaker statistics
   */
  getStats() {
    return this.circuitBreaker.getStats();
  }

  /**
   * Reset circuit breaker
   */
  resetCircuit() {
    this.circuitBreaker.reset();
  }

  /**
   * Get the underlying axios instance (for advanced usage)
   */
  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }
}

// Create Java VA API client instance
export const javaVAClient = new ApiClient({
  baseURL: process.env.JAVA_VA_URL || 'http://localhost:8136',
  timeout: 30000, // 30 seconds for LLM processing
  retryAttempts: 2,
  circuitBreakerConfig: {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000, // 1 minute
  },
  name: 'JavaVA',
});

// Export default client for backward compatibility
export default javaVAClient;
