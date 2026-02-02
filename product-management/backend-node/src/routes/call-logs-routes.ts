import express, { Request, Response } from 'express';
import { authenticateSession } from '../middleware/auth';
import { getDB } from '../config/database';
import { ObjectId } from 'mongodb';

const router = express.Router();

interface CallLogsQuery {
  status?: 'completed' | 'in-progress' | 'failed';
  channel?: 'voice' | 'chat';
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: string;
  offset?: string;
}

// GET /api/call-logs
// Get list of call logs and chat sessions for the authenticated user/tenant
router.get('/', authenticateSession, async (req: Request, res: Response) => {
  try {
    const { 
      status, 
      channel, 
      startDate, 
      endDate, 
      search,
      limit = '50',
      offset = '0'
    } = req.query as CallLogsQuery;

    const userId = (req.user as any)?.id;
    const tenantId = (req.user as any)?.tenantId || userId;

    console.log('[Call Logs] Query:', { status, channel, startDate, endDate, tenantId });

    const db = getDB();

    // Build filter
    const filter: any = {
      customerId: tenantId
    };

    if (status) {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.startTime = {};
      if (startDate) {
        filter.startTime.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.startTime.$lte = new Date(endDate);
      }
    }

    if (search) {
      // Search in caller number or session ID
      filter.$or = [
        { callerNumber: { $regex: search, $options: 'i' } },
        { sessionId: { $regex: search, $options: 'i' } }
      ];
    }

    // Get voice calls from assistant_calls
    const voiceCalls = channel === 'chat' ? [] : await db.collection('assistant_calls')
      .find(filter)
      .sort({ startTime: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .toArray();

    // Get chat sessions from chat_history (aggregate by sessionId)
    const chatSessions = channel === 'voice' ? [] : await db.collection('chat_history')
      .aggregate([
        {
          $match: {
            customerId: tenantId,
            ...(startDate || endDate ? {
              createdAt: {
                ...(startDate ? { $gte: new Date(startDate) } : {}),
                ...(endDate ? { $lte: new Date(endDate) } : {})
              }
            } : {})
          }
        },
        {
          $group: {
            _id: '$sessionId',
            customerId: { $first: '$customerId' },
            productId: { $first: '$productId' },
            startTime: { $min: '$createdAt' },
            endTime: { $max: '$createdAt' },
            messageCount: { $sum: 1 },
            transcript: {
              $push: {
                speaker: '$speaker',
                text: '$text',
                timestamp: '$createdAt'
              }
            }
          }
        },
        {
          $project: {
            _id: 0,
            sessionId: '$_id',
            customerId: 1,
            productId: 1,
            startTime: 1,
            endTime: 1,
            channel: { $literal: 'chat' },
            status: { $literal: 'completed' },
            messageCount: 1,
            transcript: 1
          }
        },
        { $sort: { startTime: -1 } },
        { $limit: parseInt(limit) },
        { $skip: parseInt(offset) }
      ])
      .toArray();

    // Combine and format results
    const voiceResults = voiceCalls.map(call => ({
      _id: call._id.toString(),
      sessionId: call._id.toString(),
      customerId: call.customerId,
      productId: call.productId,
      callerNumber: call.callerNumber,
      assistantNumber: call.assistantPhoneNumber,
      startTime: call.startTime,
      endTime: call.endTime,
      durationSeconds: call.durationSeconds,
      status: call.status,
      channel: 'voice',
      messageCount: call.transcript?.length || 0
    }));

    const chatResults = chatSessions.map(session => ({
      _id: session.sessionId,
      sessionId: session.sessionId,
      customerId: session.customerId,
      productId: session.productId,
      startTime: session.startTime,
      endTime: session.endTime,
      durationSeconds: Math.floor(
        (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 1000
      ),
      status: session.status,
      channel: session.channel,
      messageCount: session.messageCount
    }));

    // Merge and sort by start time
    const allLogs = [...voiceResults, ...chatResults]
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    // Get total count for pagination
    const totalVoice = channel === 'chat' ? 0 : await db.collection('assistant_calls').countDocuments(filter);
    const totalChat = channel === 'voice' ? 0 : await db.collection('chat_history')
      .distinct('sessionId', {
        customerId: tenantId,
        ...(startDate || endDate ? {
          createdAt: {
            ...(startDate ? { $gte: new Date(startDate) } : {}),
            ...(endDate ? { $lte: new Date(endDate) } : {})
          }
        } : {})
      })
      .then(sessions => sessions.length);

    const total = totalVoice + totalChat;

    console.log('[Call Logs] Returning:', {
      voice: voiceResults.length,
      chat: chatResults.length,
      total: allLogs.length,
      totalCount: total
    });

    return res.json({
      logs: allLogs,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + allLogs.length < total
      }
    });

  } catch (error) {
    console.error('[Call Logs] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch call logs',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

// GET /api/call-logs/:id
// Get a specific call or session with full transcript
router.get('/:id', authenticateSession, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.user as any)?.id;
    const tenantId = (req.user as any)?.tenantId || userId;

    console.log('[Call Log Detail] ID:', id);

    const db = getDB();

    // Try to find as voice call first
    let result = null;
    if (ObjectId.isValid(id)) {
      result = await db.collection('assistant_calls').findOne({
        _id: new ObjectId(id),
        customerId: tenantId
      });

      if (result) {
        return res.json({
          _id: result._id.toString(),
          sessionId: result._id.toString(),
          customerId: result.customerId,
          productId: result.productId,
          callerNumber: result.callerNumber,
          assistantNumber: result.assistantPhoneNumber,
          startTime: result.startTime,
          endTime: result.endTime,
          durationSeconds: result.durationSeconds,
          status: result.status,
          channel: 'voice',
          transcript: result.transcript || [],
          currentIntent: result.currentIntent,
          extractedSlots: result.extractedSlots
        });
      }
    }

    // Try as chat session
    const chatMessages = await db.collection('chat_history')
      .find({
        sessionId: id,
        customerId: tenantId
      })
      .sort({ createdAt: 1 })
      .toArray();

    if (chatMessages.length > 0) {
      const firstMessage = chatMessages[0];
      const lastMessage = chatMessages[chatMessages.length - 1];

      return res.json({
        _id: id,
        sessionId: id,
        customerId: firstMessage.customerId,
        productId: firstMessage.productId,
        startTime: firstMessage.createdAt,
        endTime: lastMessage.createdAt,
        durationSeconds: Math.floor(
          (new Date(lastMessage.createdAt).getTime() - new Date(firstMessage.createdAt).getTime()) / 1000
        ),
        status: 'completed',
        channel: 'chat',
        transcript: chatMessages.map(msg => ({
          speaker: msg.speaker === 'user' ? 'caller' : 'assistant',
          text: msg.text,
          timestamp: msg.createdAt
        })),
        currentIntent: chatMessages[chatMessages.length - 1]?.intent,
        extractedSlots: {}
      });
    }

    return res.status(404).json({ 
      error: 'Call or session not found' 
    });

  } catch (error) {
    console.error('[Call Log Detail] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch call details',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

export default router;
