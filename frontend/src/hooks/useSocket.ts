import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketOptions {
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
}

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
}

/**
 * Custom hook to manage Socket.IO connection
 * Handles authentication, connection state, and provides emit wrapper
 */
export const useSocket = (options: UseSocketOptions = {}): UseSocketReturn => {
  const {
    autoConnect = true,
    onConnect,
    onDisconnect,
    onError
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      console.log('[Socket] Already connected');
      return;
    }

    const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    console.log('[Socket] Connecting to:', serverUrl);
    setIsConnected(false); // Set to false before attempting connection

    // Create socket connection
    // Note: httpOnly cookie will be sent automatically with credentials: true
    const socket = io(serverUrl, {
      withCredentials: true, // This sends httpOnly cookies
      transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 300000 // 5 minute timeout (300 seconds)
    });

    // Connection event handlers
    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      setIsConnected(true);
      onConnect?.();
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
      onDisconnect?.(reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
      setIsConnected(false);
      onError?.(error);
    });

    socket.on('error', (error) => {
      console.error('[Socket] Error:', error);
      onError?.(error);
    });

    // Handle reconnection attempts
    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('[Socket] Reconnection attempt:', attemptNumber);
      setIsConnected(false);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('[Socket] Reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      onConnect?.();
    });

    socket.on('reconnect_error', (error) => {
      console.error('[Socket] Reconnection error:', error.message);
      setIsConnected(false);
      onError?.(error);
    });

    socket.on('reconnect_failed', () => {
      console.error('[Socket] Reconnection failed after all attempts');
      setIsConnected(false);
      onError?.(new Error('Failed to reconnect after multiple attempts'));
    });

    socketRef.current = socket;
  }, [onConnect, onDisconnect, onError]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('[Socket] Disconnecting...');
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    if (!socketRef.current?.connected) {
      console.warn('[Socket] Cannot emit - not connected');
      return;
    }
    socketRef.current.emit(event, data);
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect]); // Only depend on autoConnect, not connect function

  return {
    socket: socketRef.current,
    isConnected,
    connect,
    disconnect,
    emit
  };
};

export default useSocket;
