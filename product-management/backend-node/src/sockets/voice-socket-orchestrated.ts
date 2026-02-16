// Voice Socket with Orchestrator Integration

import { AuthenticatedSocket } from '../config/socket';
import { VoiceOrchestrator } from '../orchestrator/voice-orchestrator';
import { tenantVoiceConfigService } from '../services/tenant-voice-config.service';
import { VoiceRequest } from '../orchestrator/types';
import {
  VoiceSessionInitEventData,
  VoiceSessionInitializedEvent,
  VoiceErrorEvent
} from '../types/api.types';
import { createModuleLogger } from '../utils/logger';

const logger = createModuleLogger('voice-socket-orchestrated');

interface VoiceChunkData {
  sessionId: string;
  audio: ArrayBuffer;
  timestamp: number;
}

interface VoiceStartData {
  sessionId: string;
  format?: string;
}

interface VoiceEndData {
  sessionId: string;
}

// Audio buffer to accumulate chunks per session
const audioBuffers = new Map<string, Buffer[]>();
const bufferTimeouts = new Map<string, NodeJS.Timeout>();
const BUFFER_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// Rate limiting
const chunkRateLimits = new Map<string, { count: number; resetTime: number }>();
const CHUNK_RATE_LIMIT = 100;
const CHUNK_RATE_WINDOW_MS = 1000;

// Session metadata
const sessionMetadata = new Map<string, { tenantId: string; customerId: string; productId: string }>();

// Orchestrator instance (singleton)
let orchestratorInstance: VoiceOrchestrator | null = null;

function getOrchestrator(): VoiceOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new VoiceOrchestrator();
    logger.info('Voice orchestrator initialized');
  }
  return orchestratorInstance;
}

function scheduleBufferCleanup(sessionId: string): void {
  const existingTimeout = bufferTimeouts.get(sessionId);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  const timeout = setTimeout(() => {
    const buffer = audioBuffers.get(sessionId);
    if (buffer) {
      logger.warn('Buffer timeout, cleaning up stale session', {
        sessionId: sessionId.substring(0, 8),
        bufferSize: buffer.length
      });
      audioBuffers.delete(sessionId);
      bufferTimeouts.delete(sessionId);
      sessionMetadata.delete(sessionId);
    }
  }, BUFFER_TIMEOUT_MS);

  bufferTimeouts.set(sessionId, timeout);
}

function checkChunkRateLimit(sessionId: string): boolean {
  const now = Date.now();
  const limit = chunkRateLimits.get(sessionId);

  if (!limit || now > limit.resetTime) {
    chunkRateLimits.set(sessionId, {
      count: 1,
      resetTime: now + CHUNK_RATE_WINDOW_MS
    });
    return true;
  }

  if (limit.count >= CHUNK_RATE_LIMIT) {
    return false;
  }

  limit.count++;
  return true;
}

function isSupportedAudioFormat(format: string): boolean {
  const supported = ['webm', 'ogg', 'opus', 'mp4', 'mpeg'];
  return supported.includes(format.toLowerCase());
}

export function setupVoiceHandlersOrchestrated(socket: AuthenticatedSocket): void {
  logger.debug('Setting up orchestrated voice handlers', { userId: socket.user?.id });

  const orchestrator = getOrchestrator();

  // Voice session initialization
  socket.on('voice:session:init', async (data: VoiceSessionInitEventData) => {
    const { sessionId, customerId, productId, tenantId } = data;
    const resolvedTenantId = tenantId || socket.user?.tenantId || customerId;

    logger.info('Initializing voice session (orchestrated)', {
      sessionId: sessionId?.substring(0, 8),
      customerId,
      tenantId: resolvedTenantId,
      productId: productId || 'va-service'
    });

    try {
      // Store session metadata
      sessionMetadata.set(sessionId, {
        tenantId: resolvedTenantId,
        customerId,
        productId: productId || 'va-service'
      });

      // Get tenant voice config
      const tenantConfig = tenantVoiceConfigService.getConfig(resolvedTenantId);
      if (!tenantConfig) {
        throw new Error(`No voice config found for tenant: ${resolvedTenantId}`);
      }

      // Register tenant with orchestrator
      orchestrator.registerTenant(resolvedTenantId, tenantConfig);

      // Join voice room
      const voiceRoom = `voice:${sessionId}`;
      socket.join(voiceRoom);

      // Send ready event (no greeting yet, will come after first audio)
      const eventData: VoiceSessionInitializedEvent = {
        sessionId,
        greeting: null,
        status: 'ready'
      };

      socket.emit('voice:session:initialized', eventData);

      logger.info('Session initialized successfully (orchestrated)', {
        sessionId: sessionId.substring(0, 8),
        strategy: tenantConfig.strategy,
        tier: tenantConfig.costTier
      });

    } catch (error: any) {
      logger.error('Session initialization failed (orchestrated)', {
        error: error.message,
        sessionId: sessionId.substring(0, 8)
      });

      socket.emit('voice:error', {
        code: 'SESSION_INIT_FAILED',
        message: 'Could not initialize voice session',
        details: undefined
      } as VoiceErrorEvent);
    }
  });

  // Voice recording start
  socket.on('voice:start', (data: VoiceStartData) => {
    const { sessionId, format } = data;

    if (format && !isSupportedAudioFormat(format)) {
      logger.warn('Unsupported audio format', { sessionId, format });
      socket.emit('voice:error', {
        error: 'Unsupported audio format',
        details: undefined
      });
      return;
    }

    logger.debug('Recording started', { sessionId: sessionId.substring(0, 8) });

    audioBuffers.set(sessionId, []);
    scheduleBufferCleanup(sessionId);

    const voiceRoom = `voice:${sessionId}`;
    socket.join(voiceRoom);

    socket.emit('voice:started', {
      sessionId,
      message: 'Voice streaming started. Speak now...'
    });
  });

  // Incoming audio chunks
  socket.on('voice:chunk', (data: VoiceChunkData) => {
    const { sessionId, audio, timestamp } = data;

    if (!checkChunkRateLimit(sessionId)) {
      logger.warn('Rate limit exceeded', { sessionId: sessionId.substring(0, 8) });
      socket.emit('voice:error', {
        error: 'Rate limit exceeded',
        details: undefined
      });
      return;
    }

    const buffer = audioBuffers.get(sessionId);
    if (buffer) {
      buffer.push(Buffer.from(audio));
      scheduleBufferCleanup(sessionId); // Reset timeout
    }

    socket.emit('voice:chunk-received', {
      sessionId,
      size: audio.byteLength,
      timestamp
    });
  });

  // Voice recording end - process with orchestrator
  socket.on('voice:end', async (data: VoiceEndData) => {
    const { sessionId } = data;

    logger.info('Processing voice input (orchestrated)', {
      sessionId: sessionId.substring(0, 8)
    });

    try {
      // Get accumulated audio
      const chunks = audioBuffers.get(sessionId);
      if (!chunks || chunks.length === 0) {
        throw new Error('No audio data received');
      }

      const audioData = Buffer.concat(chunks);
      logger.debug('Audio accumulated', {
        sessionId: sessionId.substring(0, 8),
        chunks: chunks.length,
        totalSize: audioData.length
      });

      // Get session metadata
      const metadata = sessionMetadata.get(sessionId);
      if (!metadata) {
        throw new Error('Session metadata not found');
      }

      // Create voice request
      const request: VoiceRequest = {
        sessionId,
        tenantId: metadata.tenantId,
        audioData,
        format: 'webm',
        customerId: metadata.customerId
      };

      // Process through orchestrator
      const response = await orchestrator.processVoiceRequest(request);

      logger.info('Voice processing complete', {
        sessionId: sessionId.substring(0, 8),
        strategy: response.metadata?.strategy,
        latency: response.metadata?.latency,
        transcription: response.transcription?.substring(0, 50)
      });

      // Send response to client
      socket.emit('voice:transcription', {
        sessionId,
        text: response.transcription,
        confidence: response.metadata?.confidence
      });

      if (response.responseText) {
        socket.emit('voice:assistant:response', {
          sessionId,
          text: response.responseText
        });
      }

      if (response.audioData) {
        socket.emit('voice:response', {
          sessionId,
          audio: response.audioData,
          metadata: response.metadata
        });
      }

      // Cleanup
      audioBuffers.delete(sessionId);
      const timeout = bufferTimeouts.get(sessionId);
      if (timeout) {
        clearTimeout(timeout);
        bufferTimeouts.delete(sessionId);
      }

    } catch (error: any) {
      logger.error('Voice processing failed', {
        sessionId: sessionId.substring(0, 8),
        error: error.message
      });

      socket.emit('voice:error', {
        error: 'Failed to process voice input',
        details: undefined
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    logger.debug('Client disconnected, cleaning up', { userId: socket.user?.id });
    // Cleanup happens via timeouts
  });
}

// Shutdown orchestrator (for testing)
export function shutdownOrchestrator(): void {
  if (orchestratorInstance) {
    orchestratorInstance.shutdown();
    orchestratorInstance = null;
    logger.info('Voice orchestrator shutdown');
  }
}
