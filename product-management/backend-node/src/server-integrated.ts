import express from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';

// Import routes
import tenantAuthRoutes from './routes/tenant-auth';
import keycloakAuthRoutes from './routes/keycloak-auth';
import userProfileRoutes from './routes/user-profile';
import usageRoutes from './routes/usage';
import subscriptionsRoutes from './routes/subscriptions-routes';
import productsRoutes from './routes/products-routes';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000'),
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    }
  })
);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_platform')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Authentication routes
app.use('/api/auth', tenantAuthRoutes);
app.use('/api/auth', keycloakAuthRoutes);

// User profile & RBAC
app.use('/api/users', userProfileRoutes);

// Usage collection
app.use('/api/usage', usageRoutes);

// Application routes
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/products', productsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    keycloak: {
      url: process.env.KEYCLOAK_URL,
      realm: process.env.KEYCLOAK_REALM,
      clientId: process.env.KEYCLOAK_CLIENT_ID
    },
    mongodb: {
      connected: mongoose.connection.readyState === 1
    }
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'internal_server_error',
    message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(80));
  console.log('✅ PRODUCT MANAGEMENT BACKEND - KEYCLOAK INTEGRATED');
  console.log('='.repeat(80));
  console.log(`🌐 Server:        http://localhost:${PORT}`);
  console.log(`🔐 Keycloak:      ${process.env.KEYCLOAK_URL || 'http://localhost:9999'}`);
  console.log(`🌐 Realm:         ${process.env.KEYCLOAK_REALM || 'tenant-default'}`);
  console.log(`🆔 Client ID:     ${process.env.KEYCLOAK_CLIENT_ID || 'product-management'}`);
  console.log(`📊 MongoDB:       ${process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_platform'}`);
  console.log(`🖥️  Frontend:      ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
  console.log('='.repeat(80));
  console.log('\n📋 Available Endpoints:');
  console.log('   POST   /api/auth/tenant/lookup          - Tenant lookup');
  console.log('   GET    /api/auth/tenant/login           - Tenant-aware login');
  console.log('   GET    /api/auth/tenant/callback        - OAuth callback');
  console.log('   GET    /api/auth/keycloak/login         - Legacy Keycloak login');
  console.log('   GET    /api/users/me                    - User profile + RBAC');
  console.log('   POST   /api/usage/events                - Usage ingestion');
  console.log('   GET    /api/usage/summary               - Usage analytics');
  console.log('   GET    /api/subscriptions/active        - Active subscriptions');
  console.log('   GET    /health                          - Health check');
  console.log('='.repeat(80) + '\n');
});

export default app;
