/**
 * VoIP Provider Media Stream Handler
 * Handles WebSocket connections from VoIP providers (Twilio, Vonage, Bandwidth)
 * for bidirectional audio streaming with initial greeting playback
 */

import { Server, Socket } from 'socket.io';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/database';
import { grpcClient } from '../grpc/client';

interface VoipStreamSocket extends Socket {
  callId?: string;
  provider?: string;
  greetingSent?: boolean;
}

/**
 * Setup VoIP media stream handlers
 * This handles audio streams from VoIP providers (separate from client WebSocket)
 */
export function setupVoipStreamHandlers(io: Server) {
  // Create a separate namespace for VoIP streams
  const voipNamespace = io.of('/voip-stream');
  
  console.log('[VoIP Stream] Namespace initialized at /voip-stream');

  voipNamespace.on('connection', async (socket: VoipStreamSocket) => {
    const callId = socket.handshake.query.callId as string;
    const provider = socket.handshake.query.provider as string || 'unknown';
    
    console.log('[VoIP Stream] 🔌 Provider connected:', {
      socketId: socket.id,
      callId,
      provider
    });

    if (!callId || !ObjectId.isValid(callId)) {
      console.error('[VoIP Stream] ❌ Invalid callId:', callId);
      socket.emit('error', { code: 'INVALID_CALL_ID', message: 'Invalid call ID' });
      socket.disconnect();
      return;
    }

    socket.callId = callId;
    socket.provider = provider;
    socket.greetingSent = false;

    try {
      const db = getDB();
      
      // Load call document to check for greeting
      const call = await db.collection('assistant_calls')
        .findOne({ _id: new ObjectId(callId) });

      if (!call) {
        console.error('[VoIP Stream] ❌ Call not found:', callId);
        socket.emit('error', { code: 'CALL_NOT_FOUND', message: 'Call not found' });
        socket.disconnect();
        return;
      }

      console.log('[VoIP Stream] ✅ Call loaded:', {
        callId,
        hasGreeting: !!call.greetingAudio,
        status: call.status
      });

      // Send greeting as first audio if available
      if (call.greetingAudio && !socket.greetingSent) {
        await sendGreeting(socket, call.greetingAudio, provider);
        socket.greetingSent = true;

        // Clear greeting from DB (already sent)
        await db.collection('assistant_calls').updateOne(
          { _id: new ObjectId(callId) },
          { $unset: { greetingAudio: '' } }
        );
      } else {
        console.log('[VoIP Stream] ℹ️ No greeting to send or already sent');
      }

      // Join room for this call
      socket.join(`voip:${callId}`);

    } catch (error: any) {
      console.error('[VoIP Stream] ❌ Error loading call:', error.message);
      socket.emit('error', { code: 'INIT_ERROR', message: error.message });
    }

    /**
     * Handle incoming audio from VoIP provider (caller speaking)
     */
    socket.on('audio:inbound', async (data: { 
      audioData: string; // Base64 encoded
      format?: string;
      timestamp?: number;
    }) => {
      try {
        if (!socket.callId) {
          console.error('[VoIP Stream] No callId associated with socket');
          return;
        }

        console.log('[VoIP Stream] 🎤 Received audio from caller:', {
          callId: socket.callId,
          audioSize: data.audioData?.length,
          format: data.format || 'unknown'
        });

        // Forward audio to Java VA service for STT + LLM processing
        const response = await grpcClient.processVoiceChunk({
          callId: socket.callId,
          audioChunk: data.audioData,
          format: data.format || 'mulaw'
        });

        // If Java returns TTS response, send it back to caller
        if (response.ttsAudio) {
          console.log('[VoIP Stream] 🔊 Sending TTS response to caller:', {
            callId: socket.callId,
            audioSize: response.ttsAudio.length
          });

          // Convert TTS audio format if needed for provider
          const providerAudio = await convertAudioForProvider(
            response.ttsAudio,
            socket.provider || 'twilio'
          );

          socket.emit('audio:outbound', {
            audioData: providerAudio,
            format: getProviderAudioFormat(socket.provider || 'twilio'),
            timestamp: Date.now()
          });
        }

      } catch (error: any) {
        console.error('[VoIP Stream] ❌ Error processing audio:', error.message);
        socket.emit('error', { 
          code: 'AUDIO_PROCESSING_ERROR', 
          message: error.message 
        });
      }
    });

    /**
     * Handle stream start event
     */
    socket.on('stream:start', () => {
      console.log('[VoIP Stream] ▶️ Stream started:', socket.callId);
    });

    /**
     * Handle stream stop/end event
     */
    socket.on('stream:stop', async () => {
      console.log('[VoIP Stream] ⏹️ Stream stopped:', socket.callId);
      
      if (socket.callId) {
        try {
          const db = getDB();
          await db.collection('assistant_calls').updateOne(
            { _id: new ObjectId(socket.callId) },
            { 
              $set: { 
                status: 'completed',
                endTime: new Date()
              }
            }
          );
        } catch (error) {
          console.error('[VoIP Stream] Error updating call status:', error);
        }
      }
      
      socket.disconnect();
    });

    /**
     * Handle disconnection
     */
    socket.on('disconnect', (reason) => {
      console.log('[VoIP Stream] 🔌 Provider disconnected:', {
        callId: socket.callId,
        reason
      });
    });

    /**
     * Handle errors
     */
    socket.on('error', (error) => {
      console.error('[VoIP Stream] ❌ Socket error:', {
        callId: socket.callId,
        error: error.message || error
      });
    });
  });

  return voipNamespace;
}

/**
 * Send greeting audio to caller via VoIP provider
 */
async function sendGreeting(
  socket: VoipStreamSocket, 
  greetingAudioBase64: string, 
  provider: string
): Promise<void> {
  try {
    console.log('[VoIP Stream] 🎙️ Sending greeting to caller:', {
      callId: socket.callId,
      provider,
      audioSize: greetingAudioBase64.length
    });

    // Convert greeting audio from Java TTS format (WAV, 24kHz) to provider format
    const providerAudio = await convertAudioForProvider(greetingAudioBase64, provider);
    
    // Send greeting audio to provider
    socket.emit('audio:outbound', {
      audioData: providerAudio,
      format: getProviderAudioFormat(provider),
      timestamp: Date.now(),
      isGreeting: true
    });

    console.log('[VoIP Stream] ✅ Greeting sent successfully:', {
      callId: socket.callId,
      convertedSize: providerAudio.length
    });

  } catch (error: any) {
    console.error('[VoIP Stream] ❌ Error sending greeting:', {
      callId: socket.callId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Convert audio from Java TTS format to VoIP provider format
 * Java TTS: WAV, 24kHz, 16-bit PCM (Base64)
 * Twilio: μ-law, 8kHz, 8-bit (Base64)
 * Vonage: PCM, 16kHz, 16-bit (Base64)
 * Bandwidth: μ-law, 8kHz, 8-bit (Base64)
 */
async function convertAudioForProvider(
  audioBase64: string, 
  provider: string
): Promise<string> {
  // TODO: Implement audio format conversion using ffmpeg or sox
  // For now, return as-is (works for testing but may have quality issues)
  
  console.log('[VoIP Stream] ⚠️ Audio format conversion not implemented, returning original');
  console.log('[VoIP Stream] TODO: Convert WAV 24kHz → ' + getProviderAudioFormat(provider));
  
  // In production, you would:
  // 1. Decode Base64 to Buffer
  // 2. Use ffmpeg/sox to resample and convert format
  // 3. Encode back to Base64
  // Example:
  // const audioBuffer = Buffer.from(audioBase64, 'base64');
  // const converted = await resampleAudio(audioBuffer, targetSampleRate, targetFormat);
  // return converted.toString('base64');
  
  return audioBase64;
}

/**
 * Get audio format expected by VoIP provider
 */
function getProviderAudioFormat(provider: string): string {
  switch (provider.toLowerCase()) {
    case 'twilio':
      return 'mulaw/8000'; // μ-law, 8kHz
    case 'vonage':
      return 'pcm/16000'; // PCM, 16kHz
    case 'bandwidth':
      return 'mulaw/8000'; // μ-law, 8kHz
    default:
      return 'mulaw/8000'; // Default to Twilio format
  }
}

export default setupVoipStreamHandlers;
