# Backend Architecture & Structure Guide

📑 **Table of Contents**
- [Overview](#overview)
- [Project Structure](#project-structure)
- [Request-Response Flow](#request-response-flow)
  - [1. Request Entry Point](#1-request-entry-point)
  - [2. Route Layer](#2-route-layer)
  - [3. Controller Layer](#3-controller-layer)
  - [4. Service Layer](#4-service-layer)
  - [5. Model/Data Access Layer](#5-modeldata-access-layer)
- [Error Handling Architecture](#error-handling-architecture)
  - [Global Error Handler](#global-error-handler)
- [Dependency Injection Pattern](#dependency-injection-pattern)
- [Configuration Management](#configuration-management)
- [Middleware Composition](#middleware-composition)
- [Type Safety Patterns](#type-safety-patterns)
- [Architecture Patterns](#architecture-patterns)
  - [Single Responsibility Principle](#single-responsibility-principle)
  - [Async/Await Pattern](#asyncawait-pattern)
- [Best Practices Checklist](#best-practices-checklist)
- [Related Documentation](#related-documentation)

---

## Overview

This guide covers the architecture of the Node.js Express backend, including project structure, layer organization, request handling flow, and design principles.

**Architecture Layers:**
1. **Routes** - HTTP endpoint definitions
2. **Controllers/Handlers** - Request processing logic
3. **Services** - Business logic and external integrations
4. **Models** - Data access and database interaction
5. **Middleware** - Cross-cutting concerns
6. **Config** - Application configuration

## Project Structure

```
backend-node/
├── src/
│   ├── index.ts                 # Express app setup, middleware registration
│   ├── config/                  # Configuration files
│   │   ├── database.ts         # MongoDB connection
│   │   ├── passport.ts         # OAuth2/JWT strategies
│   │   ├── cors.ts             # CORS configuration
│   │   └── constants.ts        # Application constants
│   ├── middleware/              # Custom middleware
│   │   ├── auth.ts             # JWT/session authentication
│   │   ├── errorHandler.ts     # Global error handling
│   │   ├── logging.ts          # Request logging
│   │   └── tenantValidation.ts # Multi-tenant validation
│   ├── routes/                  # API route definitions
│   │   ├── auth.ts             # Authentication endpoints
│   │   ├── products.ts         # Product management
│   │   ├── users.ts            # User management
│   │   ├── billing.ts          # Billing and payments
│   │   └── assistant.ts        # AI assistant endpoints
│   ├── controllers/             # Request handlers
│   │   ├── authController.ts
│   │   ├── productController.ts
│   │   └── ...
│   ├── services/                # Business logic
│   │   ├── authService.ts      # Auth operations
│   │   ├── productService.ts   # Product operations
│   │   ├── externalApis/       # External service clients
│   │   │   ├── inferenceApi.ts # Infero integration
│   │   │   └── paymentApi.ts   # Payment gateway
│   │   └── utils/              # Utility functions
│   ├── models/                  # Data access layer
│   │   ├── User.ts             # User model
│   │   ├── Product.ts          # Product model
│   │   └── ...
│   └── types/                   # TypeScript type definitions
│       ├── index.ts
│       ├── auth.ts
│       └── ...
├── package.json
├── tsconfig.json
└── .env.example
```

## Request-Response Flow

### 1. Request Entry Point

```typescript
// src/index.ts - Application setup
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import mongoSanitize from 'express-mongo-sanitize';
import helmet from 'helmet';

const app: Express = express();

// Global middleware
app.use(helmet()); // Security headers
app.use(cors(corsConfig));
app.use(express.json());
app.use(mongoSanitize()); // Prevent NoSQL injection

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Passport authentication
app.use(passport.initialize());
app.use(passport.session());

// Custom middleware
app.use(requestLoggingMiddleware);
app.use(tenantValidationMiddleware);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);

// Global error handler (must be last)
app.use(globalErrorHandler);

export default app;
```

### 2. Route Layer

```typescript
// src/routes/products.ts
import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import * as productController from '../controllers/productController';
import { validateRequest } from '../middleware/validation';

const router = Router();

// Protected routes with role-based access
router.get(
  '/',
  requireAuth, // Verify JWT/session
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await productController.getProducts(req);
      res.json(result);
    } catch (error) {
      next(error); // Pass to error handler
    }
  }
);

router.post(
  '/',
  requireAuth,
  requireRole(['PROJECT_ADMIN', 'SUPER_ADMIN']),
  validateRequest('body', createProductSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await productController.createProduct(req);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:id',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await productController.getProduct(req);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
```

### 3. Controller Layer

```typescript
// src/controllers/productController.ts
import { Request, Response } from 'express';
import { ICustomRequest } from '../types/auth';
import * as productService from '../services/productService';

export async function getProducts(req: ICustomRequest) {
  const { tenantId } = req;
  const { page = 1, limit = 20, status } = req.query;

  const products = await productService.getProductsByTenant(
    tenantId,
    {
      skip: (Number(page) - 1) * Number(limit),
      limit: Number(limit),
    },
    status ? { status } : undefined
  );

  return {
    success: true,
    data: products,
  };
}

export async function createProduct(req: ICustomRequest) {
  const { tenantId, userId } = req;
  const { name, description, category } = req.body;

  const product = await productService.createProduct({
    name,
    description,
    category,
    tenantId,
    createdBy: userId,
  });

  return {
    success: true,
    data: product,
  };
}

export async function getProduct(req: ICustomRequest) {
  const { id } = req.params;
  const { tenantId } = req;

  const product = await productService.getProductById(id, tenantId);

  if (!product) {
    throw {
      status: 404,
      message: 'Product not found',
    };
  }

  return {
    success: true,
    data: product,
  };
}
```

### 4. Service Layer

```typescript
// src/services/productService.ts
import { Product } from '../models/Product';
import { IProduct } from '../types/product';

export async function getProductsByTenant(
  tenantId: string,
  pagination: { skip: number; limit: number },
  filter?: Partial<IProduct>
) {
  const query: any = { tenantId };

  // Apply additional filters
  if (filter?.status) {
    query.status = filter.status;
  }

  const [products, total] = await Promise.all([
    Product.find(query)
      .skip(pagination.skip)
      .limit(pagination.limit)
      .sort({ createdAt: -1 })
      .lean(),
    Product.countDocuments(query),
  ]);

  return {
    items: products,
    pagination: {
      total,
      page: Math.floor(pagination.skip / pagination.limit) + 1,
      limit: pagination.limit,
      hasMore: pagination.skip + pagination.limit < total,
    },
  };
}

export async function createProduct(productData: {
  name: string;
  description: string;
  category: string;
  tenantId: string;
  createdBy: string;
}): Promise<IProduct> {
  const product = new Product({
    ...productData,
    status: 'draft',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await product.save();

  // Emit event for other services (optional)
  await publishProductCreatedEvent(product);

  return product.toObject();
}

export async function getProductById(
  id: string,
  tenantId: string
): Promise<IProduct | null> {
  return Product.findOne({
    _id: id,
    tenantId, // Ensure tenant isolation
  }).lean();
}

async function publishProductCreatedEvent(product: IProduct) {
  // Publish to event bus (Redis, RabbitMQ, etc.)
  // This allows other services to react to the creation
}
```

### 5. Model/Data Access Layer

```typescript
// src/models/Product.ts
import { Schema, model, Document } from 'mongoose';
import { IProduct } from '../types/product';

const productSchema = new Schema<IProduct & Document>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    category: {
      type: String,
      enum: ['virtual-assistant', 'document-processing', 'computer-vision'],
      required: true,
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'archived'],
      default: 'draft',
    },
    config: Schema.Types.Mixed, // Product-specific configuration
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'products',
  }
);

// Indexes for common queries
productSchema.index({ tenantId: 1, status: 1 });
productSchema.index({ createdAt: -1 });

// Middleware hooks
productSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export const Product = model<IProduct & Document>('Product', productSchema);
```

## Error Handling Architecture

### Global Error Handler

```typescript
// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { ICustomRequest } from '../types/auth';

export interface AppError extends Error {
  status?: number;
  code?: string;
  details?: any;
}

export const globalErrorHandler = (
  err: AppError,
  req: ICustomRequest,
  res: Response,
  next: NextFunction
) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  const code = err.code || 'INTERNAL_ERROR';

  // Log error with context
  console.error({
    timestamp: new Date().toISOString(),
    status,
    message,
    code,
    userId: req.userId,
    tenantId: req.tenantId,
    path: req.path,
    method: req.method,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Don't expose internal details in production
  const responseMessage =
    process.env.NODE_ENV === 'production'
      ? getPublicErrorMessage(code)
      : message;

  res.status(status).json({
    error: responseMessage,
    code,
    details:
      process.env.NODE_ENV === 'development' ? err.details : undefined,
  });
};

function getPublicErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    UNAUTHORIZED: 'Authentication required',
    FORBIDDEN: 'Access denied',
    NOT_FOUND: 'Resource not found',
    VALIDATION_ERROR: 'Invalid request data',
    INTERNAL_ERROR: 'An error occurred. Please try again.',
  };
  return messages[code] || 'An error occurred';
}
```

## Dependency Injection Pattern

```typescript
// src/services/serviceContainer.ts
import { Database } from '../config/database';
import * as userService from './userService';
import * as productService from './productService';
import { AuthService } from './authService';

export class ServiceContainer {
  private static instance: ServiceContainer;
  private authService: AuthService;

  private constructor(private db: Database) {
    this.authService = new AuthService(db);
  }

  static initialize(db: Database): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer(db);
    }
    return ServiceContainer.instance;
  }

  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      throw new Error('ServiceContainer not initialized');
    }
    return ServiceContainer.instance;
  }

  getAuthService(): AuthService {
    return this.authService;
  }

  getUserService() {
    return userService;
  }

  getProductService() {
    return productService;
  }
}
```

## Configuration Management

```typescript
// src/config/constants.ts
export const CONFIG = {
  // Server
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Database
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-platform',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret',
  JWT_EXPIRES_IN: '24h',

  // OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  CALLBACK_URL: process.env.CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',

  // Session
  SESSION_SECRET: process.env.SESSION_SECRET || 'dev-secret',

  // Pagination
  PAGINATION_DEFAULT_LIMIT: 20,
  PAGINATION_MAX_LIMIT: 100,

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,

  // Timeouts
  REQUEST_TIMEOUT_MS: 30000,
  DATABASE_QUERY_TIMEOUT_MS: 5000,
};

// Validation
export const validateConfig = () => {
  const required = ['JWT_SECRET', 'SESSION_SECRET'];

  if (CONFIG.NODE_ENV === 'production') {
    required.push('GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'MONGODB_URI');
  }

  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};
```

## Middleware Composition

```typescript
// src/index.ts - Complete middleware setup
const app = express();

// Security middleware
app.use(helmet());
app.use(cors(corsConfig));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Data sanitization
app.use(mongoSanitize());

// Rate limiting
app.use(rateLimit({
  windowMs: CONFIG.RATE_LIMIT_WINDOW_MS,
  max: CONFIG.RATE_LIMIT_MAX_REQUESTS,
}));

// Request logging
app.use(requestLogger);

// Session & authentication
app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());

// Tenant validation
app.use(tenantValidator);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    code: 'NOT_FOUND',
    path: req.path,
  });
});

// Global error handler (must be last)
app.use(globalErrorHandler);
```

## Type Safety Patterns

```typescript
// src/types/auth.ts
import { Request } from 'express';

export interface IUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string;
}

export type UserRole = 'USER' | 'TENANT_USER' | 'TENANT_ADMIN' | 'PROJECT_ADMIN' | 'SUPER_ADMIN';

export interface ICustomRequest extends Request {
  userId?: string;
  tenantId?: string;
  user?: IUser;
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      tenantId?: string;
      user?: IUser;
    }
  }
}
```

## Architecture Patterns

### Single Responsibility Principle

```
Routes → Controllers → Services → Models
  ↓         ↓           ↓         ↓
HTTP    Validation   Business   Database
```

- **Routes**: Handle HTTP routing only
- **Controllers**: Parse requests, validate input, call services
- **Services**: Implement business logic, orchestrate operations
- **Models**: Handle database access only

### Async/Await Pattern

```typescript
// Always use async/await for consistent error handling
export async function processRequest(id: string) {
  try {
    const data = await fetchData(id);
    const processed = await transformData(data);
    await saveData(processed);
    return processed;
  } catch (error) {
    throw {
      status: 500,
      message: 'Processing failed',
      details: error.message,
    };
  }
}
```

## Best Practices Checklist

- [ ] All async operations use try/catch
- [ ] Error handling at each layer
- [ ] Type safety with TypeScript strict mode
- [ ] Middleware ordering correct (security → logging → routes)
- [ ] Environment variables for all config
- [ ] Request validation before processing
- [ ] Role-based access control enforced
- [ ] Tenant isolation on queries
- [ ] Proper HTTP status codes used
- [ ] Error messages don't expose internals
- [ ] Database indexes on common queries
- [ ] Request logging for debugging
- [ ] CORS properly configured
- [ ] CSRF protection enabled
- [ ] Input sanitization applied

## Related Documentation

- [SERVICE_PATTERNS.md](SERVICE_PATTERNS.md) - Service layer design patterns
- [DATABASE_PATTERNS.md](DATABASE_PATTERNS.md) - Database query patterns
- [MIDDLEWARE_GUIDE.md](MIDDLEWARE_GUIDE.md) - Middleware implementation details
- [API_DESIGN_STANDARDS.md](API_DESIGN_STANDARDS.md) - API design conventions
- [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) - Security implementation

