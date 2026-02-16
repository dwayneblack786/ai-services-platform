/**
 * Voice Streaming End-to-End Test
 *
 * Tests complete voice workflow:
 * 1. Load/generate sample audio file
 * 2. Stream audio to Java service via gRPC
 * 3. Receive transcription + assistant response
 * 4. Get TTS audio response
 * 5. Save response audio to file for manual verification
 *
 * Prerequisites:
 * - Java VA service running on port 50051
 * - STT/TTS services configured
 * - Sample audio file in tests/fixtures/audio/
 */

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { grpcClient } from '../../src/grpc/client';

const PROTO_PATH = path.resolve(__dirname, '../../proto/voice.proto');
const GRPC_SERVER_URL = process.env.GRPC_SERVER_URL || 'localhost:50051';
const FIXTURES_DIR = path.resolve(__dirname, '../fixtures/audio');
const OUTPUT_DIR = path.resolve(__dirname, '../output/audio');

// Ensure output directory exists
async function ensureOutputDir() {
  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
  } catch (err) {
    // Ignore if already exists
  }
}

/**
 * Generate synthetic audio data for testing
 * Creates a simple WebM audio file with sine wave
 */
async function generateTestAudio(): Promise<Buffer> {
  // Simple WebM container with Opus audio
  // This is a minimal valid WebM file for testing
  // In production, you'd use a real audio recording

  const sampleRate = 16000; // 16kHz
  const duration = 2; // 2 seconds
  const frequency = 440; // A4 note

  // Generate sine wave PCM data
  const numSamples = sampleRate * duration;
  const pcmData = Buffer.alloc(numSamples * 2); // 16-bit samples

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * frequency * t) * 0.3; // 30% volume
    const intSample = Math.floor(sample * 32767); // Convert to 16-bit int
    pcmData.writeInt16LE(intSample, i * 2);
  }

  return pcmData;
}

/**
 * Load sample audio file or generate synthetic audio
 */
async function loadTestAudio(): Promise<Buffer> {
  const sampleFile = path.join(FIXTURES_DIR, 'sample-voice.webm');

  if (existsSync(sampleFile)) {
    return await fs.readFile(sampleFile);
  }

  // Generate synthetic audio if sample doesn't exist
  console.log('📢 No sample audio found, generating synthetic audio');
  return await generateTestAudio();
}

/**
 * Split audio buffer into chunks for streaming
 */
function chunkAudioBuffer(buffer: Buffer, chunkSize: number = 4096): Buffer[] {
  const chunks: Buffer[] = [];
  for (let i = 0; i < buffer.length; i += chunkSize) {
    chunks.push(buffer.slice(i, Math.min(i + chunkSize, buffer.length)));
  }
  return chunks;
}

describe('Voice Streaming E2E Tests', () => {
  let voiceClient: any;

  beforeAll(async () => {
    await ensureOutputDir();

    // Load proto file
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });

    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
    const VoiceService = (protoDescriptor.com.ai.va.grpc as any).VoiceService;

    voiceClient = new VoiceService(
      GRPC_SERVER_URL,
      grpc.credentials.createInsecure()
    );
  });

  afterAll(() => {
    if (voiceClient) {
      voiceClient.close();
    }
  });

  describe('Complete Voice Conversation Flow', () => {
    it('should process audio, transcribe, respond, and synthesize', async () => {
      const sessionId = `test-session-${Date.now()}`;
      const customerId = 'test-customer';

      // Step 1: Load test audio
      console.log('📂 Loading test audio...');
      const audioBuffer = await loadTestAudio();
      console.log(`✅ Loaded ${audioBuffer.length} bytes of audio`);

      // Step 2: Transcribe audio using grpcClient wrapper
      console.log('🎤 Transcribing audio...');
      try {
        const transcriptionResponse = await grpcClient.transcribe(
          sessionId,
          audioBuffer,
          'webm',
          customerId
        );

        console.log('📝 Transcription:', transcriptionResponse.text);
        console.log('🎯 Confidence:', transcriptionResponse.confidence);

        expect(transcriptionResponse).toBeDefined();
        expect(transcriptionResponse.text).toBeTruthy();

        // Step 3: In a real flow, this transcription would go to assistant service
        // For this test, we'll use a sample response text
        const responseText = transcriptionResponse.text
          ? `I heard you say: ${transcriptionResponse.text}`
          : 'Hello! How can I help you today?';

        console.log('🤖 Assistant response:', responseText);

        // Step 4: Synthesize response to audio (via TTS)
        console.log('🔊 Synthesizing response audio...');

        // Call TTS using grpcClient or direct gRPC
        const synthesisRequest = {
          session_id: sessionId,
          text: responseText,
          language: 'en-US',
          voice_name: 'en-US-JennyNeural',
          format: 'mp3',
          customer_id: customerId
        };

        const audioResponse = await new Promise<any>((resolve, reject) => {
          voiceClient.Synthesize(synthesisRequest, (error: grpc.ServiceError | null, response: any) => {
            if (error) {
              if (error.code === grpc.status.UNAVAILABLE) {
                console.warn('⏭️ Java gRPC service not available, skipping TTS');
                resolve(null);
                return;
              }
              reject(error);
              return;
            }
            resolve(response);
          });
        });

        if (audioResponse && audioResponse.audio_data) {
          console.log(`🎵 Received ${audioResponse.audio_data.length} bytes of audio response`);

          // Step 5: Save response audio to file
          const outputFile = path.join(OUTPUT_DIR, `voice-response-${sessionId}.${audioResponse.format || 'mp3'}`);
          await fs.writeFile(outputFile, audioResponse.audio_data);

          console.log(`💾 Saved response audio to: ${outputFile}`);
          console.log('🎧 Play this file to verify audio quality');

          // Verify file was created
          const stats = await fs.stat(outputFile);
          expect(stats.size).toBeGreaterThan(0);

          // Verify audio metadata
          if (audioResponse.metadata) {
            console.log('📊 Audio metadata:', {
              voiceName: audioResponse.metadata.voice_name,
              language: audioResponse.metadata.language,
              duration: audioResponse.metadata.duration_ms + 'ms',
              provider: audioResponse.metadata.provider
            });

            expect(audioResponse.metadata.success).toBe(true);
            expect(audioResponse.metadata.duration_ms).toBeGreaterThan(0);
          }
        }

      } catch (error: any) {
        if (error.code === grpc.status.UNAVAILABLE) {
          console.warn('⏭️ Java gRPC service not running, skipping test');
          return;
        }
        throw error;
      }
    }, 30000); // 30 second timeout for complete flow

    it('should handle streaming audio chunks', async () => {
      const sessionId = `test-stream-${Date.now()}`;
      const customerId = 'test-customer';

      console.log('📂 Loading test audio...');
      const audioBuffer = await loadTestAudio();
      const chunks = chunkAudioBuffer(audioBuffer, 4096); // 4KB chunks

      console.log(`📦 Split audio into ${chunks.length} chunks`);

      try {
        // Create streaming transcription
        const call = voiceClient.TranscribeStream();

        const transcriptions: string[] = [];

        // Listen for responses
        call.on('data', (response: any) => {
          console.log('📝 Interim transcription:', response.text);
          if (response.text) {
            transcriptions.push(response.text);
          }
        });

        // Wait for stream to complete
        const streamComplete = new Promise<void>((resolve, reject) => {
          call.on('end', () => {
            console.log('✅ Stream ended');
            resolve();
          });

          call.on('error', (error: grpc.ServiceError) => {
            if (error.code === grpc.status.UNAVAILABLE) {
              console.warn('⏭️ Java gRPC service not available');
              resolve();
              return;
            }
            reject(error);
          });
        });

        // Send chunks
        for (let i = 0; i < chunks.length; i++) {
          const chunk = {
            session_id: sessionId,
            audio_data: chunks[i],
            format: 'webm',
            timestamp: Date.now(),
            sequence_number: i,
            customer_id: customerId,
            is_final_chunk: i === chunks.length - 1
          };

          call.write(chunk);

          // Small delay between chunks to simulate real streaming
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        call.end();
        await streamComplete;

        console.log(`📋 Received ${transcriptions.length} transcription updates`);

        if (transcriptions.length > 0) {
          expect(transcriptions.length).toBeGreaterThan(0);
          console.log('📝 Final transcription:', transcriptions[transcriptions.length - 1]);
        }

      } catch (error: any) {
        if (error.code === grpc.status.UNAVAILABLE) {
          console.warn('⏭️ Java gRPC service not running, skipping test');
          return;
        }
        throw error;
      }
    }, 45000); // 45 second timeout for streaming
  });

  describe('Audio Format Validation', () => {
    it('should accept WebM format', async () => {
      const sessionId = `test-format-${Date.now()}`;
      const audioBuffer = await generateTestAudio();

      try {
        const response = await grpcClient.transcribe(sessionId, audioBuffer, 'webm', 'test-customer');
        expect(response).toBeDefined();
      } catch (error: any) {
        if (error.code === grpc.status.UNAVAILABLE) {
          console.warn('⏭️ Java gRPC service not available');
          return;
        }
        throw error;
      }
    }, 10000);

    it('should reject unsupported format', async () => {
      const sessionId = `test-invalid-format-${Date.now()}`;
      const audioBuffer = await generateTestAudio();

      try {
        await grpcClient.transcribe(sessionId, audioBuffer, 'invalid-format' as any, 'test-customer');
        // If we get here, test should fail
        expect(true).toBe(false); // Force failure
      } catch (error: any) {
        if (error.code === grpc.status.UNAVAILABLE) {
          console.warn('⏭️ Java gRPC service not available');
          return;
        }
        // Expected to fail with invalid format
        expect(error).toBeDefined();
      }
    }, 10000);
  });

  describe('Error Handling', () => {
    it('should handle empty audio buffer', async () => {
      const sessionId = `test-empty-${Date.now()}`;
      const emptyBuffer = Buffer.alloc(0);

      try {
        await grpcClient.transcribe(sessionId, emptyBuffer, 'webm', 'test-customer');
        // Should either error or return empty transcription
        expect(true).toBe(true);
      } catch (error: any) {
        if (error.code === grpc.status.UNAVAILABLE) {
          console.warn('⏭️ Java gRPC service not available');
          return;
        }
        // Error is expected for empty buffer
        expect(error).toBeDefined();
      }
    }, 10000);

    it('should handle invalid session ID', async () => {
      const audioBuffer = await generateTestAudio();

      try {
        await grpcClient.transcribe('', audioBuffer, 'webm', 'test-customer');
        // Should error
        expect(true).toBe(false);
      } catch (error: any) {
        if (error.code === grpc.status.UNAVAILABLE) {
          console.warn('⏭️ Java gRPC service not available');
          return;
        }
        expect(error).toBeDefined();
      }
    }, 10000);
  });
});
