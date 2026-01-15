# Session Management & Authentication Patterns

## Overview

This guide covers session management, JWT tokens, multi-device sessions, and secure authentication patterns in Express applications.

**Implementation Status:** Current backend uses express-session with memory store (not Redis) and JWT tokens with 24-hour expiration stored in HTTP-only cookies. This document shows the current implementation plus recommended patterns for production scaling with Redis and refresh tokens.

**Session Principles:**
- HTTP-only secure cookies for sessions
- JWT for API authentication
- Proper token expiration
- Device tracking for security
- Session revocation capability

## Express Session Configuration

### Basic Session Setup

```typescript
// src/config/session.ts
import session from 'express-session';
import Redis from 'ioredis';
import RedisStore from 'connect-redis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

export const sessionConfig = {
  store: new RedisStore({ client: redis }),
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true, // Prevent XSS access
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'lax', // CSRF protection
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
};

export default session(sessionConfig);
```

## JWT Authentication

### Token Generation

```typescript
// src/services/tokenService.ts
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

export interface TokenPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
  deviceId?: string;
  sessionId?: string;
}

export class TokenService {
  /**
   * Generate access token (short-lived)
   */
  static generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, process.env.JWT_SECRET || 'secret', {
      expiresIn: '15m', // 15 minutes
      issuer: 'api',
      audience: 'frontend',
    });
  }

  /**
   * Generate refresh token (long-lived)
   */
  static generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(
      { ...payload, tokenType: 'refresh' },
      process.env.JWT_REFRESH_SECRET || 'refresh-secret',
      {
        expiresIn: '7d', // 7 days
        issuer: 'api',
        jwtid: uuidv4(), // Unique ID for token revocation
      }
    );
  }

  /**
   * Generate token pair (access + refresh)
   */
  static generateTokenPair(payload: TokenPayload) {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, process.env.JWT_SECRET || 'secret') as TokenPayload;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw {
          status: 401,
          code: 'TOKEN_EXPIRED',
          message: 'Access token expired',
        };
      }
      throw {
        status: 401,
        code: 'INVALID_TOKEN',
        message: 'Invalid access token',
      };
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'refresh-secret') as TokenPayload;
    } catch (error) {
      throw {
        status: 401,
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid refresh token',
      };
    }
  }
}
```

### Token Refresh Endpoint

```typescript
// src/routes/authRoutes.ts
router.post('/refresh', async (req: ICustomRequest, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        error: 'No refresh token provided',
        code: 'REFRESH_TOKEN_REQUIRED',
      });
    }

    // Verify refresh token
    const payload = TokenService.verifyRefreshToken(refreshToken);

    // Check if token is revoked
    const isRevoked = await SessionService.isTokenRevoked(
      payload.sessionId!,
      payload.jti
    );

    if (isRevoked) {
      return res.status(401).json({
        error: 'Token has been revoked',
        code: 'TOKEN_REVOKED',
      });
    }

    // Generate new tokens
    const tokens = TokenService.generateTokenPair({
      userId: payload.userId,
      tenantId: payload.tenantId,
      email: payload.email,
      role: payload.role,
      deviceId: payload.deviceId,
      sessionId: payload.sessionId,
    });

    // Set secure cookies
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      expiresIn: tokens.expiresIn,
    });
  } catch (error) {
    next(error);
  }
});
```

## Multi-Device Session Management

### Session Tracking

```typescript
// src/services/sessionService.ts
import { Session } from '../models/Session';

export interface SessionData {
  userId: string;
  deviceId: string;
  deviceName: string;
  ipAddress: string;
  userAgent: string;
  lastActivity: Date;
  createdAt: Date;
}

export class SessionService {
  /**
   * Create new session for device
   */
  static async createSession(
    userId: string,
    deviceInfo: any
  ): Promise<{ sessionId: string; tokens: any }> {
    const sessionId = uuidv4();
    const deviceId = uuidv4();

    const session = new Session({
      sessionId,
      userId,
      deviceId,
      deviceName: deviceInfo.deviceName,
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
      lastActivity: new Date(),
      createdAt: new Date(),
    });

    await session.save();

    // Generate tokens with session info
    const tokens = TokenService.generateTokenPair({
      userId,
      tenantId: '', // Add from user
      email: '', // Add from user
      role: '', // Add from user
      deviceId,
      sessionId,
    });

    return { sessionId, tokens };
  }

  /**
   * Get all sessions for user
   */
  static async getUserSessions(userId: string): Promise<SessionData[]> {
    return Session.find({ userId })
      .select('deviceName ipAddress lastActivity createdAt')
      .sort({ lastActivity: -1 });
  }

  /**
   * Revoke specific session
   */
  static async revokeSession(sessionId: string): Promise<void> {
    await Session.deleteOne({ sessionId });
  }

  /**
   * Revoke all sessions for user
   */
  static async revokeAllSessions(userId: string): Promise<void> {
    await Session.deleteMany({ userId });
  }

  /**
   * Update last activity
   */
  static async updateLastActivity(sessionId: string): Promise<void> {
    await Session.updateOne(
      { sessionId },
      { lastActivity: new Date() }
    );
  }

  /**
   * Check if token is revoked
   */
  static async isTokenRevoked(sessionId: string, jti: string): Promise<boolean> {
    const session = await Session.findOne({ sessionId });
    return !session; // Token is revoked if session doesn't exist
  }
}
```

### Session Model

```typescript
// src/models/Session.ts
import { Schema, model, Document } from 'mongoose';

const sessionSchema = new Schema({
  sessionId: {
    type: String,
    unique: true,
    required: true,
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  deviceId: {
    type: String,
    required: true,
  },
  deviceName: String,
  ipAddress: String,
  userAgent: String,
  lastActivity: {
    type: Date,
    default: Date.now,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Auto-delete sessions after 7 days of inactivity
sessionSchema.index(
  { lastActivity: 1 },
  { expireAfterSeconds: 7 * 24 * 60 * 60 }
);

export const Session = model('Session', sessionSchema);
```

## Login/Logout Flows

### Login with Device Tracking

```typescript
// src/controllers/authController.ts
export async function login(req: ICustomRequest, res, next) {
  try {
    const { email, password } = req.body;

    // Validate credentials
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Extract device info
    const deviceInfo = {
      deviceName: req.headers['user-device'] || 'Unknown Device',
      ipAddress: req.ip || 'Unknown',
      userAgent: req.headers['user-agent'] || '',
    };

    // Create session
    const { sessionId, tokens } = await SessionService.createSession(
      user._id.toString(),
      deviceInfo
    );

    // Set secure cookies
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    res.json({
      success: true,
      sessionId,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    next(error);
  }
}
```

### Logout

```typescript
export async function logout(req: ICustomRequest, res, next) {
  try {
    const sessionId = req.user?.sessionId;

    if (sessionId) {
      // Revoke session
      await SessionService.revokeSession(sessionId);
    }

    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}
```

### Logout from All Devices

```typescript
export async function logoutAll(req: ICustomRequest, res, next) {
  try {
    const userId = req.userId!;

    // Revoke all sessions
    await SessionService.revokeAllSessions(userId);

    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.json({ success: true, message: 'Logged out from all devices' });
  } catch (error) {
    next(error);
  }
}
```

## OAuth2 with Sessions

### Google OAuth2 with Session

```typescript
// src/config/passport.ts
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: '/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Find or create user
        let user = await User.findOne({ email: profile.emails?.[0].value });

        if (!user) {
          user = new User({
            email: profile.emails?.[0].value,
            name: profile.displayName,
            googleId: profile.id,
            verified: true,
          });
          await user.save();
        }

        // Store tokens for API calls
        user.googleAccessToken = accessToken;
        if (refreshToken) {
          user.googleRefreshToken = refreshToken;
        }
        await user.save();

        done(null, user);
      } catch (error) {
        done(error);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (userId, done) => {
  const user = await User.findById(userId);
  done(null, user);
});
```

## Session Middleware

### Session Validation Middleware

```typescript
// src/middleware/sessionMiddleware.ts
export function validateSession(
  req: ICustomRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Not authenticated',
      code: 'UNAUTHORIZED',
    });
  }

  // Check session is still valid
  const sessionId = req.user.sessionId;
  if (!sessionId) {
    return res.status(401).json({
      error: 'Invalid session',
      code: 'INVALID_SESSION',
    });
  }

  // Update last activity
  SessionService.updateLastActivity(sessionId).catch(err => {
    console.error('Failed to update session activity:', err);
  });

  next();
}
```

## Session Security

### CSRF Protection

```typescript
// src/middleware/csrfMiddleware.ts
import csrf from 'csurf';

export const csrfProtection = csrf({ cookie: false });

// Use in routes
router.post('/form', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});
```

### Session Hijacking Prevention

```typescript
// Detect and prevent session hijacking
export async function validateUserAgent(
  req: ICustomRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user?.userAgent) {
    return next();
  }

  const currentUserAgent = req.headers['user-agent'];

  // Alert if user agent changes dramatically
  if (currentUserAgent !== req.user.userAgent) {
    console.warn(
      `Potential session hijacking for user ${req.userId}: User-Agent mismatch`
    );

    // Optional: Require re-authentication
    // return res.status(401).json({ error: 'Session compromised' });
  }

  next();
}
```

## Session Monitoring

```typescript
// src/monitoring/sessionMonitoring.ts
export class SessionMonitoring {
  /**
   * Monitor concurrent sessions per user
   */
  static async checkConcurrentSessions(userId: string): Promise<number> {
    const sessions = await Session.countDocuments({ userId });
    return sessions;
  }

  /**
   * Alert on suspicious activity
   */
  static async detectAnomalies(userId: string): Promise<void> {
    const sessions = await SessionService.getUserSessions(userId);

    // Check for multiple IPs
    const uniqueIps = new Set(sessions.map(s => s.ipAddress));
    if (uniqueIps.size > 3) {
      console.warn(`User ${userId} has sessions from ${uniqueIps.size} different IPs`);
    }

    // Check for logins at unusual times
    sessions.forEach(session => {
      const hour = new Date(session.createdAt).getHours();
      if (hour >= 2 && hour <= 5) {
        console.warn(`Unusual login time for user ${userId}: ${hour}:00`);
      }
    });
  }
}
```

## Session Best Practices Checklist

- [ ] Use HTTP-only cookies for session tokens
- [ ] Set Secure flag on cookies in production
- [ ] Implement proper token expiration (short-lived access, long-lived refresh)
- [ ] Use separate secrets for access and refresh tokens
- [ ] Implement session tracking per device
- [ ] Enable CSRF protection
- [ ] Monitor concurrent sessions
- [ ] Detect session hijacking attempts
- [ ] Validate user agent consistency
- [ ] Implement token revocation
- [ ] Auto-logout on suspicious activity
- [ ] Store sessions in Redis for distributed systems
- [ ] Implement logout from all devices
- [ ] Track and log all login attempts
- [ ] Regularly audit active sessions

## Related Documentation

- [MIDDLEWARE_GUIDE.md](MIDDLEWARE_GUIDE.md) - Middleware patterns
- [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) - Security best practices
- [LOGGING_MONITORING.md](LOGGING_MONITORING.md) - Monitoring and alerting
- [SERVICE_PATTERNS.md](SERVICE_PATTERNS.md) - Service patterns

