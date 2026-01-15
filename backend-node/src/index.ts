import * as dotenv from "dotenv";
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { connectDB } from './config/database';
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
import './config/passport';

dotenv.config();
console.log("Environment:", process.env.NODE_ENV);

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
    // Initialize development tenant after DB connection
    await ensureDevTenant();
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(session({
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
}));

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

// Load OpenAPI specification
const openapiPath = path.join(__dirname, '..', 'openapi.yaml');
const swaggerDocument = YAML.load(openapiPath);

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'AI Services Platform API Documentation'
}));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
  console.log(`Socket.IO enabled for real-time communication`);
});
