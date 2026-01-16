import * as dotenv from "dotenv";
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
import './config/passport';
import logger from './utils/logger';
import { correlationIdMiddleware, requestLoggerMiddleware, errorLoggerMiddleware } from './middleware/requestLogger';

dotenv.config();
logger.info('Application starting', { 
  environment: process.env.NODE_ENV,
  port: process.env.PORT || 5000,
  nodeVersion: process.version
});

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

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

// Initialize Redis connection (async, non-blocking)
connectRedis()
  .then(() => {
    // Redis connected successfully
    // Update session store if needed (requires server restart to pick up)
    logger.info('Redis available for session storage');
  })
  .catch(err => {
    logger.warn('Redis connection failed - using memory store for sessions', { error: err.message });
  });

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Add correlation ID and request logging
app.use(correlationIdMiddleware);
app.use(requestLoggerMiddleware);

// Configure Redis store for sessions
const sessionConfig: session.SessionOptions = {
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  name: 'ai_platform.sid',
  cookie: {
    secure: false, // Set to false for localhost development
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
};

// Use Redis store if connected, otherwise fallback to memory store
// Note: Redis connection is async, so this checks current state at startup
setTimeout(() => {
  if (redisClient.isReady) {
    logger.info('Redis is ready - sessions will be stored in Redis');
  } else {
    logger.warn('Redis not ready - sessions are using memory store');
  }
}, 2000);

// Configure session store
if (redisClient.isOpen) {
  sessionConfig.store = new RedisStore({
    client: redisClient,
    prefix: 'sess:',
    ttl: 86400 // 24 hours in seconds
  });
  logger.info('Configuring Redis for session storage');
} else {
  logger.warn('Redis not yet connected - using memory store for sessions (not recommended for production)');
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
