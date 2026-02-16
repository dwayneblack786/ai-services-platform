import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../services/apiClient';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';
import { sessionCache } from '../services/cacheClient';
import VoiceVisualizer from './VoiceVisualizer';
import { MessageBubble } from './MessageBubble';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  intent?: string;
}

interface MenuOption {
  id: string;
  text: string;
  value: string;
  icon?: string;
  dtmfKey?: string;
  requiresInput?: boolean;
}

interface ChatResponse {
  sessionId: string;
  message?: string;
  messages?: string[]; // Array of messages for proactive follow-ups
  status?: string;
  intent?: string;
  requiresAction?: boolean;
  suggestedAction?: string;
  options?: MenuOption[]; // NEW: Session menu options
  promptText?: string; // NEW: Prompt for option selection
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

const EmbedCodeSection: React.FC<{ productId?: string }> = ({ productId }) => {
  const [showEmbed, setShowEmbed] = useState(false);
  const [copied, setCopied] = useState(false);

  const { user } = useAuth();
  const baseUrl = import.meta.env.VITE_CHAT_WIDGET_URL || window.location.origin;
  const tenantId = user?.tenantId;
  const embedCode = `<iframe\n  src="${baseUrl}/chat-widget?productId=${productId || 'va-service'}${tenantId ? `&tenantId=${tenantId}` : ''}"\n  width="400"\n  height="600"\n  style="border:none;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);"\n  allow="microphone"\n  title="AI Assistant Chat"\n></iframe>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ borderTop: '1px solid #e5e7eb' }}>
      <button
        onClick={() => setShowEmbed(!showEmbed)}
        style={{
          width: '100%',
          padding: '10px 16px',
          background: '#f9fafb',
          border: 'none',
          borderBottom: showEmbed ? '1px solid #e5e7eb' : 'none',
          color: '#4f46e5',
          fontSize: '13px',
          fontWeight: '600',
          cursor: 'pointer',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <span>{showEmbed ? '▾' : '▸'}</span>
        {'</>'} Embed Code
      </button>
      {showEmbed && (
        <div style={{ padding: '12px 16px', background: '#f9fafb' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#6b7280' }}>
            Copy the code below to embed this chat widget on your website:
          </p>
          <pre style={{
            margin: '0 0 8px 0',
            padding: '12px',
            background: '#1e1b4b',
            color: '#c4b5fd',
            borderRadius: '6px',
            fontSize: '12px',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            fontFamily: 'monospace'
          }}>
            {embedCode}
          </pre>
          <button
            onClick={handleCopy}
            style={{
              padding: '6px 14px',
              background: copied ? '#10b981' : '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>
      )}
    </div>
  );
};

export const AssistantChat: React.FC<AssistantChatProps> = ({ 
  productId, 
  useWebSocket = DEFAULT_USE_WEBSOCKET // Default from env variable, can be overridden via prop
}) => {
  const { refreshAuth } = useAuth();
  
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
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentTranscription, setCurrentTranscription] = useState(''); // Real-time transcription during recording
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  
  // Voice greeting state
  const [greetingState, setGreetingState] = useState<'none' | 'initializing' | 'playing' | 'played'>('none');
  const [greetingAudio, setGreetingAudio] = useState<string | null>(null);
  const [greetingText, setGreetingText] = useState<string | null>(null);

  // Menu options state
  const [menuOptions, setMenuOptions] = useState<MenuOption[] | null>(null);
  const [promptText, setPromptText] = useState<string | null>(null);
  const [optionSelected, setOptionSelected] = useState(false);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement>(null);
  const greetingAudioRef = useRef<HTMLAudioElement>(null);
  
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
      
      // Handle authentication failures from Socket.IO
      if (error.message === 'AUTH_FAILED') {
        console.warn('[Chat] Socket.IO authentication failed - refreshing auth state');
        refreshAuth().catch(err => {
          console.error('[Chat] Failed to refresh auth:', err);
        });
      }
      
      // Parse error message for user-friendly display
      let errorMsg = 'Connection failed. ';
      
      if (error.message.includes('Authentication') || error.message === 'AUTH_FAILED') {
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

      // Reset option selection to show menu again after assistant response
      setOptionSelected(false);

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
      
      // Store in cache (Redis-backed with localStorage fallback)
      await sessionCache.set('chatSessionId', newSessionId);
      
      // WebSocket room joining is handled by separate useEffect
      // that watches for sessionId and isConnected changes
      
      // Capture menu options if provided
      if (response.data.options && response.data.options.length > 0) {
        setMenuOptions(response.data.options);
        setPromptText(response.data.promptText || 'Please select an option:');
        setOptionSelected(false); // Reset for new session
      } else {
        setMenuOptions(null);
        setPromptText(null);
        setOptionSelected(true); // No menu, allow free text
      }

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
    
    // Clear from cache
    await sessionCache.delete('chatSessionId');
    
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
        console.log('[Chat] Sending via WebSocket', {
          hasPromptId: !!selectedPromptId,
          promptId: selectedPromptId
        });
        socket.emit('chat:send-message', {
          sessionId,
          message: messageToSend,
          isMenuSelection: optionSelected && !!selectedPromptId, // Only flag first message as menu selection
          selectedPromptId: selectedPromptId || undefined
        });

        // Clear the optionSelected flag after first message, but keep selectedPromptId for the session
        if (optionSelected) {
          setOptionSelected(false);
        }

        // Loading will be cleared when response is received
      } else {
        // Use agent endpoint for AI-powered responses
        console.log('[Chat] Sending via agent API');
        
        try {
          const response = await apiClient.post('/api/agent/execute', {
            sessionId,
            message: messageToSend,
            context: {
              productId: productId || 'va-service',
              promptId: selectedPromptId || undefined
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

  // Handle option button click - loads text into input field as suggestion
  const handleOptionSelect = (option: MenuOption) => {
    // Load option text into input field
    setInputMessage(option.text);

    // Store the selected prompt ID (option.id is the promptId from database)
    setSelectedPromptId(option.id);

    // Mark as selected to hide options (user can still modify before sending)
    setOptionSelected(true);

    // Focus input so user can submit or modify
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Initialize voice session with greeting
  const initializeVoiceSession = async (): Promise<boolean> => {
    if (!sessionId || !socket) {
      console.error('[Voice] Cannot initialize: No session ID or socket connection');
      setError('Session not initialized. Please refresh the page.');
      return false;
    }

    try {
      console.log('[Voice] Initializing voice session with greeting for session:', sessionId);
      setGreetingState('initializing');
      setVoiceStatus('processing');

      // Emit voice session initialization event with current chat session
      socket.emit('voice:session:init', {
        sessionId,
        customerId: 'customer-123', // TODO: Get from auth context
        productId: productId || 'va-service',
        tenantId: 'tenant-1' // TODO: Get from auth context
      });

      // Wait for greeting response with timeout
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.warn('[Voice] Greeting initialization timeout after 10 seconds');
          setGreetingState('none');
          setVoiceStatus('idle');
          // Allow voice session to proceed without greeting
          resolve(true);
        }, 10000);

        // Listen for initialization response
        const handleInitialized = (data: { 
          sessionId: string;
          greetingText: string | null;
          greetingAudio: string | null;
        }) => {
          clearTimeout(timeout);
          socket.off('voice:session:initialized', handleInitialized);

          console.log('[Voice] Session initialized:', data);
          
          if (data.greetingAudio) {
            setGreetingAudio(data.greetingAudio);
            setGreetingText(data.greetingText);
            resolve(true);
          } else {
            console.warn('[Voice] No greeting audio received');
            setGreetingState('none');
            setVoiceStatus('idle');
            resolve(true);
          }
        };

        socket.once('voice:session:initialized', handleInitialized);

        // Handle initialization errors
        const handleInitError = (data: { error: string }) => {
          clearTimeout(timeout);
          socket.off('voice:session:initialized', handleInitialized);
          console.error('[Voice] Session initialization error:', data.error);
          setGreetingState('none');
          setVoiceStatus('idle');
          // Allow voice session to proceed without greeting
          resolve(true);
        };

        socket.once('voice:session:init:error', handleInitError);
      });
    } catch (error: any) {
      console.error('[Voice] Error initializing voice session:', error);
      setGreetingState('none');
      setVoiceStatus('idle');
      // Allow voice session to proceed without greeting
      return true;
    }
  };

  // Play greeting audio
  const playGreetingAudio = async (audioBase64: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        console.log('[Voice] Playing greeting audio...');
        setGreetingState('playing');
        setVoiceStatus('speaking');

        // Decode base64 to binary
        const binaryString = atob(audioBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Create blob and audio URL
        const blob = new Blob([bytes], { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(blob);

        // Play using greeting audio ref
        if (greetingAudioRef.current) {
          greetingAudioRef.current.src = audioUrl;
          
          greetingAudioRef.current.onended = () => {
            console.log('[Voice] Greeting audio playback completed');
            setGreetingState('played');
            setVoiceStatus('idle');
            URL.revokeObjectURL(audioUrl);
            resolve();
          };

          greetingAudioRef.current.onerror = (err) => {
            console.error('[Voice] Greeting audio playback error:', err);
            setGreetingState('played'); // Continue anyway
            setVoiceStatus('idle');
            URL.revokeObjectURL(audioUrl);
            reject(err);
          };

          greetingAudioRef.current.play()
            .catch(err => {
              console.error('[Voice] Failed to play greeting audio:', err);
              setGreetingState('played');
              setVoiceStatus('idle');
              URL.revokeObjectURL(audioUrl);
              reject(err);
            });
        } else {
          reject(new Error('Greeting audio ref not available'));
        }
      } catch (error) {
        console.error('[Voice] Error processing greeting audio:', error);
        setGreetingState('played');
        setVoiceStatus('idle');
        reject(error);
      }
    });
  };

  // Voice streaming functions
  const startVoiceRecording = async () => {
    try {
      // Initialize voice session with greeting (only on first recording)
      if (greetingState === 'none') {
        const initialized = await initializeVoiceSession();
        if (!initialized) {
          return; // Initialization failed, abort recording
        }

        // Play greeting if available
        if (greetingAudio) {
          try {
            await playGreetingAudio(greetingAudio);
            
            // Add greeting text to message history
            if (greetingText) {
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: greetingText,
                timestamp: new Date()
              }]);
            }
          } catch (error) {
            console.warn('[Voice] Failed to play greeting, continuing with recording:', error);
            setGreetingState('played'); // Mark as played to avoid retry
          }
        }
      }

      setVoiceStatus('listening');
      
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
        setVoiceStatus('processing');
        if (socket && sessionId) {
          socket.emit('voice:end', { sessionId });
        }
      };

      // Start recording with 100ms chunks for real-time streaming
      mediaRecorder.start(100);

    } catch (error: any) {
      console.error('[Voice] Error accessing microphone:', error);
      
      // User-friendly error messages
      let errorMsg = 'Could not access microphone. ';
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMsg += 'Please grant microphone permission in your browser settings.';
      } else if (error.name === 'NotFoundError') {
        errorMsg += 'No microphone found. Please connect a microphone and try again.';
      } else if (error.name === 'NotReadableError') {
        errorMsg += 'Microphone is being used by another application.';
      } else {
        errorMsg += error.message || 'Unknown error occurred.';
      }
      
      setError(errorMsg);
      setIsRecording(false);
      setVoiceStatus('idle');
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
    setCurrentTranscription('');
    console.log('[Voice] Recording stopped and cleaned up');
    // Voice status will be updated by transcription events
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
      socket.on('voice:transcription', (data: { text: string; isFinal?: boolean }) => {
        console.log('[Voice] Received transcription:', data.text, 'Final:', data.isFinal);
        
        if (data.isFinal) {
          // Final transcription - add to input field
          setInputMessage(prev => prev + (prev ? ' ' : '') + data.text);
          setCurrentTranscription(''); // Clear real-time display
          setVoiceStatus('idle');
        } else {
          // Interim transcription - show in real-time
          setCurrentTranscription(data.text);
          setVoiceStatus('processing');
        }
      });

      socket.on('voice:error', (data: { error: string }) => {
        console.error('[Voice] Server error:', data.error);
        setError(`Voice streaming error: ${data.error}`);
        setVoiceStatus('idle');
        stopVoiceRecording();
      });

      // Listen for TTS audio responses
      socket.on('voice:audio-response', (data: { 
        audioData: string; // Base64 encoded audio
        text?: string; 
        format?: string;
        voiceName?: string;
      }) => {
        console.log('[Voice] Received TTS audio:', {
          format: data.format,
          voice: data.voiceName,
          textLength: data.text?.length,
          audioSize: data.audioData?.length
        });

        try {
          // Decode base64 to binary
          const binaryString = atob(data.audioData);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          // Create blob from binary data
          const mimeType = data.format === 'mp3' ? 'audio/mpeg' : 
                          data.format === 'wav' ? 'audio/wav' : 
                          data.format === 'ogg' ? 'audio/ogg' : 'audio/mpeg';
          const blob = new Blob([bytes], { type: mimeType });
          const audioUrl = URL.createObjectURL(blob);

          // Play audio
          if (audioPlayerRef.current) {
            audioPlayerRef.current.src = audioUrl;
            audioPlayerRef.current.play()
              .then(() => {
                console.log('[Voice] TTS audio playback started');
                setIsPlayingAudio(true);
                setVoiceStatus('speaking');
              })
              .catch(err => {
                console.error('[Voice] Audio playback error:', err);
                setError('Failed to play audio response');
                setVoiceStatus('idle');
              });
          }

          // Display text message if provided
          if (data.text) {
            setMessages(prev => [...prev, normalizeMessage({
              role: 'assistant',
              content: data.text
            })]);
          }
        } catch (err) {
          console.error('[Voice] Error processing TTS audio:', err);
          setError('Failed to process audio response');
          setVoiceStatus('idle');
        }
      });

      return () => {
        socket.off('voice:transcription');
        socket.off('voice:error');
        socket.off('voice:audio-response');
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
            <span 
              title={`Full Session ID: ${sessionId}`}
              style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px', display: 'block', cursor: 'help' }}
            >
              Session: {sessionId.substring(0, 8)}... 
              {useWebSocket && (
                <span style={{ marginLeft: '8px' }}>
                  {isConnected && <span title="WebSocket connection is active">🟢 Connected</span>}
                  {!isConnected && connectionStatus === 'connecting' && <span title="Attempting to establish WebSocket connection">🟡 Connecting...</span>}
                  {!isConnected && connectionStatus === 'disconnected' && <span title="WebSocket connection is not available. Using REST API fallback.">🔴 Disconnected</span>}
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
            title="Dismiss this notification"
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
            <MessageBubble
              key={idx}
              role={msg.role}
              content={msg.content}
              timestamp={msg.timestamp}
              intent={msg.intent}
              showIntent={false}  // Can be made configurable later
            />
          ))}

        {/* Option Bubbles in Chat Context - Show persistently after greeting */}
        {menuOptions && messages.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            {promptText && (
              <div style={{
                textAlign: 'left',
                marginBottom: '12px',
                padding: '8px 12px',
                backgroundColor: '#f0f9ff',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                color: '#1e40af'
              }}>
                {promptText}
              </div>
            )}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              alignItems: 'flex-start'
            }}>
              {menuOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleOptionSelect(option)}
                  disabled={isLoading}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: 'white',
                    border: '2px solid #e0e7ff',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#4f46e5',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    opacity: isLoading ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading) {
                      e.currentTarget.style.backgroundColor = '#eef2ff';
                      e.currentTarget.style.borderColor = '#4f46e5';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.borderColor = '#e0e7ff';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                  }}
                >
                  {option.icon && <span style={{ fontSize: '16px' }}>{option.icon}</span>}
                  <span>{option.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

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

      {/* Real-time Transcription Display */}
      {currentTranscription && (
        <div style={{
          padding: '8px 16px',
          backgroundColor: '#dbeafe',
          borderTop: '1px solid #93c5fd',
          color: '#1e40af',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontStyle: 'italic'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          </svg>
          <span>{currentTranscription}</span>
        </div>
      )}

      {/* Voice Status Indicator */}
      {(voiceStatus !== 'idle' || greetingState === 'initializing' || greetingState === 'playing') && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: 
            greetingState === 'initializing' ? '#fef3c7' :
            greetingState === 'playing' ? '#d1fae5' :
            voiceStatus === 'listening' ? '#dbeafe' :
            voiceStatus === 'processing' ? '#fef3c7' :
            voiceStatus === 'speaking' ? '#d1fae5' : '#f3f4f6',
          borderTop: '1px solid #e5e7eb',
          color: 
            greetingState === 'initializing' ? '#92400e' :
            greetingState === 'playing' ? '#065f46' :
            voiceStatus === 'listening' ? '#1e40af' :
            voiceStatus === 'processing' ? '#92400e' :
            voiceStatus === 'speaking' ? '#065f46' : '#6b7280',
          fontSize: '13px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            {greetingState === 'initializing' && (
              <>
                <span style={{ fontSize: '20px' }}>⏳</span>
                <span style={{ fontWeight: '500', flex: 1 }}>Preparing voice assistant...</span>
                <span style={{ fontSize: '12px', opacity: 0.7 }}>
                  Generating personalized greeting
                </span>
              </>
            )}
            {greetingState === 'playing' && (
              <>
                <span style={{ fontSize: '20px' }}>👋</span>
                <span style={{ fontWeight: '500', flex: 1 }}>Playing greeting...</span>
                <button
                  onClick={() => {
                    if (greetingAudioRef.current) {
                      greetingAudioRef.current.pause();
                      greetingAudioRef.current.currentTime = 0;
                      setGreetingState('played');
                      setVoiceStatus('idle');
                    }
                  }}
                  style={{
                    padding: '6px 16px',
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Skip
                </button>
              </>
            )}
            {voiceStatus === 'listening' && greetingState !== 'initializing' && greetingState !== 'playing' && (
              <>
                <span style={{ fontSize: '20px' }}>🎤</span>
                <span style={{ fontWeight: '500', flex: 1 }}>Listening...</span>
                <span style={{ fontSize: '12px', opacity: 0.7 }}>
                  Click the microphone to stop
                </span>
              </>
            )}
            {voiceStatus === 'processing' && greetingState !== 'initializing' && (
              <>
                <span style={{ fontSize: '20px' }}>⚙️</span>
                <span style={{ fontWeight: '500' }}>Processing speech...</span>
              </>
            )}
            {voiceStatus === 'speaking' && greetingState !== 'playing' && (
              <>
                <span style={{ fontSize: '20px' }}>🔊</span>
                <span style={{ fontWeight: '500', flex: 1 }}>Assistant is speaking...</span>
                <button
                  onClick={() => {
                    if (audioPlayerRef.current) {
                      audioPlayerRef.current.pause();
                      audioPlayerRef.current.currentTime = 0;
                      setIsPlayingAudio(false);
                      setVoiceStatus('idle');
                    }
                  }}
                  style={{
                    padding: '6px 16px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Stop
                </button>
              </>
            )}
          </div>
          {/* Voice Visualizer */}
          {(voiceStatus === 'listening' || voiceStatus === 'speaking') && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <VoiceVisualizer
                audioStream={audioStream}
                isRecording={isRecording && voiceStatus === 'listening'}
                isPlaying={isPlayingAudio && voiceStatus === 'speaking'}
                width={300}
                height={50}
                barCount={24}
              />
            </div>
          )}
        </div>
      )}

      {/* Hidden Audio Player for TTS */}
      <audio
        ref={audioPlayerRef}
        onEnded={() => {
          console.log('[Voice] TTS audio playback ended');
          setIsPlayingAudio(false);
          setVoiceStatus('idle');
        }}
        onError={(e) => {
          console.error('[Voice] Audio playback error:', e);
          setError('Audio playback failed');
          setIsPlayingAudio(false);
          setVoiceStatus('idle');
        }}
        style={{ display: 'none' }}
      />

      {/* Hidden Audio Player for Greeting */}
      <audio
        ref={greetingAudioRef}
        style={{ display: 'none' }}
      />

      {/* Embed Code Section */}
      <EmbedCodeSection productId={productId} />

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
            placeholder={
              menuOptions && !optionSelected
                ? "Select an option above or type your message..."
                : "Type your message... (Ctrl+Enter to send)"
            }
            title={
              menuOptions && !optionSelected
                ? "You can select an option from the menu or type your message directly"
                : "Type your message here. Press Ctrl+Enter to send or Enter for new line."
            }
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
              disabled={!sessionId || isLoading || greetingState === 'initializing' || greetingState === 'playing'}
              title={
                !sessionId ? 'Chat session not initialized' :
                isLoading ? 'Processing previous message...' :
                greetingState === 'initializing' ? 'Initializing voice session...' :
                greetingState === 'playing' ? 'Playing greeting...' :
                isRecording ? 'Stop recording' : 'Start voice recording'
              }
              style={{
                padding: '12px',
                backgroundColor: 
                  greetingState === 'initializing' || greetingState === 'playing' ? '#f59e0b' :
                  isRecording ? '#ef4444' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: (!sessionId || isLoading || greetingState === 'initializing' || greetingState === 'playing') ? 'not-allowed' : 'pointer',
                opacity: (!sessionId || isLoading || greetingState === 'initializing' || greetingState === 'playing') ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '48px',
                transition: 'all 0.2s'
              }}
            >
              {greetingState === 'initializing' || greetingState === 'playing' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" opacity="0.3" />
                  <path d="M12 6v6l4 2" strokeLinecap="round" />
                </svg>
              ) : isRecording ? (
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
            title={
              !sessionId ? 'Chat session not initialized' :
              isLoading ? 'Processing your previous message...' :
              !inputMessage.trim() ? 'Type a message first' :
              requiresAction && suggestedAction === 'transfer_to_human' ? 'Transfer to human agent is pending' :
              'Send your message (Ctrl+Enter)'
            }
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
