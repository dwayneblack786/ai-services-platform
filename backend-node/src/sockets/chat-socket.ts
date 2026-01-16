import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../config/socket';
import { getDB } from '../config/database';
import { javaVAClient } from '../services/apiClient';
import logger, { createModuleLogger } from '../utils/logger';

const socketLogger = createModuleLogger('chat-socket');

interface ChatMessageData {
  sessionId: string;
  message: string;
}

interface TypingData {
  sessionId: boolean;
  isTyping: boolean;
}

interface ChatResponse {
  sessionId: string;
  message: string;
  intent?: string;
  requiresAction?: boolean;
  suggestedAction?: string;
  messages?: string[];
}

/**
 * Setup chat event handlers on an authenticated socket
 * Called by the main Socket.IO connection handler
 */
export function setupChatHandlers(socket: AuthenticatedSocket): void {
  const user = socket.user;
  
  if (!user) {
    socketLogger.error('No user on socket, disconnecting', { socketId: socket.id });
    socket.disconnect();
    return;
  }

  socketLogger.info('Setting up chat handlers', { userId: user.id, email: user.email, socketId: socket.id });

    // Join session-specific room when chat session is initialized
    socket.on('chat:join-session', (sessionId: string) => {
      socket.join(`session:${sessionId}`);
      socketLogger.info('User joined session', { email: user.email, sessionId, socketId: socket.id });
      
      // Notify others in the session (for multi-user support future)
      socket.to(`session:${sessionId}`).emit('chat:user-joined', {
        userId: user.id,
        email: user.email,
        timestamp: new Date()
      });
    });

    // Handle sending a message
    socket.on('chat:send-message', async (data: ChatMessageData) => {
      const { sessionId, message } = data;
      try {
        if (!sessionId || !message) {
          socket.emit('chat:error', { 
            error: 'Missing required fields: sessionId and message' 
          });
          return;
        }

        socketLogger.debug('Message received', { 
          sessionId, 
          messageLength: message.length,
          userId: user.id,
          socketId: socket.id 
        });

        // Echo user's message immediately for instant feedback
        socket.emit('chat:message-sent', {
          role: 'user',
          content: message,
          timestamp: new Date()
        });

        // Show typing indicator for assistant
        socket.emit('chat:typing', { isTyping: true });

        // Forward to Java VA service
        const javaResponse = await javaVAClient.post(
          `/chat/message`,
          { sessionId, message },
          { timeout: 30000 },
          () => ({
            sessionId,
            message: 'I apologize, but I\'m temporarily unable to process your message. Our service will be back shortly.',
            intent: 'system_error',
            requiresAction: false
          })
        );

        // Stop typing indicator
        socket.emit('chat:typing', { isTyping: false });

        const response = javaResponse.data as ChatResponse;

        socketLogger.debug('Response from Java VA', {
          sessionId: response.sessionId,
          intent: response.intent,
          requiresAction: response.requiresAction,
          socketId: socket.id
        });

        // Send assistant's response
        socket.emit('chat:message-received', {
          role: 'assistant',
          content: response.message,
          timestamp: new Date(),
          intent: response.intent,
          requiresAction: response.requiresAction,
          suggestedAction: response.suggestedAction
        });

        // Handle multiple messages (proactive follow-ups)
        if (response.messages && Array.isArray(response.messages)) {
          for (const msg of response.messages) {
            socket.emit('chat:message-received', {
              role: 'assistant',
              content: msg,
              timestamp: new Date()
            });
          }
        }

      } catch (error: any) {
        socketLogger.error('Error processing message', { 
          sessionId, 
          userId: user.id,
          error: error.message,
          stack: error.stack,
          socketId: socket.id
        });
        
        // Stop typing indicator
        socket.emit('chat:typing', { isTyping: false });

        // Send error to client
        socket.emit('chat:error', {
          error: 'Failed to process message',
          canRetry: javaVAClient.getCircuitState() !== 'OPEN',
          circuitState: javaVAClient.getCircuitState()
        });
      }
    });

    // Handle typing indicator from client
    socket.on('chat:typing', (data: TypingData) => {
      const { sessionId, isTyping } = data;
      
      // Broadcast typing status to others in the session
      socket.to(`session:${sessionId}`).emit('chat:user-typing', {
        userId: user.id,
        email: user.email,
        isTyping,
        timestamp: new Date()
      });
    });

    // Handle leaving session
    socket.on('chat:leave-session', (sessionId: string) => {
      socket.leave(`session:${sessionId}`);
      socketLogger.info('User left session', { sessionId, userId: user.id, socketId: socket.id });
      
      // Notify others
      socket.to(`session:${sessionId}`).emit('chat:user-left', {
        userId: user.id,
        email: user.email,
        timestamp: new Date()
      });
    });

    // Handle session end
    socket.on('chat:end-session', async (sessionId: string) => {
      try {
        console.log('[Chat Socket] Ending session:', sessionId);

        // Call Java VA service to end session
        await javaVAClient.post(
          `/chat/end`,
          null,
          {
            params: { sessionId },
            timeout: 5000
          }
        );

        socket.emit('chat:session-ended', {
          sessionId,
          timestamp: new Date()
        });

        // Leave the session room
        socket.leave(`session:${sessionId}`);

      } catch (error) {
        console.error('[Chat Socket] Error ending session:', error);
        socket.emit('chat:error', {
          error: 'Failed to end session properly'
        });
      }
    });

    // Handle message history request
    socket.on('chat:get-history', async (sessionId: string) => {
      try {
        console.log('[Chat Socket] Fetching history for session:', sessionId);

        const historyResponse = await javaVAClient.get(
          `/chat/history/${sessionId}`,
          { timeout: 5000 },
          () => ({ messages: [], sessionId })
        );

        socket.emit('chat:history', {
          sessionId,
          messages: historyResponse.data.messages || [],
          timestamp: new Date()
        });

      } catch (error) {
        console.error('[Chat Socket] Error fetching history:', error);
        socket.emit('chat:error', {
          error: 'Failed to retrieve chat history'
        });
      }
    });

    // Handle ping for connection health check
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });
}

export default setupChatHandlers;
