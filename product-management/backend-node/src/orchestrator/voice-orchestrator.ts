// Voice Orchestrator - Main orchestration layer

import { createModuleLogger } from '../utils/logger';
import { HealthMonitor } from './health-monitor';
import { StrategySelector } from './strategy-selector';
import { UnifiedStrategy } from '../strategies/unified-strategy';
import { ComponentStrategy } from '../strategies/component-strategy';
import { HybridStrategy } from '../strategies/hybrid-strategy';
import { BaseVoiceStrategy } from '../strategies/base-strategy';
import {
  VoiceRequest,
  VoiceResponse,
  TenantVoiceConfig,
  StrategyMetrics
} from './types';

const logger = createModuleLogger('voice-orchestrator');

export class VoiceOrchestrator {
  private healthMonitor: HealthMonitor;
  private strategySelector: StrategySelector;
  private strategies: Map<string, BaseVoiceStrategy> = new Map();
  private metrics: Map<string, StrategyMetrics> = new Map();
  private tenantConfigs: Map<string, TenantVoiceConfig> = new Map();

  constructor() {
    this.healthMonitor = new HealthMonitor();
    this.strategySelector = new StrategySelector(this.healthMonitor);
    this.initializeHealthMonitoring();
  }

  private initializeHealthMonitoring(): void {
    // Register services for health monitoring
    this.healthMonitor.registerService({
      name: 'unified-openai',
      checkInterval: 30000,
      timeout: 5000,
      healthyThreshold: 2,
      unhealthyThreshold: 3,
      checkFn: async () => true // Mock for now
    });

    this.healthMonitor.registerService({
      name: 'unified-google',
      checkInterval: 30000,
      timeout: 5000,
      healthyThreshold: 2,
      unhealthyThreshold: 3,
      checkFn: async () => true
    });

    this.healthMonitor.registerService({
      name: 'stt-whisper',
      checkInterval: 30000,
      timeout: 5000,
      healthyThreshold: 2,
      unhealthyThreshold: 3,
      checkFn: async () => true
    });

    this.healthMonitor.registerService({
      name: 'llm-anthropic',
      checkInterval: 30000,
      timeout: 5000,
      healthyThreshold: 2,
      unhealthyThreshold: 3,
      checkFn: async () => true
    });

    this.healthMonitor.registerService({
      name: 'tts-azure',
      checkInterval: 30000,
      timeout: 5000,
      healthyThreshold: 2,
      unhealthyThreshold: 3,
      checkFn: async () => true
    });

    logger.info('Health monitoring initialized');
  }

  registerTenant(tenantId: string, config: TenantVoiceConfig): void {
    this.tenantConfigs.set(tenantId, config);
    logger.info('Tenant registered', { tenantId, strategy: config.strategy });
  }

  async processVoiceRequest(request: VoiceRequest): Promise<VoiceResponse> {
    const startTime = Date.now();

    logger.info('Processing voice request', {
      sessionId: request.sessionId.substring(0, 8),
      tenantId: request.tenantId,
      audioSize: request.audioData.length
    });

    try {
      // Get tenant config
      const tenantConfig = this.tenantConfigs.get(request.tenantId);
      if (!tenantConfig) {
        throw new Error(`Tenant config not found: ${request.tenantId}`);
      }

      // Select strategy
      const serviceHealth = this.healthMonitor.getAllServiceHealth();
      const decision = this.strategySelector.selectStrategy(tenantConfig, serviceHealth);

      logger.debug('Strategy selected', {
        sessionId: request.sessionId.substring(0, 8),
        strategy: decision.strategy,
        provider: decision.provider,
        healthCheck: decision.healthCheck
      });

      // Get or create strategy instance
      const strategy = this.getStrategy(decision.strategy, tenantConfig);

      // Process request
      let response: VoiceResponse;
      try {
        response = await strategy.process(request);
      } catch (error) {
        // Try fallback if available
        if (decision.fallback) {
          logger.warn('Primary strategy failed, trying fallback', {
            sessionId: request.sessionId.substring(0, 8),
            fallback: decision.fallback.strategy
          });

          const fallbackStrategy = this.getStrategy(decision.fallback.strategy, tenantConfig);
          response = await fallbackStrategy.process(request);
        } else {
          throw error;
        }
      }

      // Update metrics
      this.updateMetrics(decision.strategy, Date.now() - startTime, true);

      logger.info('Voice request processed successfully', {
        sessionId: request.sessionId.substring(0, 8),
        strategy: response.metadata?.strategy,
        latency: Date.now() - startTime
      });

      return response;
    } catch (error) {
      logger.error('Voice request processing failed', {
        sessionId: request.sessionId.substring(0, 8),
        error
      });

      // Update error metrics
      const tenantConfig = this.tenantConfigs.get(request.tenantId);
      if (tenantConfig) {
        this.updateMetrics(tenantConfig.strategy, Date.now() - startTime, false);
      }

      throw error;
    }
  }

  private getStrategy(
    strategyType: string,
    tenantConfig: TenantVoiceConfig
  ): BaseVoiceStrategy {
    const cacheKey = `${tenantConfig.tenantId}-${strategyType}`;

    if (this.strategies.has(cacheKey)) {
      return this.strategies.get(cacheKey)!;
    }

    let strategy: BaseVoiceStrategy;

    switch (strategyType) {
      case 'unified':
        if (!tenantConfig.unifiedConfig) {
          throw new Error('Unified config required');
        }
        strategy = new UnifiedStrategy(tenantConfig.unifiedConfig);
        break;

      case 'component':
        if (!tenantConfig.componentConfig) {
          throw new Error('Component config required');
        }
        strategy = new ComponentStrategy(tenantConfig.componentConfig);
        break;

      case 'hybrid':
        if (!tenantConfig.unifiedConfig || !tenantConfig.componentConfig) {
          throw new Error('Both unified and component configs required for hybrid');
        }
        strategy = new HybridStrategy({
          unified: tenantConfig.unifiedConfig,
          component: tenantConfig.componentConfig,
          preferUnified: true,
          maxUnifiedLatency: tenantConfig.maxLatencyMs
        });
        break;

      default:
        throw new Error(`Unknown strategy: ${strategyType}`);
    }

    this.strategies.set(cacheKey, strategy);
    return strategy;
  }

  private updateMetrics(strategy: string, latency: number, success: boolean): void {
    const current = this.metrics.get(strategy) || {
      totalRequests: 0,
      successCount: 0,
      errorCount: 0,
      avgLatency: 0,
      totalCost: 0
    };

    current.totalRequests++;
    if (success) {
      current.successCount++;
    } else {
      current.errorCount++;
    }

    // Update rolling average latency
    current.avgLatency = (current.avgLatency * (current.totalRequests - 1) + latency) / current.totalRequests;

    this.metrics.set(strategy, current);
  }

  getMetrics(strategy?: string): Map<string, StrategyMetrics> | StrategyMetrics | undefined {
    if (strategy) {
      return this.metrics.get(strategy);
    }
    return this.metrics;
  }

  getHealthMonitor(): HealthMonitor {
    return this.healthMonitor;
  }

  shutdown(): void {
    this.healthMonitor.shutdown();
    this.strategies.clear();
    this.metrics.clear();
    logger.info('Voice orchestrator shutdown');
  }
}
