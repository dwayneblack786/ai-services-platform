import express, { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/database';

const router = express.Router();

interface UsageUpdate {
  callId: string;
  customerId: string;  // @deprecated - Use tenantId instead. Kept for backward compatibility
  sttSeconds: number;
  ttsCharacters: number;
  llmTokensIn: number;
  llmTokensOut: number;
  provider: string;
  costEstimate: number;
}

// POST /usage/assistant-call
// Receive usage metrics from Java VA service and update MongoDB
router.post('/assistant-call', async (req: Request, res: Response) => {
  try {
    const usage: UsageUpdate = req.body;

    console.log('[Usage Update]', usage);

    if (!usage.callId) {
      return res.status(400).json({ error: 'Missing callId' });
    }

    const db = getDB();

    // Determine if callId is a valid ObjectId or a regular string (UUID)
    let callQuery: any;
    if (ObjectId.isValid(usage.callId) && usage.callId.length === 24) {
      // Use _id for ObjectId format (voice calls)
      callQuery = { _id: new ObjectId(usage.callId) };
    } else {
      // Use sessionId field for UUID format (chat sessions)
      callQuery = { sessionId: usage.callId };
    }

    // Update assistant_calls.usage
    const callUpdateResult = await db.collection('assistant_calls').updateOne(
      callQuery,
      {
        $set: {
          'usage.sttSeconds': usage.sttSeconds,
          'usage.ttsCharacters': usage.ttsCharacters,
          'usage.llmTokensIn': usage.llmTokensIn,
          'usage.llmTokensOut': usage.llmTokensOut,
          'usage.costEstimate': usage.costEstimate,
          'usage.lastUpdated': new Date()
        }
      }
    );

    if (callUpdateResult.matchedCount === 0) {
      console.warn('[Usage Update] Call not found:', usage.callId);
      return res.status(404).json({ error: 'Call not found' });
    }

    console.log('[Usage Update] Updated assistant_calls for:', usage.callId);

    // Update tenant subscription usage for billing (customerId is legacy field, mapped to tenantId)
    if (usage.customerId) {
      await db.collection('subscriptions').updateOne(
        { 
          customerId: usage.customerId,
          status: 'active'
        },
        {
          $inc: {
            'usage.sttSeconds': usage.sttSeconds,
            'usage.ttsCharacters': usage.ttsCharacters,
            'usage.llmTokensIn': usage.llmTokensIn,
            'usage.llmTokensOut': usage.llmTokensOut,
            'usage.totalCost': usage.costEstimate
          },
          $set: {
            'usage.lastUpdated': new Date()
          }
        }
      );

      console.log('[Usage Update] Updated subscription usage for customer:', usage.customerId);
    }

    return res.status(200).json({ 
      success: true,
      message: 'Usage updated successfully',
      callId: usage.callId
    });

  } catch (error) {
    console.error('[Usage Update] Error:', error);
    return res.status(500).json({ error: 'Internal server error updating usage' });
  }
});

// GET /usage/assistant-call/:callId
// Get usage metrics for a specific call
router.get('/assistant-call/:callId', async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;

    const db = getDB();

    // Determine if callId is a valid ObjectId or a regular string (UUID)
    let callQuery: any;
    if (ObjectId.isValid(callId) && callId.length === 24) {
      callQuery = { _id: new ObjectId(callId) };
    } else {
      callQuery = { sessionId: callId };
    }

    const call = await db.collection('assistant_calls').findOne(
      callQuery,
      { projection: { usage: 1, customerId: 1 } }
    );

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    return res.json({
      callId,
      customerId: call.customerId,
      usage: call.usage || {
        sttSeconds: 0,
        ttsCharacters: 0,
        llmTokensIn: 0,
        llmTokensOut: 0
      }
    });

  } catch (error) {
    console.error('[Usage Get] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
