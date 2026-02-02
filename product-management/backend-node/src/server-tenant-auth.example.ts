// Server entry point with tenant-aware authentication
import express from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
import tenantAuthRoutes from './routes/tenant-auth';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000')
    }
  })
);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_platform')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', tenantAuthRoutes);

// User profile routes
const userProfileRoutes = require('./routes/user-profile').default;
app.use('/api/users', userProfileRoutes);

// Usage collection routes
const usageRoutes = require('./routes/usage').default;
app.use('/api/usage', usageRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔐 Tenant-aware authentication enabled`);
  console.log(`🌐 Keycloak URL: ${process.env.KEYCLOAK_URL || 'http://localhost:9999'}`);
});

export default app;
