import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { streamRateLimiter, trackTokenUsage } from '../middleware/rateLimiter';
import { getDB } from '../config/database';
import { javaVAClient } from '../services/apiClient';
import fetch from 'node-fetch';

const router = express.Router();

interface ChatSessionRequest {
  customerId: string;
}

interface ChatMessageRequest {
  sessionId: string;
  message: string;
}

interface ChatResponse {
  sessionId: string;
  message: string;
  intent?: string;
  extractedSlots?: any;
  requiresAction?: boolean;
  suggestedAction?: string;
  messages?: string[];
}

// POST /chat/session
// Initialize a new chat session
router.post('/session', authenticateToken, async (req: Request, res: Response) => {
  try {
    const customerId = (req.user as any)?.tenantId || (req.user as any)?.id;
    const productId = req.body.productId || 'va-service'; // Default to VA service
    const forceNew = req.body.forceNew === true; // Allow forcing new session

    if (!customerId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getDB();
    
    // Try to find assistant_channels for this customer
    // First try with exact productId match, then fallback to any channel with chat enabled
    let channels = await db.collection('assistant_channels').findOne({ 
      customerId,
      productId,
      'chat.enabled': true
    });

    // If no match with productId, try to find any channel for this customer with chat enabled
    if (!channels) {
      console.log('[Chat Session] No channel found with productId:', productId);
      console.log('[Chat Session] Trying fallback query for customerId:', customerId);
      
      channels = await db.collection('assistant_channels').findOne({ 
        customerId,
        'chat.enabled': true
      });
      
      if (channels) {
        console.log('[Chat Session] Found fallback channel with productId:', channels.productId);
      }
    }

    if (!channels || !channels.chat?.enabled) {
      console.log('[Chat Session] No enabled chat channel found for customer:', customerId);
      return res.status(403).json({ 
        error: 'Chat channel is not enabled for this customer/product',
        details: 'Please configure your assistant channels in the product configuration page'
      });
    }

    // Use the productId from the found channel (actual ObjectId from MongoDB)
    const actualProductId = channels.productId || productId;

    // Check if customer has an active session (unless forcing new)
    if (!forceNew) {
      try {
        const activeSessionCheck = await javaVAClient.get(
          `/chat/active-session/${customerId}`,
          { timeout: 3000 }
        );
        
        if (activeSessionCheck.data.hasActiveSession === 'true') {
          const existingSessionId = activeSessionCheck.data.sessionId;
          console.log('[Chat Session] Customer has active session:', existingSessionId);
          
          // Get history for existing session
          try {
            const historyResponse = await javaVAClient.get(
              `/chat/history/${existingSessionId}`,
              { timeout: 5000 }
            );
            
            return res.json({
              sessionId: existingSessionId,
              customerId,
              productId: actualProductId,
              status: 'resumed',
              message: 'Resumed existing chat session',
              messages: historyResponse.data.messages || [],
              chatConfig: {
                greeting: channels.chat.greeting || 'Welcome back! How can I help you?',
                typingIndicator: channels.chat.typingIndicator !== false,
                maxTurns: channels.chat.maxTurns || 20,
                showIntent: channels.chat.showIntent || false
              }
            });
          } catch (historyError) {
            console.error('[Chat Session] Error fetching history:', historyError);
            // Continue to create new session if history fetch fails
          }
        }
      } catch (error) {
        console.log('[Chat Session] No active session found, creating new');
      }
    }

    console.log('[Chat Session] Starting new session for customer:', customerId, 'product:', actualProductId);
    console.log('[Chat Session] Chat config loaded:', {
      hasCustomPrompts: !!channels.chat.customPrompts,
      hasRagConfig: !!channels.chat.ragConfig,
      hasPromptContext: !!channels.chat.promptContext
    });

    // Call Java VA service to initialize session
    // Java service will fetch full configuration from MongoDB via ConfigurationService
    const javaResponse = await javaVAClient.post(
      '/chat/session',
      { 
        customerId,
        productId: actualProductId 
      },
      { timeout: 5000 },
      () => ({
        sessionId: `offline-${Date.now()}`,
        greeting: 'I apologize, but our AI assistant is temporarily unavailable. Please try again in a few moments.'
      })
    );

    const { sessionId, greeting } = javaResponse.data;

    console.log('[Chat Session] Created session:', sessionId);
    console.log('[Chat Session] Greeting from Java:', greeting);

    // Extract actual greeting text if it's wrapped in JSON
    let actualGreeting = greeting || channels.chat.greeting || 'Hi! How can I help you today?';
    
    if (typeof actualGreeting === 'string') {
      try {
        // Try to parse as JSON in case it's wrapped
        const parsed = JSON.parse(actualGreeting);
        
        // Handle different JSON formats
        if (parsed.greeting) {
          actualGreeting = parsed.greeting;
        } else if (parsed.response) {
          actualGreeting = parsed.response;
        } else if (parsed.message) {
          actualGreeting = parsed.message;
        }
      } catch (e) {
        // Not JSON, use as-is
      }
    } else if (typeof actualGreeting === 'object' && actualGreeting !== null) {
      // Already an object, extract greeting
      actualGreeting = actualGreeting.greeting || actualGreeting.response || actualGreeting.message || 'Hi! How can I help you today?';
    }
    
    console.log('[Chat Session] Extracted greeting:', actualGreeting);

    // Include chat configuration in response
    // Use greeting from Java (LLM response) if available, otherwise fallback to DB config
    const response = {
      ...javaResponse.data,
      chatConfig: {
        greeting: actualGreeting,
        typingIndicator: channels.chat.typingIndicator !== false,
        maxTurns: channels.chat.maxTurns || 20,
        showIntent: channels.chat.showIntent || false
      },
      status: 'initialized',
      message: 'Chat session started with configuration loaded from MongoDB'
    };
    
    // Set session ID in cookie (httpOnly for security)
    res.cookie('chatSessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    return res.json(response);

  } catch (error) {
    console.error('[Chat Session] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: javaVAClient.getCircuitState() === 'OPEN' 
        ? 'Service temporarily unavailable' 
        : 'Please try again'
    });
  }
});

// POST /chat/message
// Send a message in an active chat session
router.post('/message', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { sessionId, message }: ChatMessageRequest = req.body;

    console.log('[Chat Message]', { sessionId, messageLength: message?.length });

    if (!sessionId || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields: sessionId and message' 
      });
    }

    // Forward to Java VA service
    const javaResponse = await javaVAClient.post<ChatResponse>(
      '/chat/message',
      { sessionId, message },
      { timeout: 30000 },
      () => ({
        sessionId,
        message: 'I apologize, but I\'m temporarily unable to process your message. Please try again in a moment.',
        intent: 'system_error',
        requiresAction: false
      })
    );

    const response = javaResponse.data;

    console.log('[Chat Message] Response:', {
      sessionId: response.sessionId,
      intent: response.intent,
      requiresAction: response.requiresAction
    });

    return res.json(response);

  } catch (error) {
    console.error('[Chat Message] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to process message',
      circuitState: javaVAClient.getCircuitState()
    });
  }
});

// GET /chat/message/stream
// Stream chat messages with SSE (Server-Sent Events)
router.get('/message/stream', authenticateToken, streamRateLimiter, async (req: Request, res: Response) => {
  try {
    const { sessionId, message } = req.query;

    console.log('[Chat Stream]', { sessionId, messageLength: (message as string)?.length });

    if (!sessionId || !message) {
      return res.status(400).json({ 
        error: 'Missing required query params: sessionId and message' 
      });
    }

    const userId = (req as any).user?.id || (req as any).user?.email || 'anonymous';
    let tokenCount = 0;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Forward to Java VA service SSE endpoint
    const javaUrl = `${process.env.JAVA_VA_SERVICE_URL || 'http://localhost:8136'}/chat/message/stream?sessionId=${sessionId}&message=${encodeURIComponent(message as string)}`;
    
    console.log('[Chat Stream] Connecting to Java SSE:', javaUrl);

    const javaResponse = await fetch(javaUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
      },
    });

    if (!javaResponse.ok) {
      console.error('[Chat Stream] Java service error:', javaResponse.status);
      res.write(`event: error\ndata: ${JSON.stringify({ error: 'Service error' })}\n\n`);
      res.end();
      return;
    }

    console.log('[Chat Stream] Connected to Java SSE, streaming...');

    let streamClosed = false;

    // Stream response from Java to client
    javaResponse.body?.on('data', (chunk: Buffer) => {
      if (!streamClosed) {
        // Count tokens (rough estimate - each "token" event)
        const chunkStr = chunk.toString();
        if (chunkStr.includes('event: token')) {
          tokenCount++;
        }
        res.write(chunk);
      }
    });

    javaResponse.body?.on('end', () => {
      if (!streamClosed) {
        console.log('[Chat Stream] Stream completed');
        streamClosed = true;
        
        // Track token usage for rate limiting
        trackTokenUsage(userId, tokenCount);
        
        res.end();
      }
    });

    javaResponse.body?.on('error', (error: Error) => {
      if (!streamClosed) {
        console.error('[Chat Stream] Stream error:', error);
        streamClosed = true;
        res.write(`event: error\ndata: ${JSON.stringify({ error: 'Stream error' })}\n\n`);
        res.end();
      }
    });

    // Handle client disconnect
    req.on('close', () => {
      console.log('[Chat Stream] Client disconnected');
      streamClosed = true;
      
      // Track token usage even on disconnect
      if (tokenCount > 0) {
        trackTokenUsage(userId, tokenCount);
      }
    });

  } catch (error) {
    console.error('[Chat Stream] Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to stream message',
        circuitState: javaVAClient.getCircuitState()
      });
    }
  }
});

// POST /chat/end
// End a chat session
router.post('/end', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;

    console.log('[Chat End]', { sessionId });

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }

    // Call Java VA service to end session
    await javaVAClient.post(
      '/chat/end',
      null,
      {
        params: { sessionId },
        timeout: 5000
      }
    );

    console.log('[Chat End] Session ended:', sessionId);

    // Clear session cookie
    res.clearCookie('chatSessionId');

    return res.json({ 
      success: true,
      message: 'Chat session ended'
    });

  } catch (error) {
    console.error('[Chat End] Error:', error);
    
    // Even if Java service fails, clear cookie and consider it ended
    res.clearCookie('chatSessionId');
    console.log('[Chat End] Session marked as ended (with errors)');
    return res.json({ 
      success: true,
      message: 'Chat session ended'
    });
  }
});

// GET /chat/history/:sessionId
// Get conversation history for a session from MongoDB
router.get('/history/:sessionId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    console.log('[Chat History]', { sessionId });

    // Call Java VA service to get history from MongoDB
    const javaResponse = await javaVAClient.get(
      `/chat/history/${sessionId}`,
      { timeout: 5000 },
      () => ({ messages: [], sessionId })
    );

    return res.json(javaResponse.data);

  } catch (error) {
    console.error('[Chat History] Error:', error);
    return res.status(500).json({ error: 'Failed to retrieve history' });
  }
});

// GET /chat/rate-limit/stats
// Get rate limiting statistics for current user (or all users if admin)
router.get('/rate-limit/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.email || 'anonymous';
    const { getUserStats, getRateLimiterConfig } = await import('../middleware/rateLimiter');
    
    const userStats = getUserStats(userId);
    
    // Only admins can see global stats
    const isAdmin = (req as any).user?.role === 'admin';
    const response: any = {
      userId,
      stats: userStats
    };
    
    if (isAdmin) {
      response.global = getRateLimiterConfig();
    }
    
    res.json(response);
  } catch (error) {
    console.error('[Chat Rate Limit Stats] Error:', error);
    res.status(500).json({ error: 'Failed to get rate limit stats' });
  }
});

export default router;
