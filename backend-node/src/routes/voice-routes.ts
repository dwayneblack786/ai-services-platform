import express, { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/database';
import { javaVAClient } from '../services/apiClient';
import { VoipAdapterFactory } from '../adapters/voip/adapter-factory';
import { BaseVoipAdapter, CallControlResponse } from '../adapters/voip/base-adapter';

const router = express.Router();

interface BusinessHoursDay {
  open: string | null;
  close: string | null;
}

interface BusinessHours {
  timezone: string;
  monday?: BusinessHoursDay;
  tuesday?: BusinessHoursDay;
  wednesday?: BusinessHoursDay;
  thursday?: BusinessHoursDay;
  friday?: BusinessHoursDay;
  saturday?: BusinessHoursDay;
  sunday?: BusinessHoursDay;
}

interface VoiceSettings {
  language: string;
  voiceId: string;
  speechRate: number;
}

interface AssistantSettings {
  _id?: ObjectId;
  customerId: string;  // @deprecated - Use tenantId instead
  phoneEnabled: boolean;
  phoneNumber: string;
  fallbackNumber?: string | null;
  businessHours?: BusinessHours;
  voice?: VoiceSettings;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AssistantCall {
  _id?: ObjectId;
  customerId: string;  // @deprecated - Use tenantId instead
  assistantPhoneNumber: string;
  callerNumber: string;
  startTime: Date;
  endTime?: Date | null;
  durationSeconds?: number | null;
  status: 'in_progress' | 'completed' | 'missed' | 'forwarded' | 'failed';
  endedBy?: 'caller' | 'assistant' | 'system' | null;
  forwardedTo?: string | null;
  usage?: {
    sttSeconds?: number;
    ttsCharacters?: number;
    llmTokensIn?: number;
    llmTokensOut?: number;
  };
  transcript?: Array<{
    speaker: 'caller' | 'assistant';
    text: string;
    timestamp: number;
  }>;
}

// Helper: Check if current time is within business hours
function isWithinBusinessHours(businessHours?: BusinessHours): boolean {
  if (!businessHours) {
    return true; // If no business hours set, assume always open
  }

  const now = new Date();
  const timezone = businessHours.timezone || 'UTC';
  
  // Get current time in the specified timezone
  const currentTime = now.toLocaleString('en-US', { timeZone: timezone });
  const currentDate = new Date(currentTime);
  
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = dayNames[currentDate.getDay()] as keyof BusinessHours;
  
  const dayHours = businessHours[currentDay] as BusinessHoursDay | undefined;
  
  if (!dayHours?.open || !dayHours.close) {
    return false; // Closed if no hours defined for this day
  }

  // Parse current time
  const currentHour = currentDate.getHours();
  const currentMinute = currentDate.getMinutes();
  const currentMinutes = currentHour * 60 + currentMinute;

  // Parse open time (format: "HH:MM")
  const [openHour, openMinute] = dayHours.open.split(':').map(Number);
  const openMinutes = openHour * 60 + openMinute;

  // Parse close time (format: "HH:MM")
  const [closeHour, closeMinute] = dayHours.close.split(':').map(Number);
  const closeMinutes = closeHour * 60 + closeMinute;

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

// POST /voice/incoming
// Universal webhook handler for any VoIP provider
// Supports Twilio, Vonage, Bandwidth, and more via adapter pattern
router.post('/incoming', async (req: Request, res: Response) => {
  try {
    // Auto-detect VoIP provider or use explicit provider query param
    const explicitProvider = req.query.provider as string;
    const adapter: BaseVoipAdapter = explicitProvider 
      ? VoipAdapterFactory.getAdapter(explicitProvider)
      : VoipAdapterFactory.detectProvider(req.body, req.headers);

    console.log('[Voice Incoming] Using provider:', adapter.getProviderName());

    // Parse provider-specific webhook to standard format
    const callData = adapter.parseIncomingCall(req.body, req.headers);
    console.log('[Voice Incoming]', { 
      provider: adapter.getProviderName(),
      callId: callData.callId,
      from: callData.from,
      to: callData.to 
    });

    const db = getDB();

    // 1. Lookup assistant channels by phone number
    const channels = await db.collection('assistant_channels')
      .findOne({ 
        'voice.phoneNumber': callData.to,
        'voice.enabled': true
      });

    if (!channels) {
      console.warn('[Voice Incoming] Phone number not configured or voice disabled:', callData.to);
      const errorResponse: CallControlResponse = {
        action: 'answer',
        message: 'This number is not configured.'
      };
      
      const providerResponse = adapter.generateCallResponse(errorResponse);
      res.set('Content-Type', adapter.getProviderName() === 'vonage' ? 'application/json' : 'application/xml');
      return res.send(providerResponse);
    }

    const voiceConfig = channels.voice;
    console.log('[Voice Incoming] Found voice channel for customer:', channels.customerId);

    // 2. Check business hours
    if (!isWithinBusinessHours(voiceConfig?.businessHours)) {
      console.log('[Voice Incoming] Outside business hours');
      
      const response: CallControlResponse = voiceConfig?.fallbackNumber
        ? { action: 'forward', forwardTo: voiceConfig.fallbackNumber }
        : { action: 'answer', message: 'We are currently closed. Please call back during business hours.' };
      
      const providerResponse = adapter.generateCallResponse(response);
      res.set('Content-Type', adapter.getProviderName() === 'vonage' ? 'application/json' : 'application/xml');
      return res.send(providerResponse);
    }

    // 3. Create call log entry
    const callDocument: AssistantCall = {
      customerId: channels.customerId,
      assistantPhoneNumber: callData.to,
      callerNumber: callData.from,
      startTime: callData.timestamp,
      status: 'in_progress',
      usage: {
        sttSeconds: 0,
        ttsCharacters: 0,
        llmTokensIn: 0,
        llmTokensOut: 0
      },
      transcript: []
    };

    const result = await db.collection<AssistantCall>('assistant_calls')
      .insertOne(callDocument);

    const mongoCallId = result.insertedId.toString();
    console.log('[Voice Incoming] Created call log:', mongoCallId);

    // 4. Start streaming audio to Java VA service
    const streamUrl = `${process.env.PUBLIC_URL || 'https://your-domain.com'}/voice/stream?callId=${mongoCallId}&provider=${adapter.getProviderName()}`;
    
    const streamResponse: CallControlResponse = {
      action: 'stream',
      streamUrl: streamUrl,
      callId: mongoCallId
    };

    const providerResponse = adapter.generateCallResponse(streamResponse);
    console.log('[Voice Incoming] Streaming to:', streamUrl);
    
    res.set('Content-Type', adapter.getProviderName() === 'vonage' ? 'application/json' : 'application/xml');
    return res.send(providerResponse);

  } catch (error) {
    console.error('[Voice Incoming] Error:', error);
    
    // Attempt to send error response in appropriate format
    try {
      const adapter = VoipAdapterFactory.detectProvider(req.body, req.headers);
      const errorResponse: CallControlResponse = {
        action: 'answer',
        message: 'An error occurred processing your call. Please try again later.'
      };
      
      const providerResponse = adapter.generateCallResponse(errorResponse);
      res.set('Content-Type', adapter.getProviderName() === 'vonage' ? 'application/json' : 'application/xml');
      return res.send(providerResponse);
    } catch {
      // Fallback to plain text error
      return res.status(500).send('An error occurred processing your call.');
    }
  }
});

// POST /voice/stream
// Handle streaming audio chunks during an active call
router.post('/stream', async (req: Request, res: Response) => {
  try {
    const { callId, audioChunk } = req.body;

    console.log('[Voice Stream]', { callId, audioChunkSize: audioChunk?.length });

    if (!callId || !audioChunk) {
      console.error('[Voice Stream] Missing required fields');
      return res.status(400).json({ 
        error: 'Missing required fields: callId and audioChunk' 
      });
    }

    // Validate callId format
    if (!ObjectId.isValid(callId)) {
      console.error('[Voice Stream] Invalid callId format:', callId);
      return res.status(400).json({ 
        error: 'Invalid callId format' 
      });
    }

    const db = getDB();

    // Verify call exists and is in progress
    const call = await db.collection<AssistantCall>('assistant_calls')
      .findOne({ _id: new ObjectId(callId) });

    if (!call) {
      console.error('[Voice Stream] Call not found:', callId);
      return res.status(404).json({ 
        error: 'Call not found' 
      });
    }

    if (call.status !== 'in_progress') {
      console.warn('[Voice Stream] Call not in progress:', callId, call.status);
      return res.status(400).json({ 
        error: 'Call is not in progress' 
      });
    }

    // Forward audio to Java VA service
    console.log('[Voice Stream] Forwarding to Java VA service');
    const javaResponse = await javaVAClient.post(
      '/voice/process',
      {
        callId,
        audioChunk
      },
      { timeout: 10000 },
      () => ({
        ttsAudio: null,
        message: 'Voice service temporarily unavailable'
      })
    );

    // Java returns text or audio
    const { ttsAudio } = javaResponse.data;

    if (!ttsAudio) {
      console.warn('[Voice Stream] No TTS audio returned from Java service');
      return res.json({ 
        ttsAudio: null 
      });
    }

    console.log('[Voice Stream] Returning TTS audio, size:', (ttsAudio as Buffer).length);

    // Update call usage stats (optional - track processing)
    await db.collection<AssistantCall>('assistant_calls').updateOne(
      { _id: new ObjectId(callId) },
      { 
        $inc: { 
          'usage.sttSeconds': 1 // Increment by estimated seconds
        }
      }
    );

    // Send audio back to caller
    return res.json({ ttsAudio });

  } catch (error) {
    console.error('[Voice Stream] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error processing audio stream',
      circuitState: javaVAClient.getCircuitState()
    });
  }
});

// POST /voice/end
// Mark a call as ended and finalize metrics
router.post('/end', async (req: Request, res: Response) => {
  try {
    const { callId, durationSeconds, endedBy } = req.body;

    console.log('[Voice End]', { callId, durationSeconds, endedBy });

    if (!callId || durationSeconds === undefined || !endedBy) {
      console.error('[Voice End] Missing required fields');
      return res.status(400).json({ 
        error: 'Missing required fields: callId, durationSeconds, and endedBy' 
      });
    }

    // Validate callId format
    if (!ObjectId.isValid(callId)) {
      console.error('[Voice End] Invalid callId format:', callId);
      return res.status(400).json({ 
        error: 'Invalid callId format' 
      });
    }

    // Validate endedBy value
    const validEndedBy = ['caller', 'assistant', 'system'];
    if (!validEndedBy.includes(endedBy)) {
      console.error('[Voice End] Invalid endedBy value:', endedBy);
      return res.status(400).json({ 
        error: 'Invalid endedBy value. Must be one of: caller, assistant, system' 
      });
    }

    // Validate durationSeconds is a positive number
    if (typeof durationSeconds !== 'number' || durationSeconds < 0) {
      console.error('[Voice End] Invalid durationSeconds:', durationSeconds);
      return res.status(400).json({ 
        error: 'durationSeconds must be a positive number' 
      });
    }

    const db = getDB();

    // Update call record
    const result = await db.collection<AssistantCall>('assistant_calls').updateOne(
      { _id: new ObjectId(callId) },
      {
        $set: {
          endTime: new Date(),
          durationSeconds,
          endedBy: endedBy as 'caller' | 'assistant' | 'system',
          status: 'completed'
        }
      }
    );

    if (result.matchedCount === 0) {
      console.error('[Voice End] Call not found:', callId);
      return res.status(404).json({ 
        error: 'Call not found' 
      });
    }

    console.log('[Voice End] Call ended successfully:', callId);
    return res.status(200).json({ 
      success: true,
      message: 'Call ended successfully' 
    });

  } catch (error) {
    console.error('[Voice End] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error ending call' 
    });
  }
});

export default router;
