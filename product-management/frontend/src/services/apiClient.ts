/**
 * Centralized API Client with Circuit Breaker and Retry Logic (Frontend)
 * 
 * Wraps axios calls with:
 * - Circuit breaker for fault tolerance
 * - Exponential backoff retry
 * - Request/response interceptors
 * - Error standardization
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { CircuitBreaker } from '../utils/circuitBreaker';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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

export class ApiClient {
  private axiosInstance: AxiosInstance;
  private circuitBreaker: CircuitBreaker;
  private retryAttempts: number;
  private name: string;

  constructor(config: ApiClientConfig) {
    this.name = config.name || 'ApiClient';
    this.retryAttempts = config.retryAttempts || 2;
    
    // Create axios instance with credentials
    this.axiosInstance = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 10000,
      withCredentials: true, // Important for cookies
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();

    // Create circuit breaker
    this.circuitBreaker = new CircuitBreaker({
      name: this.name,
      failureThreshold: config.circuitBreakerConfig?.failureThreshold || 5,
      successThreshold: config.circuitBreakerConfig?.successThreshold || 2,
      timeout: config.circuitBreakerConfig?.timeout || 60000,
    });
  }

  private setupInterceptors(): void {
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Add any auth tokens if needed
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Only redirect to login if not already there
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private async retryRequest<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    attempt: number = 0
  ): Promise<AxiosResponse<T>> {
    try {
      return await requestFn();
    } catch (error) {
      const axiosError = error as AxiosError;
      
      // Retry on network errors or 5xx
      const shouldRetry =
        attempt < this.retryAttempts &&
        (!axiosError.response || axiosError.response.status >= 500);
      
      if (shouldRetry) {
        const delay = 1000 * Math.pow(2, attempt) + Math.random() * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.retryRequest(requestFn, attempt + 1);
      }
      
      throw error;
    }
  }

  private async executeRequest<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    fallback?: () => T | Promise<T>
  ): Promise<AxiosResponse<T>> {
    return await this.circuitBreaker.execute(
      async () => await this.retryRequest(requestFn),
      fallback
        ? async () => {
            const fallbackData = await Promise.resolve(fallback());
            return {
              data: fallbackData,
              status: 200,
              statusText: 'OK (Fallback)',
              headers: {},
              config: {} as any,
            } as AxiosResponse<T>;
          }
        : undefined
    );
  }

  async get<T = any>(
    url: string,
    config?: AxiosRequestConfig,
    fallback?: () => T | Promise<T>
  ): Promise<AxiosResponse<T>> {
    return this.executeRequest(
      () => this.axiosInstance.get<T>(url, config),
      fallback
    );
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    fallback?: () => T | Promise<T>
  ): Promise<AxiosResponse<T>> {
    return this.executeRequest(
      () => this.axiosInstance.post<T>(url, data, config),
      fallback
    );
  }

  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    fallback?: () => T | Promise<T>
  ): Promise<AxiosResponse<T>> {
    return this.executeRequest(
      () => this.axiosInstance.put<T>(url, data, config),
      fallback
    );
  }

  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    fallback?: () => T | Promise<T>
  ): Promise<AxiosResponse<T>> {
    return this.executeRequest(
      () => this.axiosInstance.patch<T>(url, data, config),
      fallback
    );
  }

  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig,
    fallback?: () => T | Promise<T>
  ): Promise<AxiosResponse<T>> {
    return this.executeRequest(
      () => this.axiosInstance.delete<T>(url, config),
      fallback
    );
  }

  getCircuitState() {
    return this.circuitBreaker.getState();
  }

  getStats() {
    return this.circuitBreaker.getStats();
  }

  resetCircuit() {
    this.circuitBreaker.reset();
  }
}

// Create default API client instance
export const apiClient = new ApiClient({
  baseURL: API_BASE_URL,
  timeout: 10000,
  retryAttempts: 2,
  circuitBreakerConfig: {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000, // 30 seconds
  },
  name: 'BackendAPI',
});

export default apiClient;
