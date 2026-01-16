import express, { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/database';
import { javaVAClient } from '../services/apiClient';

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

// Helper: Generate TwiML response
function generateTwiML(action: 'say' | 'redirect' | 'stream', payload: string): string {
  switch (action) {
    case 'say':
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>${payload}</Say>
</Response>`;
    case 'redirect':
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>${payload}</Dial>
</Response>`;
    case 'stream':
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${payload}" />
  </Connect>
</Response>`;
    default:
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>An error occurred.</Say>
</Response>`;
  }
}

// POST /voice/incoming
// Handle incoming phone call webhook from telephony provider
router.post('/incoming', async (req: Request, res: Response) => {
  try {
    const dialedNumber = req.body.To;
    const callerNumber = req.body.From;
    const callSid = req.body.CallSid;

    console.log('[Voice Incoming]', { dialedNumber, callerNumber, callSid });

    if (!dialedNumber || !callerNumber) {
      console.error('[Voice Incoming] Missing required fields');
      res.set('Content-Type', 'application/xml');
      return res.send(generateTwiML('say', 'Invalid request. Missing phone number information.'));
    }

    const db = getDB();

    // 1. Lookup assistant channels by phone number
    const channels = await db.collection('assistant_channels')
      .findOne({ 
        'voice.phoneNumber': dialedNumber,
        'voice.enabled': true
      });

    if (!channels) {
      console.warn('[Voice Incoming] Phone number not configured or voice disabled:', dialedNumber);
      res.set('Content-Type', 'application/xml');
      return res.send(generateTwiML('say', 'This number is not configured.'));
    }

    const voiceConfig = channels.voice;
    console.log('[Voice Incoming] Found voice channel for customer:', channels.customerId);

    // 2. Check business hours
    if (!isWithinBusinessHours(voiceConfig?.businessHours)) {
      console.log('[Voice Incoming] Outside business hours, redirecting to fallback');
      if (voiceConfig?.fallbackNumber) {
        res.set('Content-Type', 'application/xml');
        return res.send(generateTwiML('redirect', voiceConfig.fallbackNumber));
      } else {
        res.set('Content-Type', 'application/xml');
        return res.send(generateTwiML('say', 'We are currently closed. Please call back during business hours.'));
      }
    }

    // 3. Create call log entry
    const callDocument: AssistantCall = {
      customerId: channels.customerId,
      assistantPhoneNumber: dialedNumber,
      callerNumber,
      startTime: new Date(),
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

    const callId = result.insertedId.toString();
    console.log('[Voice Incoming] Created call log:', callId);

    // 5. Start streaming audio to Java VA service
    const javaResponseUrl = `/voice/session?callId=${callId}`;
    console.log('[Voice Incoming] Streaming to Java VA:', javaResponseUrl);

    res.set('Content-Type', 'application/xml');
    return res.send(generateTwiML('stream', javaResponseUrl));

  } catch (error) {
    console.error('[Voice Incoming] Error:', error);
    res.set('Content-Type', 'application/xml');
    return res.send(generateTwiML('say', 'An error occurred processing your call. Please try again later.'));
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
