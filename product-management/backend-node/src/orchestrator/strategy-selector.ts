// Strategy Selection Logic

import { createModuleLogger } from '../utils/logger';
import {
  TenantVoiceConfig,
  RoutingDecision,
  StrategyType,
  ServiceHealth
} from './types';
import { HealthMonitor } from './health-monitor';

const logger = createModuleLogger('strategy-selector');

export class StrategySelector {
  constructor(private healthMonitor: HealthMonitor) {}

  selectStrategy(
    tenantConfig: TenantVoiceConfig,
    serviceHealth: Map<string, ServiceHealth>
  ): RoutingDecision {
    const primaryStrategy = this.selectPrimaryStrategy(tenantConfig, serviceHealth);

    // Add fallback if primary might fail
    if (tenantConfig.fallbackStrategy && !this.isStrategyHealthy(primaryStrategy.strategy, serviceHealth)) {
      primaryStrategy.fallback = this.createFallbackDecision(
        tenantConfig.fallbackStrategy,
        tenantConfig,
        serviceHealth
      );
    }

    logger.debug('Strategy selected', {
      tenantId: tenantConfig.tenantId,
      strategy: primaryStrategy.strategy,
      provider: primaryStrategy.provider,
      hasFallback: !!primaryStrategy.fallback
    });

    return primaryStrategy;
  }

  private selectPrimaryStrategy(
    tenantConfig: TenantVoiceConfig,
    serviceHealth: Map<string, ServiceHealth>
  ): RoutingDecision {
    const requestedStrategy = tenantConfig.strategy;

    switch (requestedStrategy) {
      case 'unified':
        return this.selectUnifiedStrategy(tenantConfig, serviceHealth);

      case 'component':
        return this.selectComponentStrategy(tenantConfig, serviceHealth);

      case 'hybrid':
        return this.selectHybridStrategy(tenantConfig, serviceHealth);

      default:
        throw new Error(`Unknown strategy: ${requestedStrategy}`);
    }
  }

  private selectUnifiedStrategy(
    tenantConfig: TenantVoiceConfig,
    serviceHealth: Map<string, ServiceHealth>
  ): RoutingDecision {
    if (!tenantConfig.unifiedConfig) {
      throw new Error('Unified config required for unified strategy');
    }

    const { provider, model } = tenantConfig.unifiedConfig;
    const serviceName = `unified-${provider}`;
    const healthy = this.healthMonitor.isHealthy(serviceName);

    return {
      strategy: 'unified',
      provider: `${provider}-${model}`,
      config: tenantConfig.unifiedConfig,
      healthCheck: healthy
    };
  }

  private selectComponentStrategy(
    tenantConfig: TenantVoiceConfig,
    serviceHealth: Map<string, ServiceHealth>
  ): RoutingDecision {
    if (!tenantConfig.componentConfig) {
      throw new Error('Component config required for component strategy');
    }

    // Check health of all components
    const sttHealthy = this.healthMonitor.isHealthy(`stt-${tenantConfig.componentConfig.stt.provider}`);
    const llmHealthy = this.healthMonitor.isHealthy(`llm-${tenantConfig.componentConfig.llm.provider}`);
    const ttsHealthy = this.healthMonitor.isHealthy(`tts-${tenantConfig.componentConfig.tts.provider}`);

    const allHealthy = sttHealthy && llmHealthy && ttsHealthy;

    return {
      strategy: 'component',
      provider: 'component-pipeline',
      config: tenantConfig.componentConfig,
      healthCheck: allHealthy
    };
  }

  private selectHybridStrategy(
    tenantConfig: TenantVoiceConfig,
    serviceHealth: Map<string, ServiceHealth>
  ): RoutingDecision {
    // Hybrid: Try unified first, fallback to component

    // Check if unified is available
    if (tenantConfig.unifiedConfig) {
      const unifiedHealthy = this.healthMonitor.isHealthy(
        `unified-${tenantConfig.unifiedConfig.provider}`
      );

      if (unifiedHealthy) {
        return {
          strategy: 'unified',
          provider: `${tenantConfig.unifiedConfig.provider}-${tenantConfig.unifiedConfig.model}`,
          config: tenantConfig.unifiedConfig,
          healthCheck: true,
          fallback: this.selectComponentStrategy(tenantConfig, serviceHealth)
        };
      }
    }

    // Fallback to component
    return this.selectComponentStrategy(tenantConfig, serviceHealth);
  }

  private createFallbackDecision(
    fallbackType: StrategyType,
    tenantConfig: TenantVoiceConfig,
    serviceHealth: Map<string, ServiceHealth>
  ): RoutingDecision {
    const fallbackConfig: TenantVoiceConfig = {
      ...tenantConfig,
      strategy: fallbackType,
      fallbackStrategy: undefined // Prevent infinite fallback chain
    };

    return this.selectPrimaryStrategy(fallbackConfig, serviceHealth);
  }

  private isStrategyHealthy(
    strategy: StrategyType,
    serviceHealth: Map<string, ServiceHealth>
  ): boolean {
    // Check if services required for strategy are healthy
    const healthyServices = Array.from(serviceHealth.values())
      .filter(h => h.healthy)
      .map(h => h.name);

    switch (strategy) {
      case 'unified':
        return healthyServices.some(s => s.startsWith('unified-'));

      case 'component':
        return (
          healthyServices.some(s => s.startsWith('stt-')) &&
          healthyServices.some(s => s.startsWith('llm-')) &&
          healthyServices.some(s => s.startsWith('tts-'))
        );

      case 'hybrid':
        return this.isStrategyHealthy('unified', serviceHealth) ||
               this.isStrategyHealthy('component', serviceHealth);

      default:
        return false;
    }
  }

  // Cost-based selection (for future use)
  selectByCost(
    tenantConfig: TenantVoiceConfig,
    maxCostPerMinute: number
  ): StrategyType {
    const costMap = {
      'unified': 0.24, // GPT-4o Realtime
      'component': 0.05, // Whisper + Claude + Azure
      'hybrid': 0.15 // Average
    };

    if (costMap[tenantConfig.strategy] <= maxCostPerMinute) {
      return tenantConfig.strategy;
    }

    // Downgrade to cheaper strategy
    if (maxCostPerMinute >= costMap['hybrid']) {
      return 'hybrid';
    } else {
      return 'component';
    }
  }

  // Geographic routing (for future use)
  selectByRegion(region: string, preferredProviders: string[]): string {
    // Route to closest provider based on region
    const regionMap: Record<string, string[]> = {
      'us-east': ['openai', 'azure'],
      'us-west': ['openai', 'google'],
      'eu': ['azure', 'google'],
      'asia': ['google', 'azure']
    };

    const available = regionMap[region] || [];
    return preferredProviders.find(p => available.includes(p)) || preferredProviders[0];
  }
}
