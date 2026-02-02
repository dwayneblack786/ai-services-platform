import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { RequestHandler } from 'express';
import User from '../models/User';

console.log('[Socket.IO] 📦 Starting socket module imports...');
import { setupChatHandlers } from '../sockets/chat-socket';
console.log('[Socket.IO] ✅ Chat handlers imported');
import { setupVoiceHandlers } from '../sockets/voice-socket';
console.log('[Socket.IO] ✅ Voice handlers imported (gRPC client should be initialized)');
import { setupVoipStreamHandlers } from '../sockets/voip-stream-socket';
console.log('[Socket.IO] ✅ VoIP stream handlers imported');

export interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
    name?: string;
    tenantId?: string;
    role?: string;
  };
}

/**
 * Initialize Socket.IO server with session-based authentication
 */
export function initializeSocketIO(httpServer: HTTPServer, sessionMiddleware: RequestHandler): Server {
  console.log('[Socket.IO] 🔧 Creating Socket.IO server instance...');
  
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

  // Session-based authentication middleware for Socket.IO
  io.use((socket: AuthenticatedSocket, next) => {
    const req = socket.request as any;
    const res = {} as any; // Mock response object
    
    console.log('[Socket.IO] ==========================================');
    console.log('[Socket.IO] Authenticating new connection...');
    console.log('[Socket.IO] Headers:', {
      cookie: req.headers?.cookie ? 'Present' : 'Missing',
      origin: req.headers?.origin, 
      referer: req.headers?.referer
    });
    
    if (req.headers?.cookie) {
      // Parse cookies to check for session cookie
      const cookies = req.headers.cookie.split(';').reduce((acc: any, cookie: string) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {});
      console.log('[Socket.IO] Parsed cookies:', Object.keys(cookies));
      console.log('[Socket.IO] Has ai_platform.sid:', !!cookies['ai_platform.sid']);
    }
    
    // Call the session middleware to parse and attach session to req
    sessionMiddleware(req, res, async (err?: any) => {
      if (err) {
        console.error('[Socket.IO] Session middleware error:', err);
        return next(new Error('Session error'));
      }
      
      console.log('[Socket.IO] After session middleware:');
      console.log('[Socket.IO]   - Has session:', !!req.session);
      console.log('[Socket.IO]   - Session ID:', req.session?.id);
      console.log('[Socket.IO]   - Has passport:', !!req.session?.passport);
      console.log('[Socket.IO]   - Passport user (serialized):', req.session?.passport?.user);
      
      // Check if user is authenticated via session
      if (!req.session || !req.session.passport || !req.session.passport.user) {
        console.error('[Socket.IO] ❌ No authenticated session found');
        console.error('[Socket.IO] Please login via /api/auth/tenant/login first');
        return next(new Error('Authentication required - please login first'));
      }
      
      // Passport stores only the user ID in the session (serialized)
      // We need to deserialize it by loading the full user from database
      const userId = req.session.passport.user;
      console.log('[Socket.IO] Deserializing user ID:', userId);
      
      try {
        const user = await User.findById(userId).select('-passwordHash').lean();
        
        if (!user) {
          console.error('[Socket.IO] ❌ User not found in database:', userId);
          return next(new Error('User not found'));
        }
        
        console.log('[Socket.IO]   - User email:', user.email);
        console.log('[Socket.IO]   - User _id:', user._id);
        console.log('[Socket.IO]   - User tenantId:', user.tenantId);
        
        // Attach deserialized user to socket
        socket.user = {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          tenantId: user.tenantId,
          role: user.role
        };
        
        console.log('[Socket.IO] ✅ User authenticated:', socket.user.email, 'ID:', socket.user.id);
        console.log('[Socket.IO] ==========================================');
        next();
      } catch (error) {
        console.error('[Socket.IO] ❌ Error loading user from database:', error);
        return next(new Error('Failed to load user'));
      }
    });
  });
  
  console.log('[Socket.IO] ✅ Session-based authentication middleware configured');

  // Connection handler
  console.log('[Socket.IO] 🎧 Setting up connection handler...');
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

  // Setup VoIP provider stream handlers (separate namespace, no auth required)
  console.log('[Socket.IO] 📞 Setting up VoIP stream handlers...');
  setupVoipStreamHandlers(io);
  console.log('[Socket.IO] ✅ VoIP handlers configured');

  console.log('[Socket.IO] ✅ Server initialized and ready for connections');
  return io;
}

export default initializeSocketIO;
