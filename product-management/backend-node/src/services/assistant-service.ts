import axios from 'axios';

/**
 * Unified Assistant Service
 * Handles both voice and text input through a single interface
 * Routes all assistant interactions to the Java va-service
 */

export interface AssistantMessageParams {
  sessionId: string;
  message: string;
  userId: string;
  userEmail?: string;
  tenantId?: string;
  source: 'text' | 'voice';
  context?: {
    productId?: string;
    userRole?: string;
    userName?: string;
    promptId?: string; // Selected prompt from session menu
  };
}

export interface MenuOption {
  id: string;
  text: string;
  value: string;
  icon?: string;
  dtmfKey?: string; // For voice: "1", "2", "3"
  requiresInput?: boolean;
}

export interface AssistantResponse {
  sessionId: string;
  message: string;
  intent?: string;
  requiresAction?: boolean;
  suggestedAction?: string;
  conversationId?: string;
  options?: MenuOption[]; // NEW: Session menu options
  promptText?: string; // NEW: "Please select an option:"
  metadata?: {
    source: 'text' | 'voice';
    processingTime?: number;
    tokensUsed?: number;
  };
}

export class AssistantService {
  private agentApiUrl: string;

  constructor() {
    this.agentApiUrl = process.env.INFERO_API_URL || 'http://localhost:8136';
  }

  /**
   * Process a message from any source (voice or text)
   * This is the unified entry point for all assistant interactions
   */
  async processMessage(params: AssistantMessageParams): Promise<AssistantResponse> {
    const startTime = Date.now();
    
    try {
      console.log(`[AssistantService] Processing ${params.source} message:`, {
        sessionId: params.sessionId.substring(0, 8) + '...',
        messageLength: params.message.length,
        userId: params.userId,
        source: params.source
      });

      // Call Java va-service agent endpoint
      const response = await axios.post(
        `${this.agentApiUrl}/agent/execute`,
        {
          sessionId: params.sessionId,
          message: params.message,
          context: {
            userId: params.userId,
            customerId: params.tenantId,
            userRole: params.context?.userRole,
            userName: params.context?.userName,
            userEmail: params.userEmail,
            productId: params.context?.productId || 'va-service',
            source: params.source,
            promptId: params.context?.promptId // Include selected prompt ID
          }
        },
        {
          timeout: 300000, // 5 minutes
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const processingTime = Date.now() - startTime;

      console.log(`[AssistantService] Response received in ${processingTime}ms:`, {
        sessionId: params.sessionId.substring(0, 8) + '...',
        responseLength: response.data.message?.length || 0,
        intent: response.data.intent,
        source: params.source
      });

      // Format unified response
      const assistantResponse: AssistantResponse = {
        sessionId: params.sessionId,
        message: response.data.message || 'No response from assistant',
        intent: response.data.intent,
        requiresAction: response.data.requiresAction,
        suggestedAction: response.data.suggestedAction,
        conversationId: response.data.conversationId,
        metadata: {
          source: params.source,
          processingTime,
          tokensUsed: response.data.tokensUsed
        }
      };

      return assistantResponse;

    } catch (error: any) {
      console.error('[AssistantService] Error processing message:', {
        sessionId: params.sessionId.substring(0, 8) + '...',
        source: params.source,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });

      // Return error response in unified format
      throw {
        message: error.response?.data?.error || error.message || 'Failed to process message',
        sessionId: params.sessionId,
        source: params.source,
        statusCode: error.response?.status || 500
      };
    }
  }

  /**
   * Initialize a new assistant session
   */
  async initializeSession(userId: string, context?: any): Promise<{ sessionId: string; greeting?: string }> {
    try {
      console.log('[AssistantService] Initializing new session for user:', userId);

      const response = await axios.post(
        `${this.agentApiUrl}/api/agent/session`,
        {
          userId,
          context: {
            ...context,
            productId: 'va-service'
          }
        },
        {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('[AssistantService] Session initialized:', {
        sessionId: response.data.sessionId?.substring(0, 8) + '...',
        userId
      });

      return {
        sessionId: response.data.sessionId,
        greeting: response.data.greeting
      };

    } catch (error: any) {
      console.error('[AssistantService] Error initializing session:', {
        userId,
        error: error.message,
        status: error.response?.status
      });

      throw {
        message: error.response?.data?.error || 'Failed to initialize session',
        userId,
        statusCode: error.response?.status || 500
      };
    }
  }

  /**
   * Get conversation history for a session
   */
  async getConversationHistory(sessionId: string): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.agentApiUrl}/api/agent/history/${sessionId}`,
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.messages || [];

    } catch (error: any) {
      console.error('[AssistantService] Error fetching history:', {
        sessionId: sessionId.substring(0, 8) + '...',
        error: error.message
      });

      return []; // Return empty array on error
    }
  }

  /**
   * End an assistant session
   */
  async endSession(sessionId: string): Promise<void> {
    try {
      console.log('[AssistantService] Ending session:', sessionId.substring(0, 8) + '...');

      await axios.post(
        `${this.agentApiUrl}/api/agent/session/end`,
        { sessionId },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

    } catch (error: any) {
      console.error('[AssistantService] Error ending session:', {
        sessionId: sessionId.substring(0, 8) + '...',
        error: error.message
      });
      // Don't throw, session end is best-effort
    }
  }

  /**
   * Health check for the assistant service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.agentApiUrl}/actuator/health`, {
        timeout: 5000
      });
      return response.data.status === 'UP';
    } catch (error) {
      console.error('[AssistantService] Health check failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const assistantService = new AssistantService();
