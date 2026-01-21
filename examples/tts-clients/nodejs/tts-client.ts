import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const PROTO_PATH = path.join(__dirname, '../../../services-java/va-service/src/main/proto/voice_service.proto');
const SERVER_HOST = process.env.TTS_SERVER_HOST || 'localhost:50051';

// Load proto definition
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
const VoiceService = protoDescriptor.com.ai.va.grpc.VoiceService;

/**
 * TTS gRPC Client
 */
class TtsGrpcClient {
  private client: any;

  constructor(serverAddress: string = SERVER_HOST) {
    this.client = new VoiceService(
      serverAddress,
      grpc.credentials.createInsecure()
    );
  }

  /**
   * Synthesize text to speech (single request)
   */
  async synthesizeText(
    text: string,
    language: string = 'en-US',
    voiceName: string = 'en-US-JennyNeural',
    format: string = 'mp3',
    customerId: string = 'nodejs-client'
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const sessionId = `nodejs-${Date.now()}`;
      
      const request = {
        session_id: sessionId,
        text: text,
        language: language,
        voice_name: voiceName,
        format: format,
        customer_id: customerId,
      };

      console.log(`[TTS] Synthesizing: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
      console.log(`[TTS] Voice: ${voiceName}, Language: ${language}, Format: ${format}`);

      this.client.Synthesize(request, (error: any, response: any) => {
        if (error) {
          console.error('[TTS] ❌ Synthesis failed:', error.message);
          reject(error);
          return;
        }

        const audioBuffer = Buffer.from(response.audio_data, 'base64');
        const metadata = response.metadata;

        console.log('[TTS] ✅ Synthesis successful:');
        console.log(`       Session ID: ${response.session_id}`);
        console.log(`       Audio size: ${audioBuffer.length} bytes`);
        console.log(`       Duration: ${metadata.duration_ms}ms`);
        console.log(`       Voice: ${metadata.voice_name}`);
        console.log(`       Provider: ${metadata.provider}`);
        console.log(`       Processing time: ${metadata.processing_time_ms}ms`);

        resolve(audioBuffer);
      });
    });
  }

  /**
   * Synthesize text with streaming (for long texts)
   */
  async synthesizeStream(
    textChunks: string[],
    language: string = 'en-US',
    voiceName: string = 'en-US-JennyNeural',
    format: string = 'mp3',
    customerId: string = 'nodejs-client'
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const sessionId = `nodejs-stream-${Date.now()}`;
      const audioChunks: Buffer[] = [];

      console.log(`[TTS Stream] Streaming ${textChunks.length} text chunks`);

      const call = this.client.SynthesizeStream();

      // Handle responses
      call.on('data', (response: any) => {
        const audioBuffer = Buffer.from(response.audio_data, 'base64');
        audioChunks.push(audioBuffer);
        console.log(`[TTS Stream] Received audio chunk: ${audioBuffer.length} bytes`);
      });

      call.on('end', () => {
        const fullAudio = Buffer.concat(audioChunks);
        console.log(`[TTS Stream] ✅ Stream complete: ${fullAudio.length} bytes total`);
        resolve(fullAudio);
      });

      call.on('error', (error: any) => {
        console.error('[TTS Stream] ❌ Stream failed:', error.message);
        reject(error);
      });

      // Send text chunks
      textChunks.forEach((chunk, index) => {
        const request = {
          session_id: sessionId,
          text: chunk,
          language: language,
          voice_name: voiceName,
          format: format,
          customer_id: customerId,
          sequence_number: index,
          is_final_chunk: index === textChunks.length - 1,
        };
        call.write(request);
        console.log(`[TTS Stream] Sent chunk ${index + 1}/${textChunks.length}`);
      });

      // Signal end of stream
      call.end();
    });
  }

  /**
   * Close client connection
   */
  close(): void {
    this.client.close();
  }
}

/**
 * Save audio to file
 */
function saveAudio(audioData: Buffer, filename: string): void {
  fs.writeFileSync(filename, audioData);
  console.log(`[File] 💾 Saved audio to: ${filename}`);
}

/**
 * Main function - Examples
 */
async function main() {
  const client = new TtsGrpcClient();

  try {
    // Get text from command line or use default
    const text = process.argv[2] || 'Hello, this is a test of text-to-speech synthesis';

    console.log('=== TTS gRPC Client - Node.js/TypeScript ===\n');

    // Example 1: Single synthesis (default voice)
    console.log('--- Example 1: Single Synthesis (JennyNeural) ---');
    const audio1 = await client.synthesizeText(text, 'en-US', 'en-US-JennyNeural');
    saveAudio(audio1, 'output-jenny.mp3');
    console.log('');

    // Example 2: Different voice
    console.log('--- Example 2: Male Voice (GuyNeural) ---');
    const audio2 = await client.synthesizeText(
      'This is GuyNeural speaking',
      'en-US',
      'en-US-GuyNeural'
    );
    saveAudio(audio2, 'output-guy.mp3');
    console.log('');

    // Example 3: Spanish voice
    console.log('--- Example 3: Spanish Voice (ElviraNeural) ---');
    const audio3 = await client.synthesizeText(
      'Hola, esta es una prueba de síntesis de voz',
      'es-ES',
      'es-ES-ElviraNeural'
    );
    saveAudio(audio3, 'output-spanish.mp3');
    console.log('');

    // Example 4: Streaming synthesis (for long text)
    console.log('--- Example 4: Streaming Synthesis ---');
    const longText = [
      'This is the first part of a long text.',
      'This is the second part, demonstrating streaming.',
      'And this is the final part of our streaming example.',
    ];
    const audio4 = await client.synthesizeStream(longText);
    saveAudio(audio4, 'output-stream.mp3');
    console.log('');

    console.log('✅ All examples completed successfully!');
    console.log('Audio files saved in current directory.');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.close();
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { TtsGrpcClient, saveAudio };
