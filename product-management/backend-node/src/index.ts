import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import session from 'express-session';
import RedisStore from 'connect-redis';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { env, validateEnv } from './config/env';
import { connectRedis, redisClient } from './config/redis';
import { redisPubSubService } from './services/redis-pubsub.service';
import { initializeSocketIO } from './config/socket';
console.log('[Startup] ✅ Socket.IO config imported');
import { maintenanceMode } from './middleware/maintenance';
console.log('[Startup] ✅ Maintenance middleware imported');
import authRoutes from './routes/auth';
console.log('[Startup] ✅ Auth routes imported');
import registrationRoutes from './routes/registration.routes';
console.log('[Startup] ✅ Registration routes imported');
import adminRoutes from './routes/admin.routes';
console.log('[Startup] ✅ Admin routes imported');
import userRoutes from './routes/user';
console.log('[Startup] ✅ User routes imported');
import productsRoutes from './routes/products-routes';
console.log('[Startup] ✅ Products routes imported');

import userProductsRoutes from './routes/user-products-routes';
console.log('[Startup] ✅ User-products routes imported');
import productConfigurationRoutes from './routes/product-configuration-routes';
console.log('[Startup] ✅ Product-config routes imported');
import subscriptionRoutes from './routes/subscription-routes';
console.log('[Startup] ✅ Subscription routes imported');
import productSignupRoutes from './routes/product-signup-routes';
console.log('[Startup] ✅ Product Signup routes imported');
import paymentRoutes from './routes/payment-routes';
console.log('[Startup] ✅ Payment routes imported');
import transactionsRoutes from './routes/transactions-routes';
console.log('[Startup] ✅ Transactions routes imported');
import voiceRoutes from './routes/voice-routes';
console.log('[Startup] ✅ Voice routes imported');
import usageRoutes from './routes/usage-routes';
console.log('[Startup] ✅ Usage routes imported');
import usageEventsRoutes from './routes/usage';
console.log('[Startup] ✅ Usage events routes imported');
import chatRoutes from './routes/chat-routes';
console.log('[Startup] ✅ Chat routes imported');
import assistantChannelsRoutes from './routes/assistant-channels-routes-v2';
console.log('[Startup] ✅ Assistant channels routes imported');
import promptRoutes from './routes/prompt-routes-v2';
console.log('[Startup] ✅ Prompt routes imported');
import promptManagementRoutes from './routes/prompt-management-routes';
console.log('[Startup] ✅ Prompt Management (PMS) routes imported');
import tenantPromptRoutes from './routes/tenant-prompt-routes';
console.log('[Startup] ✅ Tenant Prompt routes imported');
import promptTestingRoutes from './routes/prompt-testing-routes';
console.log('[Startup] ✅ Prompt Testing routes imported');
import ragRoutes from './routes/rag-routes';
console.log('[Startup] ✅ RAG routes imported');
import pmsMetricsRoutes from './routes/metrics-routes';
console.log('[Startup] ✅ PMS Metrics routes (Phase 7) imported');
import snapshotRoutes from './routes/snapshot-routes';
console.log('[Startup] ✅ Snapshot routes (Phase 7) imported');

import circuitRoutes from './routes/circuit-routes';
console.log('[Startup] ✅ Circuit routes imported');
import healthRoutes from './routes/health-routes';
console.log('[Startup] ✅ Health routes imported');
import agentRoutes from './routes/agent-routes';
console.log('[Startup] ✅ Agent routes imported');
import analyticsRoutes from './routes/analytics-routes';
console.log('[Startup] ✅ Analytics routes imported');

import callLogsRoutes from './routes/call-logs-routes';
console.log('[Startup] ✅ Call-logs routes imported');
import metricsRoutes from './routes/metrics-routes';
console.log('[Startup] ✅ Metrics routes imported');
import logsRoutes from './routes/logs-routes';
console.log('[Startup] ✅ Logs routes imported');
import cacheRoutes from './routes/cache.routes';
console.log('[Startup] ✅ Cache routes imported');
import './config/passport';
console.log('[Startup] ✅ Passport config imported');
import logger from './utils/logger';
import { startCircuitBreakerMonitoring, stopCircuitBreakerMonitoring } from './services/circuitBreakerMonitor';
console.log('[Startup] ✅ Circuit breaker monitor imported');



console.log('[Startup] ✅ Logger imported');
import { correlationIdMiddleware, requestLoggerMiddleware, errorLoggerMiddleware } from './middleware/requestLogger';
console.log('[Startup] ✅ Request logger middleware imported');
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
console.log('[Startup] ✅ Error handlers imported');
import { initializeSentry, sentryUserContext } from './middleware/sentry.middleware';
console.log('[Startup] ✅ Sentry middleware imported');
import { initializeAppInsights, appInsightsMiddleware } from './middleware/appInsights.middleware';
console.log('[Startup] ✅ Application Insights middleware imported');
import { applySecurityMiddleware } from './middleware/security.middleware';
console.log('[Startup] ✅ Security middleware imported');
import mongoose from 'mongoose';
console.log('[Startup] ✅ Mongoose imported');

// faulty routes below - to be fixed
import subscriptionsRoutes from './routes/subscriptions-routes';
console.log('[Startup] ✅ Subscriptions-info routes imported');
import tenantRoutes from './routes/tenant-routes';
console.log('[Startup] ✅ Tenant routes imported');
import tenantAuthRoutes from './routes/tenant-auth';
console.log('[Startup] ✅ Tenant-auth routes imported');
// end faulty routes

console.log('[Startup] 🎉 ALL IMPORTS COMPLETED - Starting main execution...');





console.log('='.repeat(60));
console.log('🚀 BACKEND STARTUP SEQUENCE');
console.log('='.repeat(60));

// Validate environment variables before starting
try {
  console.log('\n[1/10] 🔍 Validating environment variables...');
  validateEnv();
  console.log('✅ [1/10] Environment validation passed');
} catch (error: any) {
  console.error('❌ [1/10] Environment validation FAILED:', error.message);
  process.exit(1);
}

// Global error handlers - MUST be set before any async operations
try {
  console.log('\n[2/10] 🛡️  Setting up global error handlers...');
  
  process.on('uncaughtException', (error: Error) => {
  logger.error('💥 UNCAUGHT EXCEPTION - Server will shut down', {
    error: error.message,
    stack: error.stack,
    name: error.name
  });
  console.error('\n💥 UNCAUGHT EXCEPTION:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('💥 UNHANDLED REJECTION - Server will shut down', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise.toString()
  });
  console.error('\n💥 UNHANDLED REJECTION:', reason);
  process.exit(1);
});

  console.log('✅ [2/10] Global error handlers configured');
} catch (error: any) {
  console.error('❌ [2/10] Failed to set up error handlers:', error.message);
  process.exit(1);
}

// Server state tracking for graceful shutdown
let serverState: 'running' | 'draining' | 'shutdown' = 'running';
export const getServerState = () => serverState;

/**
 * Graceful shutdown handler
 * 1. Notify WebSocket clients of maintenance
 * 2. Mark server as draining (stops accepting new connections)
 * 3. Wait for active connections to complete (max 30s)
 * 4. Close all services (MongoDB, Redis, Socket.IO)
 * 5. Exit process
 */
async function gracefulShutdown(signal: string) {
  logger.info(`${signal} signal received - initiating graceful shutdown`);
  
  if (serverState !== 'running') {
    logger.warn('Shutdown already in progress');
    return;
  }

  serverState = 'draining';
  const shutdownStartTime = Date.now();

  try {
    // Step 1: Notify all connected WebSocket clients
    logger.info('Notifying WebSocket clients of maintenance...');
    io.emit('server:maintenance', {
      message: 'Server is shutting down for maintenance',
      reconnectIn: 30000, // 30 seconds
      timestamp: new Date().toISOString()
    });

    // Give clients 2 seconds to receive the notification
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Stop accepting new HTTP connections
    logger.info('Stopping acceptance of new connections...');
    await new Promise<void>((resolve) => {
      httpServer.close(() => {
        logger.info('HTTP server closed');
        resolve();
      });
      // Timeout in case close hangs
      setTimeout(() => resolve(), 3000);
    });

    // Step 3: Wait for active connections to complete (max 30s)
    const drainTimeout = 30000;
    const activeConnections: Set<any> = new Set();
    
    // Track active connections
    httpServer.on('connection', (conn: any) => {
      activeConnections.add(conn);
      conn.on('close', () => {
        activeConnections.delete(conn);
      });
    });

    // Wait for connections to drain or timeout
    let checkInterval: NodeJS.Timeout | null = null;
    const drainPromise = new Promise<void>((resolve) => {
      checkInterval = setInterval(() => {
        const elapsed = Date.now() - shutdownStartTime;
        if (activeConnections.size === 0 || elapsed >= drainTimeout) {
          if (checkInterval) clearInterval(checkInterval);
          checkInterval = null;
          logger.info(`Connection draining complete. Active: ${activeConnections.size}, Elapsed: ${elapsed}ms`);
          resolve();
        }
      }, 500);
    });

    await Promise.race([
      drainPromise,
      new Promise(resolve => setTimeout(resolve, drainTimeout))
    ]);
    
    // Ensure interval is cleared even if timeout wins the race
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }

    // Step 4: Close Socket.IO connections
    logger.info('Closing Socket.IO connections...');
    const sockets = await io.fetchSockets();
    for (const socket of sockets) {
      socket.disconnect(true);
    }
    
    // Close Socket.IO server with callback to ensure it completes
    await new Promise<void>((resolve) => {
      io.close(() => {
        logger.info('Socket.IO server closed');
        resolve();
      });
      // Timeout in case close hangs
      setTimeout(() => resolve(), 3000);
    });

    // Step 4.5: Stop circuit breaker monitoring
    logger.info('Stopping circuit breaker monitoring...');
    stopCircuitBreakerMonitoring();

    // Step 4.6: Stop background jobs (Phase 2)
    try {
      logger.info('Stopping background jobs...');
      const { shutdownJobs } = require('./jobs');
      shutdownJobs();
      logger.info('Background jobs stopped');
    } catch (jobError: any) {
      logger.warn('Failed to stop background jobs', { error: jobError.message });
    }

    // Step 5: Close database connections
    logger.info('Closing MongoDB connection...');
    await mongoose.connection.close();

    // Step 6: Close Redis connection
    if (redisClient.isOpen) {
      logger.info('Closing Redis connection...');
      await redisClient.quit();
    }

    serverState = 'shutdown';
    const totalTime = Date.now() - shutdownStartTime;
    logger.info(`Graceful shutdown completed in ${totalTime}ms`);
    
    // Force exit to ensure process terminates
    setTimeout(() => {
      logger.warn('Forcing process exit after 2s timeout');
      process.exit(0);
    }, 2000).unref(); // unref allows process to exit before timeout if event loop is clear
    
    process.exit(0);

  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    serverState = 'shutdown';
    process.exit(1);
  }
}

try {
  console.log('\n[3/10] 📝 Application initialization...');
  
  logger.info('Application starting', { 
    environment: env.NODE_ENV,
    port: env.PORT,
    nodeVersion: process.version
  });

  console.log('✅ [3/10] Logger initialized');
} catch (error: any) {
  console.error('❌ [3/10] Logger initialization failed:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}

let app: express.Application;
let httpServer: any;
let io: any;
const PORT = env.PORT;

try {
  console.log('\n[4/10] 🌐 Creating Express app and HTTP server...');
  
  app = express();
  httpServer = createServer(app);
  
  console.log('✅ [4/10] Express and HTTP server created');
} catch (error: any) {
  console.error('❌ [4/10] Failed to create Express/HTTP server:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}

// Initialize MongoDB connection with Mongoose
try {
  console.log('\n[5/10] 🗄️  Connecting to MongoDB with Mongoose...');

  // Connect Mongoose (required for all Mongoose models like User, Product, etc.)
  mongoose.connect(env.MONGODB_URI)
    .then(async () => {
      const dbName = mongoose.connection.db?.databaseName;
      logger.info('Mongoose connected successfully', { database: dbName });
      console.log('✅ [5/10] Mongoose connected successfully');
      console.log(`   Database: ${dbName}`);
      console.log(`   Host: ${mongoose.connection.host}`);
      console.log(`   Models ready: User, Product, Transaction, etc.`);
      
      // Start circuit breaker monitoring (every 60 seconds)
      console.log('\n[CB Monitor] Starting circuit breaker health monitoring...');
      startCircuitBreakerMonitoring(60000); // Check every 60 seconds
      console.log('[CB Monitor] ✅ Circuit breaker monitoring active');
      
      // Dev tenant and SSO service initialization removed - using Keycloak
    })
    .catch(err => {
      logger.error('Failed to connect Mongoose to MongoDB', { error: err.message, stack: err.stack });
      console.error('❌ [5/10] Mongoose connection FAILED:', err.message);
      console.error('Stack:', err.stack);
      console.error('MongoDB URI:', env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')); // Hide password
      process.exit(1);
    });
} catch (error: any) {
  console.error('❌ [5/10] MongoDB setup FAILED:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}

// Middleware
let sessionMiddleware: express.RequestHandler;

try {
  console.log('\n[6/10] ⚙️  Configuring middleware...');
  
  app.use(cors({
  origin: env.CORS_ORIGINS,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Initialize monitoring and error tracking
initializeSentry(app);
initializeAppInsights();

// Apply security headers (CSP, HSTS, etc.)
applySecurityMiddleware(app);

// Add correlation ID and request logging
app.use(correlationIdMiddleware);
app.use(requestLoggerMiddleware);

// Add Application Insights request tracking
app.use(appInsightsMiddleware);

// Add Sentry user context
app.use(sentryUserContext);

// Add maintenance mode middleware (must be after logging, before routes)
app.use(maintenanceMode);

// Configure session store based on environment
const sessionConfig: session.SessionOptions = {
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'ai_platform.sid',
  cookie: {
    secure: env.SESSION_COOKIE_SECURE,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: env.SESSION_COOKIE_MAX_AGE
  }
};

// Use Redis in production, memory store in development
if (env.NODE_ENV === 'production') {
  // Initialize Redis connection (required in production)
  connectRedis()
    .then(async () => {
      logger.info('✅ Redis connected successfully - sessions will persist');

      // Initialize Redis Pub/Sub for cross-service cache invalidation (Phase 7)
      await redisPubSubService.init();
      logger.info('✅ Redis Pub/Sub initialized for cache invalidation');
    })
    .catch(err => {
      logger.error('❌ Redis connection failed in production - this is critical!', { error: err.message });
      process.exit(1); // Fail fast in production if Redis is not available
    });
  
  // Wait a moment for Redis to connect, then configure session store
  setTimeout(() => {
    if (redisClient.isReady) {
      sessionConfig.store = new RedisStore({
        client: redisClient,
        prefix: 'sess:',
        ttl: 86400 // 24 hours in seconds
      });
      logger.info('📝 Production: Using Redis for session storage');
    } else {
      logger.error('❌ Redis not ready after connection attempt');
      process.exit(1);
    }
  }, 1000);
} else {
  // Development: Use memory store (sessions will be lost on restart)
  logger.info('💾 Development: Using memory store for sessions (sessions lost on restart)');
  
  // Still try to connect to Redis in background (optional for dev)
  connectRedis()
    .then(async () => {
      logger.info('ℹ️  Redis available in development (not used for sessions)');

      // Initialize Redis Pub/Sub for cache invalidation (Phase 7)
      await redisPubSubService.init();
      logger.info('✅ Redis Pub/Sub initialized in development');
    })
    .catch(err => {
      logger.info('ℹ️  Redis not available in development - using memory store', { error: err.message });
    });
}

  sessionMiddleware = session(sessionConfig);
  app.use(sessionMiddleware);

  // Passport middleware (works with or without OAuth configured)
  app.use(passport.initialize());
  app.use(passport.session());

  console.log('✅ [6/10] Middleware configured successfully');
} catch (error: any) {
  console.error('❌ [6/10] Middleware configuration FAILED:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}

// Initialize Socket.IO with session support
try {
  console.log('\n[7/10] 🔌 Initializing Socket.IO with session support...');
  
  io = initializeSocketIO(httpServer, sessionMiddleware);
  
  // Make io instance available to routes via app locals
  app.locals.io = io;
  
  console.log('✅ [7/10] Socket.IO initialized successfully');
} catch (error: any) {
  console.error('❌ [7/10] Socket.IO initialization FAILED:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}

// Routes
try {
  console.log('\n[8/10] 🛣️  Registering routes...');
  
  app.use('/api/auth', authRoutes);
  app.use('/api/auth', registrationRoutes); // Registration endpoints
  app.use('/api/registration', registrationRoutes); // Also mount at /api/registration
  app.use('/api/admin', adminRoutes); // Admin dashboard endpoints
  app.use('/api/user', userRoutes);
  app.use('/api/products', productsRoutes);
  app.use('/api/user-products', userProductsRoutes);
  app.use('/api/product-configurations', productConfigurationRoutes);
  app.use('/api/subscriptions', subscriptionRoutes);
  app.use('/api/subscriptions-info', subscriptionsRoutes);
  app.use('/api/product-signup', productSignupRoutes);
  app.use('/api/payment-methods', paymentRoutes);
  app.use('/api/transactions', transactionsRoutes);
  app.use('/api/tenants', tenantRoutes);
  app.use('/voice', voiceRoutes);
  app.use('/api/usage', usageRoutes);
  app.use('/api/usage', usageEventsRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/assistant-channels', assistantChannelsRoutes);
  app.use('/api/prompts', promptRoutes);
  app.use('/api/pms/prompts', promptManagementRoutes); // PMS: Prompt Management System
  app.use('/api/pms/tenant-prompts', tenantPromptRoutes); // PMS: Tenant Prompt Bindings
  app.use('/api/pms/prompt-testing', promptTestingRoutes); // PMS: Automated Prompt Testing
  app.use('/api/pms/rag', ragRoutes); // PMS: Per-Prompt RAG Configuration
  app.use('/api/pms/metrics', pmsMetricsRoutes); // PMS Phase 7: Usage Metrics
  app.use('/api/pms/snapshots', snapshotRoutes); // PMS Phase 7: Session Snapshots
  app.use('/api/circuit', circuitRoutes);
  app.use('/api/health', healthRoutes);
  app.use('/api/cache', cacheRoutes); // Unified cache API
  app.use('/api/agent', agentRoutes); // Spring AI Agent routes
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/call-logs', callLogsRoutes);
  app.use('/api/metrics', metricsRoutes);
  app.use('/api/logs', logsRoutes);
  app.use('/api/auth', tenantAuthRoutes); // Keycloak tenant-aware authentication

  console.log('✅ [8/10] All routes registered successfully');
} catch (error: any) {
  console.error('❌ [8/10] Route registration FAILED:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}

// Load OpenAPI specification
try {
  console.log('\n[9/10] 📚 Setting up Swagger documentation...');
  
  const openapiPath = path.join(__dirname, '..', 'openapi.yaml');
  const swaggerDocument = YAML.load(openapiPath);

  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'AI Services Platform API Documentation'
  }));

  // Legacy health check endpoint (kept for backward compatibility)
  app.get('/health', (req, res) => {
    res.redirect(301, '/api/health');
  });

  // Error logging middleware (before error handlers)
  app.use(errorLoggerMiddleware);

  // Note: Sentry error handler is set up via initializeSentry() at app startup

  // 404 handler for unmatched routes
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);
  
  console.log('✅ [9/10] Swagger and error handlers configured');
} catch (error: any) {
  console.error('❌ [9/10] Swagger/error handler setup FAILED:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}

// Start server with error handling
try {
  console.log('\n[10/10] 🚀 Starting HTTP server...');
  
  httpServer.listen(PORT, () => {
    logger.info('Server started successfully', {
      port: PORT,
      apiDocs: `http://localhost:${PORT}/api-docs`,
      socketIO: 'enabled',
      environment: process.env.NODE_ENV
    });

    // Initialize background jobs (Phase 2)
    try {
      const { initializeJobs } = require('./jobs');
      initializeJobs();
      logger.info('Background jobs initialized');
    } catch (jobError: any) {
      logger.error('Failed to initialize background jobs', { error: jobError.message });
      console.error('⚠️  Warning: Background jobs failed to start:', jobError.message);
    }

    // Register graceful shutdown handlers after server is running
    // This ensures httpServer and io are initialized before handlers are called
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    logger.info('Graceful shutdown handlers registered');

    console.log('\n' + '='.repeat(60));
    console.log('✅ [10/10] SERVER STARTED SUCCESSFULLY');
    console.log('='.repeat(60));
    console.log(`🌐 API: http://localhost:${PORT}`);
    console.log(`📖 Docs: http://localhost:${PORT}/api-docs`);
    console.log(`🔌 Socket.IO: enabled`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    console.log('='.repeat(60) + '\n');
  }).on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`❌ Port ${PORT} is already in use. Another instance may be running.`, {
        error: error.message,
        port: PORT
      });
      console.error(`\n❌ ERROR: Port ${PORT} is already in use!`);
      console.error('   Try one of these solutions:');
      console.error(`   1. Kill the process using port ${PORT}: Get-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess | Stop-Process -Force`);
      console.error('   2. Change the PORT in your .env file');
      console.error('   3. Wait a moment and try again (previous instance may be shutting down)\n');
      process.exit(1);
    } else {
      logger.error('Failed to start server', { error: error.message, code: error.code });
      console.error('\n❌ Server startup failed:', error);
      process.exit(1);
    }
  });
} catch (error: any) {
  console.error('❌ [10/10] Server startup FAILED:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}