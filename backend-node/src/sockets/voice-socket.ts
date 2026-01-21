import { Socket } from 'socket.io';
import { AuthenticatedSocket } from '../config/socket';
import { assistantService } from '../services/assistant-service';
import { ttsService } from '../services/tts-service';
import { grpcClient } from '../grpc/client';

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

/**
 * Setup voice streaming handlers for WebSocket
 * Handles real-time voice input streaming from client
 * Integrates with unified AssistantService
 */
export function setupVoiceHandlers(socket: AuthenticatedSocket): void {
  console.log(`[Voice] Setting up voice handlers for user: ${socket.user?.id}`);

  // Handle voice recording start
  socket.on('voice:start', (data: VoiceStartData) => {
    const { sessionId } = data;
    console.log(`[Voice] 🎤 Recording started for session: ${sessionId}`);
    console.log(`[Voice] User: ${socket.user?.email || socket.user?.id}`);
    
    // Initialize audio buffer for this session
    audioBuffers.set(sessionId, []);
    
    // Join a voice-specific room for this session
    const voiceRoom = `voice:${sessionId}`;
    socket.join(voiceRoom);
    
    // Acknowledge start
    socket.emit('voice:started', { 
      sessionId,
      message: 'Voice streaming started. Speak now...'
    });
    
    // Log to server console for testing
    console.log(`[Voice] ✅ Joined voice room: ${voiceRoom}`);
  });

  // Handle incoming audio chunks
  socket.on('voice:chunk', (data: VoiceChunkData) => {
    const { sessionId, audio, timestamp } = data;
    
    // Log chunk reception for testing
    const audioSize = audio.byteLength || (audio as any).length || 0;
    console.log(`[Voice] 📦 Chunk received:`, {
      sessionId: sessionId.substring(0, 8) + '...',
      size: `${audioSize} bytes`,
      timestamp: new Date(timestamp).toISOString(),
      user: socket.user?.email || socket.user?.id
    });

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
    console.log(`[Voice] 🛑 Recording stopped for session: ${sessionId}`);
    
    const voiceRoom = `voice:${sessionId}`;
    socket.leave(voiceRoom);
    
    // Get final audio buffer
    const buffer = audioBuffers.get(sessionId);
    const totalSize = buffer?.reduce((sum, buf) => sum + buf.length, 0) || 0;
    
    console.log(`[Voice] Total audio buffered: ${totalSize} bytes`);
    
    // Process final audio buffer with STT and TTS
    if (buffer && buffer.length > 0 && socket.user) {
      try {
        const audioData = Buffer.concat(buffer);
        
        // Step 1: Transcribe audio using STT
        console.log(`[Voice] Step 1: Transcribing audio...`);
        const transcriptionResponse = await grpcClient.transcribe(sessionId, audioData, 'webm', socket.user.tenantId || 'default');
        const transcription = transcriptionResponse.text || '';
        
        console.log(`[Voice] Transcription: ${transcription}`);
        
        // Send transcription to client
        socket.emit('voice:transcription', { 
          text: transcription, 
          confidence: transcriptionResponse.confidence,
          final: true 
        });
        
        // Step 2: Process through assistant service
        console.log(`[Voice] Step 2: Processing with assistant...`);
        const assistantResponse = await assistantService.processMessage({
          sessionId,
          message: transcription,
          userId: socket.user.id,
          userEmail: socket.user.email,
          tenantId: socket.user.tenantId,
          source: 'voice',
          context: { productId: 'va-service' }
        });
        
        console.log(`[Voice] Assistant response: ${assistantResponse.message.substring(0, 100)}...`);
        
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
        console.log(`[Voice] Step 3: Synthesizing response to audio...`);
        const ttsResponse = await ttsService.synthesize(sessionId, assistantResponse.message, {
          language: 'en-US',
          voiceName: 'en-US-JennyNeural',
          format: 'mp3',
          customerId: socket.user.tenantId || 'default'
        });
        
        console.log(`[Voice] TTS complete: ${ttsResponse.audioData.length} bytes, duration: ${ttsResponse.metadata.durationMs}ms`);
        
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
        
        console.log(`[Voice] ✅ Complete voice conversation cycle finished`);
        
      } catch (error: any) {
        console.error(`[Voice] Error processing voice conversation:`, error);
        socket.emit('voice:error', { 
          error: 'Failed to process voice input',
          details: error.message || error.details
        });
      }
    }
    
    // Clean up buffer
    audioBuffers.delete(sessionId);
    
    // Acknowledge stop
    socket.emit('voice:stopped', {
      sessionId,
      message: 'Voice streaming stopped.',
      totalBytesReceived: totalSize
    });
    
    console.log(`[Voice] ✅ Left voice room: ${voiceRoom}`);
    console.log(`[Voice] Session ${sessionId.substring(0, 8)}... complete`);
  });
  // Handle text-to-speech request (for non-voice TTS)
  socket.on('tts:synthesize', async (data: { sessionId: string; text: string; language?: string; voiceName?: string; format?: string }) => {
    const { sessionId, text, language, voiceName, format } = data;
    
    if (!text || text.trim().length === 0) {
      socket.emit('tts:error', { error: 'Text cannot be empty' });
      return;
    }
    
    console.log(`[TTS] Synthesizing text: "${text.substring(0, 50)}..." for session: ${sessionId}`);
    
    try {
      const ttsResponse = await ttsService.synthesize(sessionId, text, {
        language: language || 'en-US',
        voiceName: voiceName,
        format: format || 'mp3',
        customerId: socket.user?.tenantId || 'default'
      });
      
      console.log(`[TTS] Synthesized ${ttsResponse.audioData.length} bytes`);
      
      socket.emit('tts:audio-ready', {
        sessionId,
        audioData: ttsResponse.audioData.toString('base64'),
        format: ttsResponse.format,
        metadata: ttsResponse.metadata
      });
      
    } catch (error: any) {
      console.error(`[TTS] Synthesis error:`, error);
      socket.emit('tts:error', { 
        error: 'Failed to synthesize audio',
        details: error.message 
      });
    }
  });
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`[Voice] User disconnected: ${socket.user?.email || socket.user?.id}`);
    
    // Clean up any remaining audio buffers for this user's sessions
    for (const [sessionId, buffer] of audioBuffers.entries()) {
      // If this is the user's session, clean it up
      // (In a more sophisticated system, we'd track session ownership)
      if (buffer.length > 0) {
        console.log(`[Voice] Cleaning up abandoned buffer for session: ${sessionId.substring(0, 8)}...`);
        audioBuffers.delete(sessionId);
      }
    }
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error(`[Voice] Socket error for user ${socket.user?.id}:`, error);
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
