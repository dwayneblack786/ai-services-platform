// Tenant Voice Configuration Service

import { createModuleLogger } from '../utils/logger';
import { TenantVoiceConfig } from '../orchestrator/types';

const logger = createModuleLogger('tenant-voice-config');

export class TenantVoiceConfigService {
  private configs: Map<string, TenantVoiceConfig> = new Map();

  constructor() {
    this.loadDefaultConfigs();
  }

  private loadDefaultConfigs(): void {
    // Default config for basic tier
    this.configs.set('default-basic', {
      tenantId: 'default-basic',
      strategy: 'component',
      componentConfig: {
        stt: {
          provider: 'whisper',
          endpoint: process.env.GRPC_SERVER_URL || 'localhost:50051'
        },
        llm: {
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
          endpoint: process.env.LLM_ENDPOINT || 'http://localhost:3000'
        },
        tts: {
          provider: 'azure',
          endpoint: process.env.TTS_ENDPOINT || 'http://localhost:5000',
          voice: 'en-US-JennyNeural'
        }
      },
      costTier: 'basic',
      maxLatencyMs: 5000
    });

    // Default config for enterprise tier
    this.configs.set('default-enterprise', {
      tenantId: 'default-enterprise',
      strategy: 'hybrid',
      unifiedConfig: {
        provider: 'openai',
        model: 'gpt-4o-realtime-preview',
        apiKey: process.env.OPENAI_API_KEY || ''
      },
      componentConfig: {
        stt: {
          provider: 'whisper',
          endpoint: process.env.GRPC_SERVER_URL || 'localhost:50051'
        },
        llm: {
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
          endpoint: process.env.LLM_ENDPOINT || 'http://localhost:3000'
        },
        tts: {
          provider: 'azure',
          endpoint: process.env.TTS_ENDPOINT || 'http://localhost:5000',
          voice: 'en-US-JennyNeural'
        }
      },
      fallbackStrategy: 'component',
      costTier: 'enterprise',
      maxLatencyMs: 3000
    });

    logger.info('Default tenant configs loaded', {
      count: this.configs.size
    });
  }

  getConfig(tenantId: string): TenantVoiceConfig | undefined {
    // Try to get tenant-specific config
    let config = this.configs.get(tenantId);

    if (!config) {
      // Fallback to default based on tenant tier detection
      const tier = this.detectTier(tenantId);
      config = this.configs.get(`default-${tier}`);

      if (config) {
        logger.debug('Using default config for tenant', { tenantId, tier });
      }
    }

    return config;
  }

  setConfig(tenantId: string, config: TenantVoiceConfig): void {
    this.configs.set(tenantId, config);
    logger.info('Tenant config updated', {
      tenantId,
      strategy: config.strategy,
      tier: config.costTier
    });
  }

  removeConfig(tenantId: string): boolean {
    const removed = this.configs.delete(tenantId);
    if (removed) {
      logger.info('Tenant config removed', { tenantId });
    }
    return removed;
  }

  getAllConfigs(): Map<string, TenantVoiceConfig> {
    return new Map(this.configs);
  }

  private detectTier(tenantId: string): 'basic' | 'enterprise' {
    // Simple tier detection logic
    // In real implementation, query from database

    // Example: enterprise if tenant ID contains 'ent' or 'premium'
    if (tenantId.toLowerCase().includes('ent') ||
        tenantId.toLowerCase().includes('premium')) {
      return 'enterprise';
    }

    return 'basic';
  }

  // Load config from database (future implementation)
  async loadFromDatabase(tenantId: string): Promise<TenantVoiceConfig | null> {
    // TODO: Query from Tenant model
    // const tenant = await Tenant.findById(tenantId);
    // if (tenant?.voiceConfig) {
    //   return tenant.voiceConfig;
    // }
    return null;
  }

  // Save config to database (future implementation)
  async saveToDatabase(tenantId: string, config: TenantVoiceConfig): Promise<void> {
    // TODO: Save to Tenant model
    // await Tenant.findByIdAndUpdate(tenantId, {
    //   voiceConfig: config
    // });
    logger.debug('Config save to database (not implemented)', { tenantId });
  }
}

// Singleton instance
export const tenantVoiceConfigService = new TenantVoiceConfigService();
