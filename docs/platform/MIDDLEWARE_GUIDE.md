# Middleware Guide & Implementation

## Overview

This guide covers middleware patterns, lifecycle, composition, and implementation strategies for Express.js applications.

**Middleware Principles:**
- Single responsibility per middleware
- Proper ordering (security → parsing → routes)
- Error handling and propagation
- Performance optimization
- Clean request/response flow

## Middleware Architecture

### Middleware Lifecycle

```
Request
   ↓
Security Middleware (helmet, CORS)
   ↓
Parsing Middleware (JSON, URL-encoded)
   ↓
Data Sanitization
   ↓
Rate Limiting
   ↓
Authentication & Session
   ↓
Authorization & Validation
   ↓
Business Logic (Routes)
   ↓
Error Handling
   ↓
Response
```

## Authentication Middleware

### JWT Authentication

```typescript
// src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CONFIG } from '../config/constants';

export interface ICustomRequest extends Request {
  userId?: string;
  tenantId?: string;
  user?: any;
}

/**
 * Verify JWT token from Authorization header or cookies
 */
export async function verifyJWT(
  req: ICustomRequest,
  res: Response,
  next: NextFunction
) {
  try {
    let token: string | undefined;

    // Check Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // Check cookies (session-based)
    if (!token && req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({
        error: 'No authentication token provided',
        code: 'UNAUTHORIZED',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, CONFIG.JWT_SECRET) as any;

    // Attach to request
    req.userId = decoded.userId;
    req.tenantId = decoded.tenantId;
    req.user = decoded;

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token has expired',
        code: 'TOKEN_EXPIRED',
      });
    }

    res.status(401).json({
      error: 'Invalid authentication token',
      code: 'INVALID_TOKEN',
    });
  }
}

/**
 * Optional authentication (doesn't require token, but validates if present)
 */
export async function optionalJWT(
  req: ICustomRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.headers.authorization?.substring(7);

    if (token) {
      const decoded = jwt.verify(token, CONFIG.JWT_SECRET) as any;
      req.userId = decoded.userId;
      req.tenantId = decoded.tenantId;
      req.user = decoded;
    }
  } catch (error) {
    // Ignore errors, user is optional
  }

  next();
}

/**
 * Refresh token middleware
 */
export async function refreshToken(
  req: ICustomRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        error: 'No refresh token provided',
        code: 'REFRESH_TOKEN_REQUIRED',
      });
    }

    const decoded = jwt.verify(refreshToken, CONFIG.JWT_SECRET) as any;

    // Generate new access token
    const newAccessToken = jwt.sign(
      {
        userId: decoded.userId,
        tenantId: decoded.tenantId,
        email: decoded.email,
      },
      CONFIG.JWT_SECRET,
      { expiresIn: CONFIG.JWT_EXPIRES_IN }
    );

    // Set in secure HTTP-only cookie
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({ success: true, token: newAccessToken });
  } catch (error) {
    res.status(401).json({
      error: 'Invalid refresh token',
      code: 'INVALID_REFRESH_TOKEN',
    });
  }
}
```

### Role-Based Access Control Middleware

```typescript
// src/middleware/rbacMiddleware.ts
/**
 * Verify user has required role
 */
export function requireRole(allowedRoles: string[]) {
  return (req: ICustomRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'UNAUTHORIZED',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        requiredRoles: allowedRoles,
        userRole: req.user.role,
      });
    }

    next();
  };
}

/**
 * Verify user has specific permission
 */
export function requirePermission(permission: string) {
  return (req: ICustomRequest, res: Response, next: NextFunction) => {
    if (!req.user?.permissions?.includes(permission)) {
      return res.status(403).json({
        error: 'Missing required permission',
        code: 'FORBIDDEN',
        required: permission,
      });
    }

    next();
  };
}

/**
 * Verify access to specific resource
 */
export function requireResourceAccess(resourceType: 'tenant' | 'product') {
  return async (req: ICustomRequest, res: Response, next: NextFunction) => {
    try {
      const resourceId = req.params.id || req.query.id;

      if (!resourceId) {
        return next();
      }

      let hasAccess = false;

      if (resourceType === 'tenant') {
        // Check if user is part of tenant
        hasAccess = req.tenantId === resourceId || req.user.role === 'SUPER_ADMIN';
      } else if (resourceType === 'product') {
        // Check if product belongs to user's tenant
        const product = await Product.findOne({
          _id: resourceId,
          tenantId: req.tenantId,
        });
        hasAccess = !!product || req.user.role === 'SUPER_ADMIN';
      }

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Access denied to this resource',
          code: 'FORBIDDEN',
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
```

## Request Validation Middleware

```typescript
// src/middleware/validationMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import * as Joi from 'joi';

/**
 * Validate request body, query, or params
 */
export function validateRequest(
  schema: Joi.ObjectSchema,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const data = req[source];

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.reduce(
        (acc, detail) => {
          acc[detail.path.join('.')] = detail.message;
          return acc;
        },
        {} as Record<string, string>
      );

      return res.status(422).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details,
      });
    }

    // Replace request data with validated data
    req[source] = value;
    next();
  };
}

/**
 * Common validation schemas
 */
export const schemas = {
  createUser: Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().min(2).max(100).required(),
    password: Joi.string().min(8).required(),
    role: Joi.string().valid('USER', 'TENANT_USER', 'TENANT_ADMIN'),
  }),

  updateUser: Joi.object({
    email: Joi.string().email(),
    name: Joi.string().min(2).max(100),
    password: Joi.string().min(8),
  }).min(1),

  createProduct: Joi.object({
    name: Joi.string().min(3).required(),
    description: Joi.string().max(1000),
    category: Joi.string()
      .valid('virtual-assistant', 'document-processing', 'computer-vision')
      .required(),
    price: Joi.number().min(0),
  }),

  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string(),
  }),
};

// Usage in routes
router.post(
  '/users',
  validateRequest(schemas.createUser, 'body'),
  createUserController
);
```

## Data Processing Middleware

### Sanitization Middleware

```typescript
// src/middleware/sanitizationMiddleware.ts
import mongoSanitize from 'express-mongo-sanitize';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Prevent NoSQL injection
 */
export const preventNosqlInjection = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`Potential NoSQL injection attempt in ${key}`);
  },
});

/**
 * Sanitize HTML content
 */
export function sanitizeHtml(
  req: ICustomRequest,
  res: Response,
  next: NextFunction
) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  next();
}

function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return DOMPurify.sanitize(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (typeof obj === 'object' && obj !== null) {
    return Object.keys(obj).reduce(
      (acc, key) => {
        acc[key] = sanitizeObject(obj[key]);
        return acc;
      },
      {} as any
    );
  }

  return obj;
}

/**
 * Trim string fields
 */
export function trimStrings(
  req: ICustomRequest,
  res: Response,
  next: NextFunction
) {
  if (req.body && typeof req.body === 'object') {
    trimObject(req.body);
  }

  next();
}

function trimObject(obj: any): void {
  Object.keys(obj).forEach(key => {
    if (typeof obj[key] === 'string') {
      obj[key] = obj[key].trim();
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      trimObject(obj[key]);
    }
  });
}
```

## Request Logging Middleware

```typescript
// src/middleware/loggingMiddleware.ts
import { v4 as uuidv4 } from 'uuid';

/**
 * Request/response logging with request ID
 */
export function requestLogger(
  req: ICustomRequest,
  res: Response,
  next: NextFunction
) {
  const requestId = uuidv4();
  const startTime = Date.now();

  // Attach request ID to request
  req.id = requestId;

  // Override res.json to log response
  const originalJson = res.json.bind(res);
  res.json = function (data: any) {
    const duration = Date.now() - startTime;

    const logData = {
      requestId,
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      userId: req.userId,
      tenantId: req.tenantId,
      userAgent: req.headers['user-agent'],
    };

    if (res.statusCode >= 400) {
      console.error('HTTP Error:', logData);
    } else {
      console.log('HTTP Request:', logData);
    }

    return originalJson(data);
  };

  next();
}

/**
 * Structured logging with Winston or Pino
 */
export function structuredLogger(logger: any) {
  return (req: ICustomRequest, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;

      logger.info('HTTP Request', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration,
        userId: req.userId,
      });
    });

    next();
  };
}
```

## Error Handling Middleware

```typescript
// src/middleware/errorMiddleware.ts
/**
 * Centralized error handler middleware
 */
export function errorHandler(
  err: any,
  req: ICustomRequest,
  res: Response,
  next: NextFunction
) {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  const code = err.code || 'INTERNAL_ERROR';

  // Log error
  console.error({
    timestamp: new Date().toISOString(),
    status,
    message,
    code,
    userId: req.userId,
    path: req.path,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Don't expose internal details
  const responseMessage =
    status >= 500 && process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : message;

  res.status(status).json({
    error: responseMessage,
    code,
    details:
      process.env.NODE_ENV === 'development' ? err.details : undefined,
  });
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler(
  fn: (req: ICustomRequest, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: ICustomRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Usage
router.post(
  '/products',
  asyncHandler(async (req, res) => {
    const product = await productService.create(req.body);
    res.json(product);
  })
);
```

## Middleware Composition

### Complete Middleware Setup

```typescript
// src/index.ts
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import passport from 'passport';

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Data sanitization
app.use(preventNosqlInjection);
app.use(trimStrings);
app.use(sanitizeHtml);

// Session management
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  })
);

// Authentication
app.use(passport.initialize());
app.use(passport.session());

// Logging
app.use(requestLogger);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    code: 'NOT_FOUND',
  });
});

// Error handler (must be last)
app.use(errorHandler);

export default app;
```

### Middleware Ordering Best Practices

```typescript
/**
 * Correct middleware order:
 * 1. Security & headers
 * 2. Logging
 * 3. Body parsing
 * 4. Data sanitization
 * 5. Session & authentication
 * 6. Business logic routes
 * 7. 404 handler
 * 8. Error handler
 */

// ❌ WRONG - This won't work
app.use(myRoutes);
app.use(authenticateUser); // Too late, routes already matched

// ✅ CORRECT - Authentication before routes
app.use(authenticateUser);
app.use(myRoutes);
```

## Custom Middleware Patterns

### Tenant Isolation Middleware

```typescript
// src/middleware/tenantMiddleware.ts
/**
 * Extract and validate tenant from request
 */
export async function extractTenant(
  req: ICustomRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.query.tenantId;

    if (!tenantId) {
      // Some routes might not require tenant
      return next();
    }

    // Validate tenant exists and user has access
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({
        error: 'Tenant not found',
        code: 'TENANT_NOT_FOUND',
      });
    }

    // Check user access to tenant
    const hasAccess = await User.findOne({
      _id: req.userId,
      tenantId,
    });

    if (!hasAccess && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        error: 'Access denied to tenant',
        code: 'FORBIDDEN',
      });
    }

    req.tenantId = tenantId;
    next();
  } catch (error) {
    next(error);
  }
}
```

## Middleware Testing

```typescript
// src/middleware/__tests__/authMiddleware.test.ts
import { verifyJWT } from '../authMiddleware';
import jwt from 'jsonwebtoken';

describe('verifyJWT Middleware', () => {
  it('should verify valid JWT token', () => {
    const token = jwt.sign(
      { userId: 'user-1', tenantId: 'tenant-1' },
      'test-secret'
    );

    const req = {
      headers: { authorization: `Bearer ${token}` },
    } as any;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    const next = jest.fn();

    verifyJWT(req, res, next);

    expect(req.userId).toBe('user-1');
    expect(next).toHaveBeenCalled();
  });

  it('should reject missing token', () => {
    const req = { headers: {} } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    verifyJWT(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(401);
  });
});
```

## Middleware Best Practices Checklist

- [ ] Middleware has single responsibility
- [ ] Proper middleware ordering enforced
- [ ] Error handling in each middleware
- [ ] No blocking operations in middleware
- [ ] Request ID tracking implemented
- [ ] Proper logging at each layer
- [ ] Validation before route handlers
- [ ] Authentication before authorization
- [ ] Tenant isolation enforced
- [ ] CORS properly configured
- [ ] Rate limiting implemented
- [ ] Security headers set (helmet)
- [ ] Input sanitization applied
- [ ] Async error handling with try/catch
- [ ] Middleware tested independently

## Related Documentation

- [BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md) - Backend structure
- [SERVICE_PATTERNS.md](SERVICE_PATTERNS.md) - Service patterns
- [ERROR_HANDLING.md](ERROR_HANDLING.md) - Error handling strategies
- [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) - Security patterns

