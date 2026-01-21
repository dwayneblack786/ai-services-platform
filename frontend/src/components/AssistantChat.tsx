import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../services/apiClient';
import { useSocket } from '../hooks/useSocket';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  intent?: string;
}

interface ChatResponse {
  sessionId: string;
  message?: string;
  messages?: string[]; // Array of messages for proactive follow-ups
  status?: string;
  intent?: string;
  requiresAction?: boolean;
  suggestedAction?: string;
  chatConfig?: {
    greeting: string;
    typingIndicator: boolean;
    maxTurns: number;
    showIntent: boolean;
  };
}

interface AssistantChatProps {
  productId?: string;
  useWebSocket?: boolean; // Toggle between WebSocket and REST (overrides env variable)
}

// Read WebSocket preference from environment variable (default: true)
const DEFAULT_USE_WEBSOCKET = import.meta.env.VITE_USE_WEBSOCKET !== 'false';

export const AssistantChat: React.FC<AssistantChatProps> = ({ 
  productId, 
  useWebSocket = DEFAULT_USE_WEBSOCKET // Default from env variable, can be overridden via prop
}) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [requiresAction, setRequiresAction] = useState(false);
  const [suggestedAction, setSuggestedAction] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  
  // Socket.IO connection
  const { socket, isConnected } = useSocket({
    autoConnect: useWebSocket,
    onConnect: () => {
      console.log('[Chat] WebSocket connected');
      setConnectionStatus('connected');
      setConnectionError(null); // Clear any previous errors
    },
    onDisconnect: (reason) => {
      console.log('[Chat] WebSocket disconnected:', reason);
      setConnectionStatus(reason === 'io client disconnect' ? 'disconnected' : 'connecting');
      
      // Set user-friendly disconnect message
      const disconnectMessages: { [key: string]: string } = {
        'io server disconnect': 'Server closed the connection. Please refresh the page.',
        'io client disconnect': 'You have been disconnected.',
        'ping timeout': 'Connection timed out. Check your internet connection.',
        'transport close': 'Network connection lost. Attempting to reconnect...',
        'transport error': 'Network error occurred. Check your connection.'
      };
      
      setConnectionError(disconnectMessages[reason] || `Disconnected: ${reason}`);
    },
    onError: (error) => {
      console.error('[Chat] WebSocket error:', error);
      setConnectionStatus('disconnected');
      
      // Parse error message for user-friendly display
      let errorMsg = 'Connection failed. ';
      
      if (error.message.includes('Authentication')) {
        errorMsg += 'Authentication failed. Please log out and log in again.';
      } else if (error.message.includes('timeout')) {
        errorMsg += 'Server is not responding. Please check if the backend is running.';
      } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        errorMsg += 'Cannot reach server. Make sure the backend is running at ' + (import.meta.env.VITE_API_URL || 'http://localhost:5000');
      } else {
        errorMsg += error.message;
      }
      
      setConnectionError(errorMsg);
    }
  });

  // Helper function to extract text from any format (plain text or JSON)
  const extractTextContent = (value: any): string => {
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'object' && value !== null) {
      // Extract all string values from the object and join them
      const strings: string[] = [];
      const extractStrings = (obj: any) => {
        if (typeof obj === 'string') {
          strings.push(obj);
        } else if (Array.isArray(obj)) {
          obj.forEach(extractStrings);
        } else if (typeof obj === 'object' && obj !== null) {
          Object.values(obj).forEach(extractStrings);
        }
      };
      extractStrings(value);
      return strings.join(' ');
    }
    return String(value);
  };

  // Helper function to normalize message format and extract text from JSON if needed
  const normalizeMessage = (msg: Partial<Message>): Message => {
    let content = String(msg.content || '').trim();
    
    // Check if content is JSON-wrapped and extract the actual text
    if (content.startsWith('{') && content.includes('"')) {
      try {
        const parsed = JSON.parse(content);
        content = extractTextContent(parsed);
      } catch (e) {
        // Not valid JSON, use as-is
      }
    }
    
    return {
      role: msg.role || 'assistant',
      content: String(content).trim(),
      timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp || Date.now()),
      intent: msg.intent
    };
  };

  // Socket.IO event handlers
  useEffect(() => {
    if (!socket || !useWebSocket) return;

    // Handle incoming messages from assistant
    socket.on('chat:message-received', (data: any) => {
      console.log('[Chat] Message received:', data);
      setIsAssistantTyping(false);
      setIsLoading(false); // Clear loading state when response is received
      setMessages(prev => [...prev, normalizeMessage(data)]);
      
      // Handle action requirements
      if (data.requiresAction) {
        setRequiresAction(true);
        setSuggestedAction(data.suggestedAction || 'unknown');
      }
    });

    // Handle message sent confirmation
    socket.on('chat:message-sent', (data: any) => {
      console.log('[Chat] Message sent confirmed:', data);
    });

    // Handle typing indicator from assistant
    socket.on('chat:typing', (data: { isTyping: boolean }) => {
      setIsAssistantTyping(data.isTyping);
    });

    // Handle errors
    socket.on('chat:error', (data: { error: string; details?: string }) => {
      console.error('[Chat] Socket error:', data);
      setError(data.error);
      setIsLoading(false);
      setIsAssistantTyping(false);
    });

    // Handle session ended
    socket.on('chat:session-ended', (data: any) => {
      console.log('[Chat] Session ended:', data);
    });

    // Handle chat history
    socket.on('chat:history', (data: any) => {
      console.log('[Chat] History received:', data);
      if (data.messages) {
        setMessages(data.messages.map((msg: any) => normalizeMessage(msg)));
      }
    });

    // Cleanup
    return () => {
      socket.off('chat:message-received');
      socket.off('chat:message-sent');
      socket.off('chat:typing');
      socket.off('chat:error');
      socket.off('chat:session-ended');
      socket.off('chat:history');
    };
  }, [socket, useWebSocket]);

  // Sync connection status with isConnected state
  useEffect(() => {
    if (useWebSocket) {
      if (isConnected) {
        setConnectionStatus('connected');
        setConnectionError(null);
      } else {
        // When disconnected, show disconnected status
        // The onDisconnect handler will set to 'connecting' if it's a reconnection attempt
        setConnectionStatus('disconnected');
      }
    }
  }, [isConnected, useWebSocket]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAssistantTyping]);

  // Initialize or restore chat session (still uses REST)
  const initializeSession = async (forceNew: boolean = false) => {
    try {
      setIsInitializing(true);
      const response = await apiClient.post<ChatResponse>('/api/chat/session', 
        { 
          productId: productId || 'va-service',
          forceNew 
        }
      );
      
      const newSessionId = response.data.sessionId;
      setSessionId(newSessionId);
      
      // Store in local storage as well (as backup to httpOnly cookie)
      localStorage.setItem('chatSessionId', newSessionId);
      
      // WebSocket room joining is handled by separate useEffect
      // that watches for sessionId and isConnected changes
      
      // If resuming session, load history
      if (response.data.status === 'resumed' && response.data.messages) {
        setMessages(response.data.messages.map((msg: any) => normalizeMessage({
          role: msg.role,
          content: msg.content,
          intent: msg.intent
        })));
      } else {
        // New session - show greeting
        const greeting = response.data.chatConfig?.greeting || 
                        response.data.message || 
                        'Hello! I\'m your AI assistant. How can I help you today?';
        setMessages([normalizeMessage({
          role: 'assistant',
          content: greeting
        })]);
      }
      
      setError(null);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to start chat session. Please try again.';
      setError(errorMsg);
      console.error('Session init error:', err.response?.data || err);
    } finally {
      setIsInitializing(false);
    }
  };

  // Start new chat (clear current session)
  const startNewChat = async () => {
    if (sessionId) {
      try {
        // Leave Socket.IO session room if using WebSocket
        if (socket && useWebSocket && isConnected) {
          socket.emit('chat:leave-session', sessionId);
        }
        
        await apiClient.post('/api/chat/end', 
          { sessionId }
        );
      } catch (err) {
        console.error('Error ending session:', err);
      }
    }
    
    // Clear local storage
    localStorage.removeItem('chatSessionId');
    
    // Reset state
    setMessages([]);
    setSessionId(null);
    setError(null);
    setIsAssistantTyping(false);
    
    // Start fresh session
    await initializeSession(true);
  };

  // Check for existing session on mount
  useEffect(() => {
    // Initialize session immediately (uses REST API)
    // WebSocket connection is optional and handled separately
    initializeSession();
    
    return () => {
      // Cleanup on unmount
      if (sessionId && socket && useWebSocket) {
        socket.emit('chat:leave-session', sessionId);
      }
    };
  }, []); // Run only once on mount
  
  // Join WebSocket session room when connected
  useEffect(() => {
    if (useWebSocket && socket && isConnected && sessionId) {
      console.log('[Chat] Joining WebSocket session room:', sessionId);
      socket.emit('chat:join-session', sessionId);
    }
  }, [isConnected, sessionId, useWebSocket, socket]);

  // Send message via WebSocket or REST
  const sendMessage = async () => {
    if (!inputMessage.trim() || !sessionId || isLoading) return;

    const userMessage = normalizeMessage({
      role: 'user',
      content: inputMessage
    });

    setMessages(prev => [...prev, userMessage]);
    const messageToSend = inputMessage;
    setInputMessage('');
    setIsLoading(true);
    setError(null);
    
    // Focus input after sending
    setTimeout(() => inputRef.current?.focus(), 100);

    try {
      if (useWebSocket && socket && isConnected) {
        // Use WebSocket for real-time messaging
        console.log('[Chat] Sending via WebSocket');
        socket.emit('chat:send-message', {
          sessionId,
          message: messageToSend
        });
        // Loading will be cleared when response is received
      } else {
        // Use agent endpoint for AI-powered responses
        console.log('[Chat] Sending via agent API');
        
        try {
          const response = await apiClient.post('/api/agent/execute', {
            sessionId,
            message: messageToSend,
            context: {
              productId: productId || 'va-service'
            }
          });
          
          const assistantMessage: Message = {
            role: 'assistant',
            content: response.data.message || 'No response from agent',
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, assistantMessage]);
          setIsLoading(false);
        } catch (error: any) {
          console.error('[Chat] Agent API error:', error);
          const errorMsg = error.response?.data?.error || 'Failed to get response from agent';
          setError(errorMsg);
          setIsLoading(false);
        }
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to send message. Please try again.';
      setError(errorMsg);
      console.error('Message send error:', err.response?.data || err);
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Ctrl+Enter or Cmd+Enter to send
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      sendMessage();
    }
    // Allow Enter for new lines without modifier keys
  };

  // Voice streaming functions
  const startVoiceRecording = async () => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        } 
      });
      
      setAudioStream(stream);
      setIsRecording(true);

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;

      // Emit start streaming event
      if (socket && sessionId) {
        socket.emit('voice:start', { sessionId });
        console.log('[Voice] Started streaming for session:', sessionId);
      }

      // Send audio chunks as they become available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && socket && sessionId) {
          // Convert Blob to ArrayBuffer for efficient transmission
          event.data.arrayBuffer().then(buffer => {
            socket.emit('voice:chunk', {
              sessionId,
              audio: buffer,
              timestamp: Date.now()
            });
            console.log('[Voice] Sent audio chunk:', buffer.byteLength, 'bytes');
          });
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = () => {
        console.log('[Voice] Recording stopped');
        if (socket && sessionId) {
          socket.emit('voice:end', { sessionId });
        }
      };

      // Start recording with 100ms chunks for real-time streaming
      mediaRecorder.start(100);

    } catch (error) {
      console.error('[Voice] Error accessing microphone:', error);
      setError('Could not access microphone. Please check permissions.');
      setIsRecording(false);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      setAudioStream(null);
    }

    setIsRecording(false);
    console.log('[Voice] Recording stopped and cleaned up');
  };

  const toggleVoiceRecording = () => {
    if (isRecording) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  // Listen for voice transcription from server
  useEffect(() => {
    if (socket) {
      socket.on('voice:transcription', (data: { text: string }) => {
        console.log('[Voice] Received transcription:', data.text);
        // Update the input field with the transcribed text
        setInputMessage(prev => prev + (prev ? ' ' : '') + data.text);
      });

      socket.on('voice:error', (data: { error: string }) => {
        console.error('[Voice] Server error:', data.error);
        setError(`Voice streaming error: ${data.error}`);
        stopVoiceRecording();
      });

      return () => {
        socket.off('voice:transcription');
        socket.off('voice:error');
      };
    }
  }, [socket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopVoiceRecording();
      }
    };
  }, [isRecording]);

  return (
    <>
      <style>
        {`
          @keyframes bounce {
            0%, 80%, 100% {
              transform: scale(0);
              opacity: 0.5;
            }
            40% {
              transform: scale(1);
              opacity: 1;
            }
          }
        `}
      </style>
      <div className="assistant-chat-container" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '600px',
      maxWidth: '800px',
      margin: '0 auto',
      border: '1px solid #ddd',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        backgroundColor: '#4f46e5',
        color: 'white',
        fontWeight: 'bold',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div>AI Assistant Chat</div>
          {sessionId && (
            <span style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px', display: 'block' }}>
              Session: {sessionId.substring(0, 8)}... 
              {useWebSocket && (
                <span style={{ marginLeft: '8px' }}>
                  {isConnected && '🟢 Connected'}
                  {!isConnected && connectionStatus === 'connecting' && '🟡 Connecting...'}
                  {!isConnected && connectionStatus === 'disconnected' && '🔴 Disconnected'}
                </span>
              )}
            </span>
          )}
        </div>
        <button
          onClick={startNewChat}
          disabled={isInitializing}
          style={{
            padding: '8px 16px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'normal'
          }}
          title="Start a new conversation"
        >
          New Chat
        </button>
      </div>

      {/* Action Required Banner */}
      {requiresAction && suggestedAction === 'transfer_to_human' && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#dbeafe',
          borderBottom: '1px solid #3b82f6',
          color: '#1e3a8a',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '18px' }}>👤</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Transfer to Human Agent Requested</div>
            <div>Your request has been noted. A human agent will be notified to assist you.</div>
          </div>
          <button
            onClick={() => {
              setRequiresAction(false);
              setSuggestedAction(null);
            }}
            style={{
              padding: '6px 12px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Connection Error Banner */}
      {useWebSocket && !isConnected && connectionError && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#fef3c7',
          borderBottom: '1px solid #fbbf24',
          color: '#92400e',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '18px' }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>WebSocket Connection Issue</div>
            <div>{connectionError}</div>
            {connectionError.includes('backend') && (
              <div style={{ marginTop: '6px', fontSize: '12px', opacity: 0.8 }}>
                💡 Tip: Start the backend server with: <code style={{ 
                  backgroundColor: 'rgba(0,0,0,0.1)', 
                  padding: '2px 6px', 
                  borderRadius: '3px',
                  fontFamily: 'monospace'
                }}>cd backend-node && npm run dev</code>
              </div>
            )}
            <div style={{ marginTop: '6px', fontSize: '12px' }}>
              Note: Chat will work using REST API as fallback.
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      {isInitializing ? (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6b7280'
        }}>
          <em>Initializing chat...</em>
        </div>
      ) : (
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          backgroundColor: '#f9fafb'
        }}>
          {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: '16px',
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
            }}
          >
            <div
              style={{
                maxWidth: '70%',
                padding: '12px 16px',
                borderRadius: '12px',
                backgroundColor: msg.role === 'user' ? '#4f46e5' : '#ffffff',
                color: msg.role === 'user' ? '#ffffff' : '#000000',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
            >
              {msg.content}
              {msg.intent && (
                <div style={{ 
                  fontSize: '10px', 
                  opacity: 0.6, 
                  marginTop: '4px' 
                }}>
                  Intent: {msg.intent}
                </div>
              )}
            </div>
          </div>
        ))}
        {(isLoading || isAssistantTyping) && (
          <div style={{ textAlign: 'left', color: '#6b7280', marginBottom: '16px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '12px 16px',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}>
              <div style={{
                display: 'flex',
                gap: '4px',
                alignItems: 'center'
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#9ca3af',
                  borderRadius: '50%',
                  animation: 'bounce 1.4s infinite ease-in-out both',
                  animationDelay: '-0.32s'
                }}></span>
                <span style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#9ca3af',
                  borderRadius: '50%',
                  animation: 'bounce 1.4s infinite ease-in-out both',
                  animationDelay: '-0.16s'
                }}></span>
                <span style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#9ca3af',
                  borderRadius: '50%',
                  animation: 'bounce 1.4s infinite ease-in-out both'
                }}></span>
                <span style={{ marginLeft: '8px', fontSize: '14px' }}>
                  {isAssistantTyping ? 'Assistant is typing...' : 'Processing...'}
                </span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={{
          padding: '8px 16px',
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {/* Input */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid #e5e7eb',
        backgroundColor: '#ffffff'
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message... (Ctrl+Enter to send)"
            disabled={!sessionId || isLoading}
            rows={3}
            style={{
              flex: 1,
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical',
              minHeight: '60px'
            }}
          />
          {useWebSocket && (
            <button
              onClick={toggleVoiceRecording}
              disabled={!sessionId || isLoading}
              title={isRecording ? 'Stop recording' : 'Start voice recording'}
              style={{
                padding: '12px',
                backgroundColor: isRecording ? '#ef4444' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                opacity: (!sessionId || isLoading) ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '48px',
                transition: 'all 0.2s'
              }}
            >
              {isRecording ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              )}
            </button>
          )}
          <button
            onClick={sendMessage}
            disabled={!sessionId || isLoading || !inputMessage.trim()}
            style={{
              padding: '12px 24px',
              backgroundColor: requiresAction && suggestedAction === 'transfer_to_human' ? '#6b7280' : '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
              opacity: (!sessionId || isLoading || !inputMessage.trim()) ? 0.5 : 1
            }}
          >
            {requiresAction && suggestedAction === 'transfer_to_human' ? 'Pending Transfer' : 'Send'}
          </button>
        </div>
      </div>
    </div>
    </>
  );
};

export default AssistantChat;
