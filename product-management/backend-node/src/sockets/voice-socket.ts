import { AuthenticatedSocket } from '../config/socket';
import { assistantService } from '../services/assistant-service';
import { ttsService } from '../services/tts-service';
import { grpcClient } from '../grpc/client';
import {
  VoiceSessionInitEventData,
  VoiceSessionInitializedEvent,
  VoiceErrorEvent,
  VoiceGreeting
} from '../types/api.types';
import { createModuleLogger } from '../utils/logger';

interface VoiceChunkData {
  sessionId: string;
  audio: ArrayBuffer;
  timestamp: number;
}

interface VoiceStartData {
  sessionId: string;
}

interface VoiceEndData {
  sessionId: string;
}

// Audio buffer to accumulate chunks per session
const audioBuffers = new Map<string, Buffer[]>();
// Timeout tracking for buffer cleanup
const bufferTimeouts = new Map<string, NodeJS.Timeout>();
const BUFFER_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// Rate limiting for voice chunks
const chunkRateLimits = new Map<string, { count: number; resetTime: number }>();
const CHUNK_RATE_LIMIT = 100; // Max chunks per window
const CHUNK_RATE_WINDOW_MS = 1000; // 1 second window

const logger = createModuleLogger('voice-socket');

/**
 * Schedule buffer cleanup after timeout period
 */
function scheduleBufferCleanup(sessionId: string): void {
  // Clear existing timeout if any
  const existingTimeout = bufferTimeouts.get(sessionId);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  // Schedule new cleanup
  const timeout = setTimeout(() => {
    const buffer = audioBuffers.get(sessionId);
    if (buffer) {
      logger.warn('Buffer timeout, cleaning up stale session', {
        sessionId: sessionId.substring(0, 8),
        bufferSize: buffer.length
      });
      audioBuffers.delete(sessionId);
      bufferTimeouts.delete(sessionId);
    }
  }, BUFFER_TIMEOUT_MS);

  bufferTimeouts.set(sessionId, timeout);
}

/**
 * Check rate limit for voice chunks
 */
function checkChunkRateLimit(sessionId: string): boolean {
  const now = Date.now();
  const limit = chunkRateLimits.get(sessionId);

  if (!limit || now > limit.resetTime) {
    // New window
    chunkRateLimits.set(sessionId, {
      count: 1,
      resetTime: now + CHUNK_RATE_WINDOW_MS
    });
    return true;
  }

  if (limit.count >= CHUNK_RATE_LIMIT) {
    // Rate limit exceeded
    return false;
  }

  // Increment count
  limit.count++;
  return true;
}

/**
 * Setup voice streaming handlers for WebSocket
 * Handles real-time voice input streaming from client
 * Integrates with unified AssistantService
 */
export function setupVoiceHandlers(socket: AuthenticatedSocket): void {
  logger.debug('Setting up voice handlers', { userId: socket.user?.id });

  // Handle voice session initialization with greeting
  socket.on('voice:session:init', async (data: VoiceSessionInitEventData) => {
    const { sessionId, customerId, productId, tenantId } = data;

    logger.debug('Initializing voice session', {
      sessionId: sessionId?.substring(0, 8),
      customerId,
      productId: productId || 'va-service',
      tenantId: tenantId || socket.user?.tenantId || customerId,
      userEmail: socket.user?.email
    });
    
    try {
      // Call Java REST endpoint to initialize session with greeting
      const response = await grpcClient.startVoiceSessionWithGreeting({
        callId: sessionId,
        customerId,
        tenantId: tenantId || socket.user?.tenantId || customerId,
        productId: productId || 'va-service'
      });
      
      // Join voice room for future audio streaming
      const voiceRoom = `voice:${sessionId}`;
      socket.join(voiceRoom);
      logger.debug('Joined voice room', { voiceRoom });

      // Prepare greeting object
      let greeting: VoiceGreeting | null = null;
      let status: 'ready' | 'ready_no_greeting' = 'ready_no_greeting';

      if (response.greetingText && response.greetingAudio) {
        greeting = {
          text: response.greetingText,
          audio: response.greetingAudio
        };
        status = 'ready';
        logger.debug('Greeting generated', {
          textLength: response.greetingText.length,
          audioSize: response.greetingAudio.length
        });
      } else if (response.greetingText) {
        // Text-only greeting (TTS failed)
        greeting = {
          text: response.greetingText,
          audio: '' // Empty audio
        };
        status = 'ready_no_greeting';
        logger.warn('Text-only greeting, TTS unavailable', { textLength: response.greetingText.length });
      } else {
        logger.warn('No greeting generated, LLM unavailable');
      }
      
      // Send session initialized event with greeting to client
      const eventData: VoiceSessionInitializedEvent = {
        sessionId: response.sessionId,
        greeting,
        status
      };
      
      socket.emit('voice:session:initialized', eventData);

      logger.info('Session initialization complete', {
        sessionId: sessionId.substring(0, 8),
        hasGreeting: !!greeting,
        hasAudio: !!greeting?.audio,
        status
      });

    } catch (error: any) {
      logger.error('Session initialization failed', {
        error: error.message,
        sessionId: sessionId.substring(0, 8),
        customerId
      });

      const errorEvent: VoiceErrorEvent = {
        code: 'SESSION_INIT_FAILED',
        message: 'Could not initialize voice session with greeting',
        details: undefined // Sanitized
      };

      socket.emit('voice:error', errorEvent);
    }
  });

  // Handle voice recording start
  socket.on('voice:start', (data: VoiceStartData & { format?: string }) => {
    const { sessionId, format } = data;

    // Validate audio format if provided
    if (format && !isSupportedAudioFormat(format)) {
      logger.warn('Unsupported audio format', { sessionId, format });
      socket.emit('voice:error', {
        error: 'Unsupported audio format',
        details: undefined
      });
      return;
    }
    logger.debug('Recording started', {
      sessionId,
      userId: socket.user?.id,
      userEmail: socket.user?.email
    });

    // Initialize audio buffer for this session
    audioBuffers.set(sessionId, []);
    scheduleBufferCleanup(sessionId);

    // Join a voice-specific room for this session
    const voiceRoom = `voice:${sessionId}`;
    socket.join(voiceRoom);

    // Acknowledge start
    socket.emit('voice:started', {
      sessionId,
      message: 'Voice streaming started. Speak now...'
    });

    logger.debug('Joined voice room', { voiceRoom });
  });

  // Handle incoming audio chunks
  socket.on('voice:chunk', (data: VoiceChunkData) => {
    const { sessionId, audio, timestamp } = data;
    const audioSize = audio.byteLength || (audio as any).length || 0;

    // Rate limiting check
    if (!checkChunkRateLimit(sessionId)) {
      logger.warn('Rate limit exceeded for voice chunks', { sessionId: sessionId.substring(0, 8) });
      socket.emit('voice:error', {
        error: 'Rate limit exceeded',
        details: undefined
      });
      return;
    }

    // Accumulate audio chunks in buffer
    const buffer = audioBuffers.get(sessionId);
    if (buffer) {
      buffer.push(Buffer.from(audio));
    }

    // TEST OUTPUT: Echo back to client to verify streaming works
    socket.emit('voice:chunk-received', {
      sessionId,
      size: audioSize,
      timestamp,
      message: `Received ${audioSize} bytes at ${new Date(timestamp).toLocaleTimeString()}`
    });

    // TODO: Future STT integration:
    // When buffer reaches threshold (e.g., 1 second of audio), send to STT service
    // const totalSize = buffer.reduce((sum, buf) => sum + buf.length, 0);
    // if (totalSize >= STT_CHUNK_THRESHOLD) {
    //   const audioData = Buffer.concat(buffer);
    //   const transcription = await speechToText(audioData);
    //   
    //   // Send transcription through unified assistant service
    //   const response = await assistantService.processMessage({
    //     sessionId,
    //     message: transcription,
    //     userId: socket.user.id,
    //     userEmail: socket.user.email,
    //     tenantId: socket.user.tenantId,
    //     source: 'voice',
    //     context: { productId: 'va-service' }
    //   });
    //   
    //   socket.emit('voice:transcription', { text: transcription });
    //   socket.emit('chat:message-received', {
    //     role: 'assistant',
    //     content: response.message,
    //     timestamp: new Date(),
    //     intent: response.intent
    //   });
    //   
    //   // Clear buffer after processing
    //   buffer.length = 0;
    // }
  });

  // Handle voice recording end
  socket.on('voice:end', async (data: VoiceEndData) => {
    const { sessionId } = data;
    logger.debug('Recording stopped', { sessionId });

    const voiceRoom = `voice:${sessionId}`;
    socket.leave(voiceRoom);

    // Get final audio buffer
    const buffer = audioBuffers.get(sessionId);
    const totalSize = buffer?.reduce((sum, buf) => sum + buf.length, 0) || 0;

    logger.debug('Total audio buffered', { totalSize, sessionId });
    
    // Process final audio buffer with STT and TTS
    if (buffer && buffer.length > 0 && socket.user) {
      try {
        const audioData = Buffer.concat(buffer);
        
        // Step 1: Transcribe audio using STT
        logger.debug('Transcribing audio', { sessionId, audioSize: audioData.length });
        const transcriptionResponse = await grpcClient.transcribe(sessionId, audioData, 'webm', socket.user.tenantId || 'default');
        const transcription = transcriptionResponse.text || '';

        logger.debug('Transcription complete', { sessionId, textLength: transcription.length });
        
        // Send transcription to client
        socket.emit('voice:transcription', { 
          text: transcription, 
          confidence: transcriptionResponse.confidence,
          final: true 
        });
        
        // Step 2: Process through assistant service
        logger.debug('Processing with assistant', { sessionId });
        const assistantResponse = await assistantService.processMessage({
          sessionId,
          message: transcription,
          userId: socket.user.id,
          userEmail: socket.user.email,
          tenantId: socket.user.tenantId,
          source: 'voice',
          context: { productId: 'va-service' }
        });

        logger.debug('Assistant response received', { sessionId, responseLength: assistantResponse.message.length });
        
        // Send text response to client
        socket.emit('chat:message-received', {
          role: 'assistant',
          content: assistantResponse.message,
          timestamp: new Date(),
          intent: assistantResponse.intent,
          requiresAction: assistantResponse.requiresAction,
          suggestedAction: assistantResponse.suggestedAction
        });
        
        // Step 3: Synthesize response to audio using TTS
        logger.debug('Synthesizing response to audio', { sessionId });
        const ttsResponse = await ttsService.synthesize(sessionId, assistantResponse.message, {
          language: 'en-US',
          voiceName: 'en-US-JennyNeural',
          format: 'mp3',
          customerId: socket.user.tenantId || 'default'
        });

        logger.debug('TTS complete', {
          sessionId,
          audioSize: ttsResponse.audioData.length,
          duration: ttsResponse.metadata.durationMs
        });
        
        // Step 4: Send audio response to client
        socket.emit('voice:audio-response', {
          sessionId,
          audioData: ttsResponse.audioData.toString('base64'), // Convert to base64 for transmission
          format: ttsResponse.format,
          metadata: {
            voiceName: ttsResponse.metadata.voiceName,
            language: ttsResponse.metadata.language,
            durationMs: ttsResponse.metadata.durationMs,
            provider: ttsResponse.metadata.provider
          }
        });
        
        logger.info('Voice conversation cycle complete', { sessionId });

      } catch (error: any) {
        logger.error('Error processing voice conversation', {
          sessionId,
          error: error.message
        });
        socket.emit('voice:error', {
          error: 'Failed to process voice input',
          details: undefined // Sanitized
        });
      }
    }

    // Clean up buffer and timeout
    audioBuffers.delete(sessionId);
    const timeout = bufferTimeouts.get(sessionId);
    if (timeout) {
      clearTimeout(timeout);
      bufferTimeouts.delete(sessionId);
    }

    // Acknowledge stop
    socket.emit('voice:stopped', {
      sessionId,
      message: 'Voice streaming stopped.',
      totalBytesReceived: totalSize
    });

    logger.debug('Session complete', { sessionId, voiceRoom });
  });
  // Handle text-to-speech request (for non-voice TTS)
  socket.on('tts:synthesize', async (data: { sessionId: string; text: string; language?: string; voiceName?: string; format?: string }) => {
    const { sessionId, text, language, voiceName, format } = data;

    if (!text || text.trim().length === 0) {
      socket.emit('tts:error', { error: 'Text cannot be empty' });
      return;
    }

    logger.debug('Synthesizing text', { sessionId, textLength: text.length });

    try {
      const ttsResponse = await ttsService.synthesize(sessionId, text, {
        language: language || 'en-US',
        voiceName: voiceName,
        format: format || 'mp3',
        customerId: socket.user?.tenantId || 'default'
      });

      logger.debug('TTS synthesized', { sessionId, audioSize: ttsResponse.audioData.length });

      socket.emit('tts:audio-ready', {
        sessionId,
        audioData: ttsResponse.audioData.toString('base64'),
        format: ttsResponse.format,
        metadata: ttsResponse.metadata
      });

    } catch (error: any) {
      logger.error('TTS synthesis error', { sessionId, error: error.message });
      socket.emit('tts:error', {
        error: 'Failed to synthesize audio',
        details: undefined // Sanitized
      });
    }
  });
  // Handle disconnection
  socket.on('disconnect', () => {
    logger.debug('User disconnected', { userId: socket.user?.id, userEmail: socket.user?.email });

    // Clean up any remaining audio buffers for this user's sessions
    const sessionIds = Array.from(audioBuffers.keys());
    for (const sessionId of sessionIds) {
      const buffer = audioBuffers.get(sessionId);
      // If this is the user's session, clean it up
      // (In a more sophisticated system, we'd track session ownership)
      if (buffer && buffer.length > 0) {
        logger.debug('Cleaning up abandoned buffer', { sessionId: sessionId.substring(0, 8) });
        audioBuffers.delete(sessionId);

        // Clear timeout
        const timeout = bufferTimeouts.get(sessionId);
        if (timeout) {
          clearTimeout(timeout);
          bufferTimeouts.delete(sessionId);
        }
      }
    }
  });

  // Handle errors
  socket.on('error', (error) => {
    logger.error('Socket error', { userId: socket.user?.id, error: error.message || error });
    socket.emit('voice:error', {
      error: 'An error occurred during voice streaming'
    });
  });
}

// Export utility function to check if audio format is supported
export function isSupportedAudioFormat(mimeType: string): boolean {
  const supportedFormats = [
    'audio/webm',
    'audio/webm;codecs=opus',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/mpeg'
  ];
  
  return supportedFormats.some(format => 
    mimeType.toLowerCase().includes(format.toLowerCase())
  );
}
