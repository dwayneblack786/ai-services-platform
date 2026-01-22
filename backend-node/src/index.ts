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
import { connectDB } from './config/database';
import { connectRedis, redisClient } from './config/redis';
import { initializeSocketIO } from './config/socket';
import authRoutes, { ensureDevTenant } from './routes/auth';
import userRoutes from './routes/user';
import productsRoutes from './routes/products-routes';
import tenantRoutes from './routes/tenant-routes';
import userProductsRoutes from './routes/user-products-routes';
import productConfigurationRoutes from './routes/product-configuration-routes';
import subscriptionRoutes from './routes/subscription-routes';
import paymentRoutes from './routes/payment-routes';
import transactionsRoutes from './routes/transactions-routes';
import voiceRoutes from './routes/voice-routes';
import usageRoutes from './routes/usage-routes';
import chatRoutes from './routes/chat-routes';
import assistantChannelsRoutes from './routes/assistant-channels-routes-v2';
import promptRoutes from './routes/prompt-routes-v2';
import subscriptionsRoutes from './routes/subscriptions-routes';
import circuitRoutes from './routes/circuit-routes';
import healthRoutes from './routes/health-routes';
import agentRoutes from './routes/agent-routes';
import analyticsRoutes from './routes/analytics-routes';
import callLogsRoutes from './routes/call-logs-routes';
import './config/passport';
import logger from './utils/logger';
import { correlationIdMiddleware, requestLoggerMiddleware, errorLoggerMiddleware } from './middleware/requestLogger';

// Validate environment variables before starting
validateEnv();

logger.info('Application starting', { 
  environment: env.NODE_ENV,
  port: env.PORT,
  nodeVersion: process.version
});

const app = express();
const httpServer = createServer(app);
const PORT = env.PORT;

// Initialize Socket.IO
const io = initializeSocketIO(httpServer);

// Make io instance available to routes via app locals
app.locals.io = io;

// Initialize MongoDB connection
connectDB()
  .then(async () => {
    logger.info('MongoDB connected successfully');
    // Initialize development tenant after DB connection
    await ensureDevTenant();
    logger.info('Development tenant initialized');
  })
  .catch(err => {
    logger.error('Failed to connect to MongoDB', { error: err.message, stack: err.stack });
    console.error('MongoDB Error:', err);
    process.exit(1);
  });

// Middleware
app.use(cors({
  origin: env.CORS_ORIGINS,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Add correlation ID and request logging
app.use(correlationIdMiddleware);
app.use(requestLoggerMiddleware);

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
    .then(() => {
      logger.info('✅ Redis connected successfully - sessions will persist');
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
    .then(() => {
      logger.info('ℹ️  Redis available in development (not used for sessions)');
    })
    .catch(err => {
      logger.info('ℹ️  Redis not available in development - using memory store', { error: err.message });
    });
}

app.use(session(sessionConfig));

// Passport middleware (works with or without OAuth configured)
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/user-products', userProductsRoutes);
app.use('/api/product-configurations', productConfigurationRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/subscriptions-info', subscriptionsRoutes);
app.use('/api/payment-methods', paymentRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/voice', voiceRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/assistant-channels', assistantChannelsRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/circuit', circuitRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/agent', agentRoutes); // Spring AI Agent routes
app.use('/api/analytics', analyticsRoutes);
app.use('/api/call-logs', callLogsRoutes);

// Load OpenAPI specification
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

httpServer.listen(PORT, () => {
  logger.info('Server started successfully', {
    port: PORT,
    apiDocs: `http://localhost:${PORT}/api-docs`,
    socketIO: 'enabled',
    environment: process.env.NODE_ENV
  });
});
