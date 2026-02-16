// Voice Orchestrator Tests

import { VoiceOrchestrator } from '../../src/orchestrator/voice-orchestrator';
import { VoiceRequest, TenantVoiceConfig } from '../../src/orchestrator/types';

describe('Voice Orchestrator', () => {
  let orchestrator: VoiceOrchestrator;

  beforeEach(() => {
    orchestrator = new VoiceOrchestrator();
  });

  afterEach(() => {
    orchestrator.shutdown();
  });

  describe('Tenant Registration', () => {
    it('should register tenant with unified strategy', () => {
      const config: TenantVoiceConfig = {
        tenantId: 'tenant-001',
        strategy: 'unified',
        unifiedConfig: {
          provider: 'openai',
          model: 'gpt-4o-realtime-preview',
          apiKey: 'test-key'
        }
      };

      expect(() => orchestrator.registerTenant('tenant-001', config)).not.toThrow();
    });

    it('should register tenant with component strategy', () => {
      const config: TenantVoiceConfig = {
        tenantId: 'tenant-002',
        strategy: 'component',
        componentConfig: {
          stt: { provider: 'whisper', endpoint: 'http://localhost:50051' },
          llm: { provider: 'anthropic', model: 'claude-3-5-sonnet', endpoint: 'http://localhost:3000' },
          tts: { provider: 'azure', endpoint: 'http://localhost:5000', voice: 'en-US-JennyNeural' }
        }
      };

      expect(() => orchestrator.registerTenant('tenant-002', config)).not.toThrow();
    });

    it('should register tenant with hybrid strategy', () => {
      const config: TenantVoiceConfig = {
        tenantId: 'tenant-003',
        strategy: 'hybrid',
        unifiedConfig: {
          provider: 'openai',
          model: 'gpt-4o-realtime-preview',
          apiKey: 'test-key'
        },
        componentConfig: {
          stt: { provider: 'whisper', endpoint: 'http://localhost:50051' },
          llm: { provider: 'anthropic', model: 'claude-3-5-sonnet', endpoint: 'http://localhost:3000' },
          tts: { provider: 'azure', endpoint: 'http://localhost:5000', voice: 'en-US-JennyNeural' }
        }
      };

      expect(() => orchestrator.registerTenant('tenant-003', config)).not.toThrow();
    });
  });

  describe('Voice Request Processing', () => {
    it('should process request with unified strategy', async () => {
      const config: TenantVoiceConfig = {
        tenantId: 'tenant-unified',
        strategy: 'unified',
        unifiedConfig: {
          provider: 'openai',
          model: 'gpt-4o-realtime-preview',
          apiKey: 'test-key'
        }
      };

      orchestrator.registerTenant('tenant-unified', config);

      const request: VoiceRequest = {
        sessionId: 'session-001',
        tenantId: 'tenant-unified',
        audioData: Buffer.from('test audio data'),
        format: 'webm'
      };

      const response = await orchestrator.processVoiceRequest(request);

      expect(response).toBeDefined();
      expect(response.sessionId).toBe('session-001');
      expect(response.transcription).toBeDefined();
      expect(response.responseText).toBeDefined();
      expect(response.metadata?.strategy).toBe('unified');
    });

    it('should process request with component strategy', async () => {
      const config: TenantVoiceConfig = {
        tenantId: 'tenant-component',
        strategy: 'component',
        componentConfig: {
          stt: { provider: 'whisper', endpoint: 'http://localhost:50051' },
          llm: { provider: 'anthropic', model: 'claude-3-5-sonnet', endpoint: 'http://localhost:3000' },
          tts: { provider: 'azure', endpoint: 'http://localhost:5000', voice: 'en-US-JennyNeural' }
        }
      };

      orchestrator.registerTenant('tenant-component', config);

      const request: VoiceRequest = {
        sessionId: 'session-002',
        tenantId: 'tenant-component',
        audioData: Buffer.from('test audio data'),
        format: 'webm'
      };

      const response = await orchestrator.processVoiceRequest(request);

      expect(response).toBeDefined();
      expect(response.sessionId).toBe('session-002');
      expect(response.transcription).toBeDefined();
      expect(response.responseText).toBeDefined();
      expect(response.metadata?.strategy).toBe('component');
    });

    it('should process request with hybrid strategy', async () => {
      const config: TenantVoiceConfig = {
        tenantId: 'tenant-hybrid',
        strategy: 'hybrid',
        unifiedConfig: {
          provider: 'openai',
          model: 'gpt-4o-realtime-preview',
          apiKey: 'test-key'
        },
        componentConfig: {
          stt: { provider: 'whisper', endpoint: 'http://localhost:50051' },
          llm: { provider: 'anthropic', model: 'claude-3-5-sonnet', endpoint: 'http://localhost:3000' },
          tts: { provider: 'azure', endpoint: 'http://localhost:5000', voice: 'en-US-JennyNeural' }
        }
      };

      orchestrator.registerTenant('tenant-hybrid', config);

      const request: VoiceRequest = {
        sessionId: 'session-003',
        tenantId: 'tenant-hybrid',
        audioData: Buffer.from('test audio data'),
        format: 'webm'
      };

      const response = await orchestrator.processVoiceRequest(request);

      expect(response).toBeDefined();
      expect(response.sessionId).toBe('session-003');
      expect(response.transcription).toBeDefined();
      expect(response.responseText).toBeDefined();
    });

    it('should handle missing tenant config', async () => {
      const request: VoiceRequest = {
        sessionId: 'session-004',
        tenantId: 'non-existent-tenant',
        audioData: Buffer.from('test audio data'),
        format: 'webm'
      };

      await expect(orchestrator.processVoiceRequest(request)).rejects.toThrow(
        'Tenant config not found'
      );
    });
  });

  describe('Metrics Tracking', () => {
    it('should track successful requests', async () => {
      const config: TenantVoiceConfig = {
        tenantId: 'tenant-metrics',
        strategy: 'unified',
        unifiedConfig: {
          provider: 'openai',
          model: 'gpt-4o-realtime-preview',
          apiKey: 'test-key'
        }
      };

      orchestrator.registerTenant('tenant-metrics', config);

      const request: VoiceRequest = {
        sessionId: 'session-005',
        tenantId: 'tenant-metrics',
        audioData: Buffer.from('test audio data'),
        format: 'webm'
      };

      await orchestrator.processVoiceRequest(request);

      const metrics = orchestrator.getMetrics('unified');
      expect(metrics).toBeDefined();
      expect(metrics?.totalRequests).toBeGreaterThan(0);
      expect(metrics?.successCount).toBeGreaterThan(0);
    });

    it('should track multiple requests', async () => {
      const config: TenantVoiceConfig = {
        tenantId: 'tenant-multi',
        strategy: 'component',
        componentConfig: {
          stt: { provider: 'whisper', endpoint: 'http://localhost:50051' },
          llm: { provider: 'anthropic', model: 'claude-3-5-sonnet', endpoint: 'http://localhost:3000' },
          tts: { provider: 'azure', endpoint: 'http://localhost:5000', voice: 'en-US-JennyNeural' }
        }
      };

      orchestrator.registerTenant('tenant-multi', config);

      for (let i = 0; i < 5; i++) {
        const request: VoiceRequest = {
          sessionId: `session-${i}`,
          tenantId: 'tenant-multi',
          audioData: Buffer.from('test audio data'),
          format: 'webm'
        };

        await orchestrator.processVoiceRequest(request);
      }

      const metrics = orchestrator.getMetrics('component');
      expect(metrics?.totalRequests).toBe(5);
      expect(metrics?.successCount).toBe(5);
      expect(metrics?.avgLatency).toBeGreaterThan(0);
    });
  });

  describe('Health Monitoring', () => {
    it('should provide health monitor access', () => {
      const healthMonitor = orchestrator.getHealthMonitor();
      expect(healthMonitor).toBeDefined();
    });

    it('should have services registered', () => {
      const healthMonitor = orchestrator.getHealthMonitor();
      const allHealth = healthMonitor.getAllServiceHealth();
      expect(allHealth.size).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should handle multiple concurrent requests', async () => {
      const config: TenantVoiceConfig = {
        tenantId: 'tenant-perf',
        strategy: 'unified',
        unifiedConfig: {
          provider: 'openai',
          model: 'gpt-4o-realtime-preview',
          apiKey: 'test-key'
        }
      };

      orchestrator.registerTenant('tenant-perf', config);

      const requests = Array.from({ length: 10 }, (_, i) => ({
        sessionId: `session-perf-${i}`,
        tenantId: 'tenant-perf',
        audioData: Buffer.from('test audio data'),
        format: 'webm'
      }));

      const startTime = Date.now();
      await Promise.all(requests.map(req => orchestrator.processVoiceRequest(req)));
      const duration = Date.now() - startTime;

      console.log(`📊 Performance: 10 concurrent requests in ${duration}ms`);

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});
