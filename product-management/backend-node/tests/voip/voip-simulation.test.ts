// VoIP Simulation E2E Tests

import { TestGateway } from '../../src/voip/providers/test-gateway';
import { CallMetadata, CallEvent } from '../../src/voip/types';
import * as fs from 'fs/promises';
import * as path from 'path';

const FIXTURES_DIR = path.join(__dirname, '../fixtures/audio');
const OUTPUT_DIR = path.join(__dirname, '../output/audio');

describe('VoIP Simulation Tests', () => {
  let gateway: TestGateway;

  beforeEach(async () => {
    gateway = new TestGateway();
    await gateway.initialize();
  });

  afterEach(async () => {
    await gateway.shutdown();
  });

  describe('Call Lifecycle', () => {
    it('should accept and handle a complete call', async () => {
      const callMetadata: CallMetadata = {
        callSid: 'test-call-001',
        from: '+15551234567',
        to: '+15559876543',
        direction: 'inbound',
        startTime: new Date()
      };

      const events: CallEvent[] = [];
      gateway.on('answered', (event) => events.push(event));
      gateway.on('hangup', (event) => events.push(event));

      const callSid = await gateway.acceptCall(callMetadata);
      expect(callSid).toBe('test-call-001');
      expect(gateway.getActiveCallCount()).toBe(1);

      await gateway.hangup(callSid);
      expect(gateway.getActiveCallCount()).toBe(0);
      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('answered');
      expect(events[1].type).toBe('hangup');
    });

    it('should handle multiple concurrent calls', async () => {
      const calls: string[] = [];

      for (let i = 0; i < 5; i++) {
        const callMetadata: CallMetadata = {
          callSid: `test-call-${i}`,
          from: '+15551234567',
          to: '+15559876543',
          direction: 'inbound',
          startTime: new Date()
        };
        const callSid = await gateway.acceptCall(callMetadata);
        calls.push(callSid);
      }

      expect(gateway.getActiveCallCount()).toBe(5);

      for (const callSid of calls) {
        await gateway.hangup(callSid);
      }

      expect(gateway.getActiveCallCount()).toBe(0);
    });
  });

  describe('Audio Streaming', () => {
    it('should stream audio chunks bidirectionally', async () => {
      const callMetadata: CallMetadata = {
        callSid: 'test-audio-001',
        from: '+15551234567',
        to: '+15559876543',
        direction: 'inbound',
        startTime: new Date()
      };

      const callSid = await gateway.acceptCall(callMetadata);

      // Register audio handler
      const receivedChunks: Buffer[] = [];
      gateway.receiveAudio(callSid, (chunk) => {
        receivedChunks.push(chunk.data);
      });

      // Simulate incoming audio
      const testAudio = Buffer.from('test audio data');
      gateway.simulateIncomingAudio(callSid, testAudio);

      expect(receivedChunks).toHaveLength(1);
      expect(receivedChunks[0]).toEqual(testAudio);

      // Send outbound audio
      const outboundAudio = Buffer.from('response audio');
      await gateway.sendAudio(callSid, outboundAudio);

      await gateway.hangup(callSid);
    });

    it('should handle audio from test fixtures', async () => {
      const sampleAudioPath = path.join(FIXTURES_DIR, 'sample-voice.webm');

      // Check if sample audio exists
      let audioExists = false;
      try {
        await fs.access(sampleAudioPath);
        audioExists = true;
      } catch {
        console.log('⏭️ Sample audio not found, skipping test');
      }

      if (!audioExists) {
        return; // Skip test gracefully
      }

      const audioBuffer = await fs.readFile(sampleAudioPath);

      const callMetadata: CallMetadata = {
        callSid: 'test-audio-fixture',
        from: '+15551234567',
        to: '+15559876543',
        direction: 'inbound',
        startTime: new Date()
      };

      const callSid = await gateway.acceptCall(callMetadata);

      const receivedChunks: Buffer[] = [];
      gateway.receiveAudio(callSid, (chunk) => {
        receivedChunks.push(chunk.data);
      });

      // Simulate streaming in 4KB chunks
      const chunkSize = 4096;
      for (let i = 0; i < audioBuffer.length; i += chunkSize) {
        const chunk = audioBuffer.subarray(i, Math.min(i + chunkSize, audioBuffer.length));
        gateway.simulateIncomingAudio(callSid, chunk);
      }

      expect(receivedChunks.length).toBeGreaterThan(0);

      const totalReceived = receivedChunks.reduce((sum, chunk) => sum + chunk.length, 0);
      expect(totalReceived).toBe(audioBuffer.length);

      await gateway.hangup(callSid);
    });
  });

  describe('DTMF Handling', () => {
    it('should handle DTMF inputs', async () => {
      const callMetadata: CallMetadata = {
        callSid: 'test-dtmf-001',
        from: '+15551234567',
        to: '+15559876543',
        direction: 'inbound',
        startTime: new Date()
      };

      const dtmfEvents: string[] = [];
      gateway.on('dtmf', (event: CallEvent) => {
        dtmfEvents.push(event.data.digit);
      });

      const callSid = await gateway.acceptCall(callMetadata);

      // Send DTMF sequence
      const digits = ['1', '2', '3', '#'];
      for (const digit of digits) {
        await gateway.sendDTMF(callSid, digit);
      }

      expect(dtmfEvents).toEqual(digits);

      await gateway.hangup(callSid);
    });
  });

  describe('Call Transfer', () => {
    it('should initiate call transfer', async () => {
      const callMetadata: CallMetadata = {
        callSid: 'test-transfer-001',
        from: '+15551234567',
        to: '+15559876543',
        direction: 'inbound',
        startTime: new Date()
      };

      const events: CallEvent[] = [];
      gateway.on('ringing', (event) => events.push(event));

      const callSid = await gateway.acceptCall(callMetadata);

      await gateway.transfer(callSid, '+15551111111');

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('ringing');
      expect(events[0].data.destination).toBe('+15551111111');

      await gateway.hangup(callSid);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid call operations', async () => {
      const invalidCallSid = 'non-existent-call';

      await expect(gateway.sendAudio(invalidCallSid, Buffer.from('test'))).rejects.toThrow(
        'Call not found'
      );

      await expect(gateway.sendDTMF(invalidCallSid, '1')).rejects.toThrow('Call not found');

      await expect(gateway.transfer(invalidCallSid, '+15551111111')).rejects.toThrow(
        'Call not found'
      );
    });

    it('should handle graceful shutdown with active calls', async () => {
      const callMetadata: CallMetadata = {
        callSid: 'test-shutdown-001',
        from: '+15551234567',
        to: '+15559876543',
        direction: 'inbound',
        startTime: new Date()
      };

      await gateway.acceptCall(callMetadata);
      expect(gateway.getActiveCallCount()).toBe(1);

      await gateway.shutdown();
      expect(gateway.getActiveCallCount()).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should handle rapid call creation and teardown', async () => {
      const startTime = Date.now();
      const callCount = 50;

      for (let i = 0; i < callCount; i++) {
        const callMetadata: CallMetadata = {
          callSid: `perf-test-${i}`,
          from: '+15551234567',
          to: '+15559876543',
          direction: 'inbound',
          startTime: new Date()
        };

        const callSid = await gateway.acceptCall(callMetadata);
        await gateway.hangup(callSid);
      }

      const duration = Date.now() - startTime;
      const avgPerCall = duration / callCount;

      console.log(`📊 Performance: ${callCount} calls in ${duration}ms (${avgPerCall.toFixed(2)}ms/call)`);

      expect(avgPerCall).toBeLessThan(100); // Should be < 100ms per call
    });
  });
});
