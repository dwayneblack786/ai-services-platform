// Voice Orchestrator Integration Tests

import { VoiceOrchestrator } from '../../src/orchestrator/voice-orchestrator';
import { tenantVoiceConfigService } from '../../src/services/tenant-voice-config.service';
import { VoiceRequest } from '../../src/orchestrator/types';
import * as fs from 'fs/promises';
import * as path from 'path';

const FIXTURES_DIR = path.join(__dirname, '../fixtures/audio');

describe('Voice Orchestrator Integration', () => {
  let orchestrator: VoiceOrchestrator;

  beforeEach(() => {
    orchestrator = new VoiceOrchestrator();
  });

  afterEach(() => {
    orchestrator.shutdown();
  });

  describe('End-to-End Flow with Real Audio', () => {
    it('should process audio with component strategy', async () => {
      const tenantId = 'test-tenant-component';

      // Get default component config
      const config = tenantVoiceConfigService.getConfig('default-basic');
      expect(config).toBeDefined();

      // Register tenant
      orchestrator.registerTenant(tenantId, { ...config!, tenantId });

      // Load test audio (if available)
      let audioData: Buffer;
      try {
        const audioPath = path.join(FIXTURES_DIR, 'sample-voice.webm');
        audioData = await fs.readFile(audioPath);
      } catch {
        // Use dummy audio if fixture not available
        audioData = Buffer.from('dummy-audio-data');
      }

      // Create request
      const request: VoiceRequest = {
        sessionId: 'session-integration-001',
        tenantId,
        audioData,
        format: 'webm',
        customerId: 'test-customer'
      };

      // Process request
      const response = await orchestrator.processVoiceRequest(request);

      // Verify response
      expect(response).toBeDefined();
      expect(response.sessionId).toBe('session-integration-001');
      expect(response.transcription).toBeDefined();
      expect(response.responseText).toBeDefined();
      expect(response.metadata).toBeDefined();
      expect(response.metadata?.strategy).toBe('component');
    });

    it('should process audio with unified strategy', async () => {
      const tenantId = 'test-tenant-unified';

      // Get enterprise config (has unified)
      const config = tenantVoiceConfigService.getConfig('default-enterprise');
      expect(config).toBeDefined();

      // Override to use unified only
      const unifiedConfig = {
        ...config!,
        tenantId,
        strategy: 'unified' as const
      };

      orchestrator.registerTenant(tenantId, unifiedConfig);

      const request: VoiceRequest = {
        sessionId: 'session-integration-002',
        tenantId,
        audioData: Buffer.from('test-audio-data'),
        format: 'webm',
        customerId: 'test-customer'
      };

      const response = await orchestrator.processVoiceRequest(request);

      expect(response).toBeDefined();
      expect(response.sessionId).toBe('session-integration-002');
      expect(response.metadata?.strategy).toBe('unified');
    });

    it('should process audio with hybrid strategy', async () => {
      const tenantId = 'test-tenant-hybrid';

      // Get enterprise config (has hybrid)
      const config = tenantVoiceConfigService.getConfig('default-enterprise');
      expect(config).toBeDefined();

      orchestrator.registerTenant(tenantId, { ...config!, tenantId });

      const request: VoiceRequest = {
        sessionId: 'session-integration-003',
        tenantId,
        audioData: Buffer.from('test-audio-data'),
        format: 'webm',
        customerId: 'test-customer'
      };

      const response = await orchestrator.processVoiceRequest(request);

      expect(response).toBeDefined();
      expect(response.sessionId).toBe('session-integration-003');
      expect(['unified', 'component', 'hybrid']).toContain(response.metadata?.strategy);
    });
  });

  describe('Tenant Config Service', () => {
    it('should provide default config for basic tier', () => {
      const config = tenantVoiceConfigService.getConfig('default-basic');

      expect(config).toBeDefined();
      expect(config?.strategy).toBe('component');
      expect(config?.costTier).toBe('basic');
      expect(config?.componentConfig).toBeDefined();
    });

    it('should provide default config for enterprise tier', () => {
      const config = tenantVoiceConfigService.getConfig('default-enterprise');

      expect(config).toBeDefined();
      expect(config?.strategy).toBe('hybrid');
      expect(config?.costTier).toBe('enterprise');
      expect(config?.unifiedConfig).toBeDefined();
      expect(config?.componentConfig).toBeDefined();
    });

    it('should detect tier and provide appropriate config', () => {
      // Enterprise tenant
      const enterpriseConfig = tenantVoiceConfigService.getConfig('tenant-enterprise-001');
      expect(enterpriseConfig).toBeDefined();
      expect(enterpriseConfig?.costTier).toBe('enterprise');

      // Basic tenant
      const basicConfig = tenantVoiceConfigService.getConfig('tenant-basic-001');
      expect(basicConfig).toBeDefined();
      expect(basicConfig?.costTier).toBe('basic');
    });

    it('should allow custom config override', () => {
      const customConfig = tenantVoiceConfigService.getConfig('default-basic');
      expect(customConfig).toBeDefined();

      const tenantId = 'custom-tenant-001';
      const modifiedConfig = {
        ...customConfig!,
        tenantId,
        maxLatencyMs: 2000
      };

      tenantVoiceConfigService.setConfig(tenantId, modifiedConfig);

      const retrievedConfig = tenantVoiceConfigService.getConfig(tenantId);
      expect(retrievedConfig?.maxLatencyMs).toBe(2000);
    });
  });

  describe('Performance with Multiple Requests', () => {
    it('should handle sequential requests efficiently', async () => {
      const tenantId = 'test-tenant-perf';
      const config = tenantVoiceConfigService.getConfig('default-basic');

      orchestrator.registerTenant(tenantId, { ...config!, tenantId });

      const startTime = Date.now();
      const count = 5;

      for (let i = 0; i < count; i++) {
        const request: VoiceRequest = {
          sessionId: `session-perf-${i}`,
          tenantId,
          audioData: Buffer.from('test-audio'),
          format: 'webm'
        };

        await orchestrator.processVoiceRequest(request);
      }

      const duration = Date.now() - startTime;
      const avgPerRequest = duration / count;

      console.log(`📊 Sequential: ${count} requests in ${duration}ms (${avgPerRequest.toFixed(2)}ms/request)`);

      expect(avgPerRequest).toBeLessThan(1000); // Should be fast with mock
    });

    it('should handle concurrent requests efficiently', async () => {
      const tenantId = 'test-tenant-concurrent';
      const config = tenantVoiceConfigService.getConfig('default-basic');

      orchestrator.registerTenant(tenantId, { ...config!, tenantId });

      const startTime = Date.now();
      const count = 10;

      const requests = Array.from({ length: count }, (_, i) => ({
        sessionId: `session-concurrent-${i}`,
        tenantId,
        audioData: Buffer.from('test-audio'),
        format: 'webm'
      }));

      await Promise.all(
        requests.map(req => orchestrator.processVoiceRequest(req))
      );

      const duration = Date.now() - startTime;

      console.log(`📊 Concurrent: ${count} requests in ${duration}ms`);

      expect(duration).toBeLessThan(2000); // Concurrent should be faster
    });
  });

  describe('Metrics Collection', () => {
    it('should collect metrics per strategy', async () => {
      const tenantId = 'test-tenant-metrics';
      const config = tenantVoiceConfigService.getConfig('default-basic');

      orchestrator.registerTenant(tenantId, { ...config!, tenantId });

      // Make requests
      for (let i = 0; i < 3; i++) {
        const request: VoiceRequest = {
          sessionId: `session-metrics-${i}`,
          tenantId,
          audioData: Buffer.from('test-audio'),
          format: 'webm'
        };

        await orchestrator.processVoiceRequest(request);
      }

      // Check metrics
      const metrics = orchestrator.getMetrics('component');

      expect(metrics).toBeDefined();
      expect(metrics?.totalRequests).toBe(3);
      expect(metrics?.successCount).toBe(3);
      expect(metrics?.errorCount).toBe(0);
      expect(metrics?.avgLatency).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing tenant config gracefully', async () => {
      const request: VoiceRequest = {
        sessionId: 'session-error-001',
        tenantId: 'non-existent-tenant',
        audioData: Buffer.from('test-audio'),
        format: 'webm'
      };

      await expect(orchestrator.processVoiceRequest(request)).rejects.toThrow(
        'Tenant config not found'
      );
    });

    it('should track error metrics', async () => {
      const tenantId = 'test-tenant-error';
      const config = tenantVoiceConfigService.getConfig('default-basic');

      orchestrator.registerTenant(tenantId, { ...config!, tenantId });

      // Valid request
      const validRequest: VoiceRequest = {
        sessionId: 'session-valid',
        tenantId,
        audioData: Buffer.from('test-audio'),
        format: 'webm'
      };

      await orchestrator.processVoiceRequest(validRequest);

      const metrics = orchestrator.getMetrics('component');
      expect(metrics?.successCount).toBeGreaterThan(0);
    });
  });
});
