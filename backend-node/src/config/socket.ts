import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken } from '../middleware/auth';
import { setupChatHandlers } from '../sockets/chat-socket';
import { setupVoiceHandlers } from '../sockets/voice-socket';

export interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
    tenantId?: string;
  };
}

/**
 * Initialize Socket.IO server with authentication and CORS
 */
export function initializeSocketIO(httpServer: HTTPServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST']
    },
    // Connection options - 5 minute timeout
    pingTimeout: 300000, // 5 minutes (300 seconds)
    pingInterval: 60000, // 1 minute ping interval
    // Enable compression
    perMessageDeflate: true
  });

  // Authentication middleware for Socket.IO
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      // Try to get token from multiple sources
      let token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      // If not in auth, check cookies (httpOnly cookies are sent with Socket.IO handshake)
      if (!token && socket.handshake.headers.cookie) {
        const cookies = socket.handshake.headers.cookie.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          acc[key] = value;
          return acc;
        }, {} as Record<string, string>);
        token = cookies.token;
      }
      
      if (!token) {
        console.error('[Socket.IO] No token found in auth, headers, or cookies');
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const decoded = verifyToken(token);
      socket.user = decoded as any;
      
      console.log('[Socket.IO] User authenticated:', socket.user?.email);
      next();
    } catch (error) {
      console.error('[Socket.IO] Authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log('[Socket.IO] Client connected:', socket.id, 'User:', socket.user?.email);

    // Join user-specific room for targeted messaging
    if (socket.user?.id) {
      socket.join(`user:${socket.user.id}`);
    }

    // Setup chat-specific event handlers
    setupChatHandlers(socket);

    // Setup voice streaming event handlers
    setupVoiceHandlers(socket);

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log('[Socket.IO] Client disconnected:', socket.id, 'Reason:', reason);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('[Socket.IO] Socket error:', error);
    });
  });

  console.log('[Socket.IO] Server initialized');
  return io;
}

export default initializeSocketIO;
