// Health Monitoring Service

import { EventEmitter } from 'events';
import { createModuleLogger } from '../utils/logger';
import { ServiceHealth } from './types';

const logger = createModuleLogger('health-monitor');

export interface HealthCheckConfig {
  name: string;
  endpoint?: string;
  checkInterval: number;
  timeout: number;
  healthyThreshold: number;
  unhealthyThreshold: number;
  checkFn?: () => Promise<boolean>;
}

export class HealthMonitor extends EventEmitter {
  private services: Map<string, ServiceHealth> = new Map();
  private configs: Map<string, HealthCheckConfig> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private consecutiveFailures: Map<string, number> = new Map();
  private consecutiveSuccesses: Map<string, number> = new Map();

  registerService(config: HealthCheckConfig): void {
    this.configs.set(config.name, config);
    this.services.set(config.name, {
      name: config.name,
      healthy: true,
      lastCheck: new Date()
    });
    this.consecutiveFailures.set(config.name, 0);
    this.consecutiveSuccesses.set(config.name, 0);

    logger.info('Service registered for health monitoring', {
      service: config.name,
      interval: config.checkInterval
    });

    this.startMonitoring(config.name);
  }

  unregisterService(name: string): void {
    const interval = this.intervals.get(name);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(name);
    }

    this.services.delete(name);
    this.configs.delete(name);
    this.consecutiveFailures.delete(name);
    this.consecutiveSuccesses.delete(name);

    logger.info('Service unregistered from health monitoring', { service: name });
  }

  private startMonitoring(name: string): void {
    const config = this.configs.get(name);
    if (!config) return;

    // Initial check
    this.performHealthCheck(name);

    // Schedule periodic checks
    const interval = setInterval(() => {
      this.performHealthCheck(name);
    }, config.checkInterval);

    this.intervals.set(name, interval);
  }

  private async performHealthCheck(name: string): Promise<void> {
    const config = this.configs.get(name);
    if (!config) return;

    const startTime = Date.now();
    let healthy = false;

    try {
      if (config.checkFn) {
        healthy = await Promise.race([
          config.checkFn(),
          this.timeout(config.timeout)
        ]);
      } else {
        // Default HTTP health check
        healthy = await this.httpHealthCheck(config.endpoint!, config.timeout);
      }

      const latency = Date.now() - startTime;

      this.updateServiceHealth(name, healthy, latency);
    } catch (error) {
      logger.error('Health check failed', { service: name, error });
      this.updateServiceHealth(name, false);
    }
  }

  private async httpHealthCheck(endpoint: string, timeout: number): Promise<boolean> {
    // Simple HTTP check (would use fetch/axios in real implementation)
    return Promise.race([
      Promise.resolve(true), // Mock success for now
      this.timeout(timeout)
    ]);
  }

  private timeout(ms: number): Promise<boolean> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Health check timeout')), ms);
    });
  }

  private updateServiceHealth(name: string, healthy: boolean, latency?: number): void {
    const config = this.configs.get(name);
    const currentHealth = this.services.get(name);
    if (!config || !currentHealth) return;

    const wasHealthy = currentHealth.healthy;

    if (healthy) {
      const successes = (this.consecutiveSuccesses.get(name) || 0) + 1;
      this.consecutiveSuccesses.set(name, successes);
      this.consecutiveFailures.set(name, 0);

      if (!wasHealthy && successes >= config.healthyThreshold) {
        currentHealth.healthy = true;
        this.emit('service:healthy', { name, latency });
        logger.info('Service became healthy', { service: name, successes, latency });
      }
    } else {
      const failures = (this.consecutiveFailures.get(name) || 0) + 1;
      this.consecutiveFailures.set(name, failures);
      this.consecutiveSuccesses.set(name, 0);

      if (wasHealthy && failures >= config.unhealthyThreshold) {
        currentHealth.healthy = false;
        this.emit('service:unhealthy', { name, failures });
        logger.warn('Service became unhealthy', { service: name, failures });
      }
    }

    currentHealth.latency = latency;
    currentHealth.lastCheck = new Date();
    this.services.set(name, currentHealth);

    // Update error rate (rolling window)
    const failures = this.consecutiveFailures.get(name) || 0;
    const total = failures + (this.consecutiveSuccesses.get(name) || 0);
    currentHealth.errorRate = total > 0 ? failures / total : 0;
  }

  getServiceHealth(name: string): ServiceHealth | undefined {
    return this.services.get(name);
  }

  getAllServiceHealth(): Map<string, ServiceHealth> {
    return new Map(this.services);
  }

  isHealthy(name: string): boolean {
    const health = this.services.get(name);
    return health?.healthy ?? false;
  }

  getHealthyServices(): string[] {
    return Array.from(this.services.entries())
      .filter(([_, health]) => health.healthy)
      .map(([name]) => name);
  }

  shutdown(): void {
    for (const [name] of this.intervals) {
      this.unregisterService(name);
    }
    logger.info('Health monitor shutdown');
  }
}
