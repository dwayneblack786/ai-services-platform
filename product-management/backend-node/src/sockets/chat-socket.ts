import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../config/socket';
import { getDB } from '../config/database';
import { javaVAClient } from '../services/apiClient';
import logger, { createModuleLogger } from '../utils/logger';
import { assistantService } from '../services/assistant-service';
import { promptService } from '../services/prompt.service';

const socketLogger = createModuleLogger('chat-socket');

interface ChatMessageData {
  sessionId: string;
  message: string;
  isMenuSelection?: boolean; // Flag to indicate this is a menu option selection
  selectedPromptId?: string; // The ID of the selected prompt
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
      const { sessionId, message, isMenuSelection, selectedPromptId } = data;
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
          isMenuSelection,
          selectedPromptId,
          socketId: socket.id
        });

        // If this is a menu selection, validate it
        let promptId = selectedPromptId;
        if (isMenuSelection && !promptId) {
          // Try to validate the message as a prompt name
          const validation = await promptService.validatePromptSelection(
            message,
            user.tenantId,
            'va-service',
            'chat'
          );

          if (validation.valid && validation.promptId) {
            promptId = validation.promptId;
            socketLogger.info('Menu option validated', {
              sessionId,
              promptId,
              promptName: validation.promptName
            });
          } else {
            socketLogger.warn('Invalid menu selection', {
              sessionId,
              message,
              userId: user.id
            });
            socket.emit('chat:error', {
              error: 'Invalid menu selection. Please select a valid option.'
            });
            return;
          }
        }

        // Echo user's message immediately for instant feedback
        socket.emit('chat:message-sent', {
          role: 'user',
          content: message,
          timestamp: new Date()
        });

        // Show typing indicator for assistant
        socket.emit('chat:typing', { isTyping: true });

        // Process message through unified assistant service
        const response = await assistantService.processMessage({
          sessionId,
          message,
          userId: user.id,
          userEmail: user.email,
          tenantId: user.tenantId,
          source: 'text',
          context: {
            productId: 'va-service',
            userRole: (user as any).role,
            userName: (user as any).name,
            promptId // Pass the selected prompt ID to the assistant
          }
        });

        // Stop typing indicator
        socket.emit('chat:typing', { isTyping: false });

        socketLogger.debug('Response from assistant service', {
          sessionId: response.sessionId,
          intent: response.intent,
          requiresAction: response.requiresAction,
          source: response.metadata?.source,
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

        // Note: Multi-message support removed - use single message approach
        // If needed, send multiple responses by calling processMessage multiple times
      } catch (error: any) {
        socketLogger.error('Error processing message', { 
          sessionId, 
          userId: user.id,
          error: error.message,
          source: error.source || 'text',
          statusCode: error.statusCode,
          stack: error.stack,
          socketId: socket.id
        });
        
        // Stop typing indicator
        socket.emit('chat:typing', { isTyping: false });

        // Send error to client
        socket.emit('chat:error', {
          error: error.message || 'Failed to process message',
          canRetry: true,
          statusCode: error.statusCode || 500
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
          '/chat/end',
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
