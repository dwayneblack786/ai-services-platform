// Hybrid Strategy - Try unified first, fallback to component

import { BaseVoiceStrategy } from './base-strategy';
import { UnifiedStrategy, UnifiedConfig } from './unified-strategy';
import { ComponentStrategy, ComponentConfig } from './component-strategy';
import { VoiceRequest, VoiceResponse } from '../orchestrator/types';
import { createModuleLogger } from '../utils/logger';

const logger = createModuleLogger('hybrid-strategy');

export interface HybridConfig {
  unified: UnifiedConfig;
  component: ComponentConfig;
  preferUnified: boolean;
  maxUnifiedLatency?: number;
}

export class HybridStrategy extends BaseVoiceStrategy {
  private unifiedStrategy: UnifiedStrategy;
  private componentStrategy: ComponentStrategy;
  private config: HybridConfig;

  constructor(config: HybridConfig) {
    super('hybrid');
    this.config = config;
    this.unifiedStrategy = new UnifiedStrategy(config.unified);
    this.componentStrategy = new ComponentStrategy(config.component);
  }

  async process(request: VoiceRequest): Promise<VoiceResponse> {
    const startTime = Date.now();

    logger.info('Processing with hybrid strategy', {
      sessionId: request.sessionId.substring(0, 8),
      preferUnified: this.config.preferUnified
    });

    try {
      // Strategy 1: Try unified first (if preferred and available)
      if (this.config.preferUnified) {
        const unifiedAvailable = await this.unifiedStrategy.isAvailable();

        if (unifiedAvailable) {
          try {
            logger.debug('Attempting unified strategy', {
              sessionId: request.sessionId.substring(0, 8)
            });

            const response = await this.processWithTimeout(
              () => this.unifiedStrategy.process(request),
              this.config.maxUnifiedLatency || 3000
            );

            logger.info('Unified strategy succeeded', {
              sessionId: request.sessionId.substring(0, 8),
              latency: Date.now() - startTime
            });

            return response;
          } catch (error) {
            logger.warn('Unified strategy failed, falling back to component', {
              sessionId: request.sessionId.substring(0, 8),
              error
            });
          }
        }
      }

      // Strategy 2: Fallback to component
      logger.debug('Using component strategy', {
        sessionId: request.sessionId.substring(0, 8)
      });

      const response = await this.componentStrategy.process(request);

      logger.info('Component strategy succeeded', {
        sessionId: request.sessionId.substring(0, 8),
        latency: Date.now() - startTime
      });

      return response;
    } catch (error) {
      logger.error('Hybrid strategy failed completely', {
        sessionId: request.sessionId.substring(0, 8),
        error
      });
      throw error;
    }
  }

  private async processWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error('Strategy timeout')), timeoutMs);
      })
    ]);
  }

  getName(): string {
    return 'hybrid';
  }

  async isAvailable(): Promise<boolean> {
    // Available if either strategy is available
    const unifiedAvailable = await this.unifiedStrategy.isAvailable();
    const componentAvailable = await this.componentStrategy.isAvailable();
    return unifiedAvailable || componentAvailable;
  }

  // Get health of both strategies
  async getStrategiesHealth(): Promise<{
    unified: boolean;
    component: boolean;
  }> {
    return {
      unified: await this.unifiedStrategy.isAvailable(),
      component: await this.componentStrategy.isAvailable()
    };
  }
}
