# Database Patterns & MongoDB Guide

📑 **Table of Contents**
- [Overview](#overview)
- [MongoDB Schema Design](#mongodb-schema-design)
  - [Schema Design Best Practices](#schema-design-best-practices)
  - [Denormalization Strategy](#denormalization-strategy)
- [Query Optimization](#query-optimization)
  - [Efficient Query Patterns](#efficient-query-patterns)
- [Indexing Strategy](#indexing-strategy)
  - [Index Design Patterns](#index-design-patterns)
  - [Index Monitoring](#index-monitoring)
- [Data Validation](#data-validation)
  - [Schema Validation](#schema-validation)
- [Data Consistency](#data-consistency)
  - [Transaction Management](#transaction-management)
- [Performance Optimization](#performance-optimization)
  - [Query Caching](#query-caching)
- [Database Patterns Best Practices Checklist](#database-patterns-best-practices-checklist)
- [Related Documentation](#related-documentation)

---

## Overview

This guide covers MongoDB schema design, query optimization, indexing strategies, and data access patterns for Node.js applications.

**Database Principles:**
- Schema design for scalability
- Proper indexing for performance
- Query optimization techniques
- Data consistency and validation
- Efficient pagination and filtering

## MongoDB Schema Design

### Schema Design Best Practices

```typescript
// src/models/schemas.ts
import { Schema } from 'mongoose';

/**
 * User Schema with embedded metadata
 */
export const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: false, // Optional for OAuth users
      select: false, // Don't include by default
    },
    role: {
      type: String,
      enum: ['USER', 'TENANT_USER', 'TENANT_ADMIN', 'PROJECT_ADMIN', 'SUPER_ADMIN'],
      default: 'USER',
      index: true,
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    profile: {
      avatar: String,
      bio: String,
      phoneNumber: String,
      preferences: {
        emailNotifications: { type: Boolean, default: true },
        twoFactorEnabled: { type: Boolean, default: false },
      },
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'deleted'],
      default: 'active',
      index: true,
    },
    lastLogin: Date,
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    deletedAt: Date,
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

/**
 * Compound indexes for common queries
 */
userSchema.index({ tenantId: 1, status: 1 });
userSchema.index({ email: 1, tenantId: 1 });
userSchema.index({ createdAt: -1, tenantId: 1 });
userSchema.index({ lastLogin: -1 });

/**
 * Product Configuration Schema with nested arrays
 */
export const productConfigSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    prompts: [
      {
        id: String,
        name: String,
        system: String,
        temperature: { type: Number, min: 0, max: 2 },
        maxTokens: { type: Number, min: 1, max: 4000 },
      },
    ],
    ragConfig: {
      enabled: Boolean,
      vectorStoreId: String,
      chunkSize: Number,
      chunkOverlap: Number,
    },
    context: {
      industry: String,
      useCase: String,
      businessRules: [String],
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'archived'],
      default: 'draft',
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'product_configurations',
  }
);

productConfigSchema.index({ tenantId: 1, productId: 1 });
productConfigSchema.index({ tenantId: 1, status: 1 });
```

### Denormalization Strategy

```typescript
/**
 * When to denormalize:
 * - Frequently accessed together
 * - Read-heavy operations
 * - Avoid multiple lookups
 */

export const orderSchema = new Schema({
  userId: Schema.Types.ObjectId,
  // Denormalized user info for faster reads
  user: {
    email: String,
    name: String,
  },
  items: [
    {
      productId: Schema.Types.ObjectId,
      // Denormalized product info
      product: {
        name: String,
        price: Number,
        sku: String,
      },
      quantity: Number,
      subtotal: Number,
    },
  ],
  total: Number,
  status: String,
  createdAt: Date,
});

/**
 * Migration to update denormalized fields
 * When product name changes, update all orders
 */
export async function updateProductNameInOrders(
  productId: string,
  newName: string
) {
  await Order.updateMany(
    { 'items.productId': productId },
    { $set: { 'items.$.product.name': newName } }
  );
}
```

## Query Optimization

### Efficient Query Patterns

```typescript
// src/services/queryOptimization.ts
import { Model } from 'mongoose';

/**
 * Pagination with offset and limit
 */
export async function getPagedResults<T>(
  model: Model<T>,
  filter: any,
  page: number = 1,
  limit: number = 20,
  sort: any = { createdAt: -1 }
): Promise<{ items: T[]; total: number; hasMore: boolean }> {
  const skip = (page - 1) * limit;

  // Execute count and find in parallel
  const [items, total] = await Promise.all([
    model.find(filter).skip(skip).limit(limit).sort(sort).lean(),
    model.countDocuments(filter),
  ]);

  return {
    items,
    total,
    hasMore: skip + items.length < total,
  };
}

/**
 * Cursor-based pagination (more efficient for large datasets)
 */
export async function getCursorPagedResults<T>(
  model: Model<T>,
  filter: any,
  cursor: string | null = null,
  limit: number = 20,
  sortField: string = 'createdAt'
): Promise<{ items: T[]; nextCursor: string | null }> {
  const query: any = { ...filter };

  // Add cursor condition for next page
  if (cursor) {
    const decodedCursor = Buffer.from(cursor, 'base64').toString('utf-8');
    query[sortField] = { $lt: decodedCursor };
  }

  const items = await model
    .find(query)
    .sort({ [sortField]: -1 })
    .limit(limit + 1) // Fetch one extra to determine hasMore
    .lean();

  let nextCursor: string | null = null;
  if (items.length > limit) {
    items.pop(); // Remove the extra item
    const lastItem = items[items.length - 1] as any;
    nextCursor = Buffer.from(lastItem[sortField].toString()).toString('base64');
  }

  return { items, nextCursor };
}

/**
 * Aggregation pipeline for complex queries
 */
export async function getProductAnalytics(tenantId: string, productId: string) {
  const analytics = await Order.aggregate([
    {
      $match: {
        tenantId: new ObjectId(tenantId),
        'items.productId': new ObjectId(productId),
      },
    },
    {
      $unwind: '$items',
    },
    {
      $match: {
        'items.productId': new ObjectId(productId),
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        totalSales: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.subtotal' },
        averagePrice: { $avg: '$items.product.price' },
        orderCount: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  return analytics;
}

/**
 * Select only needed fields (projection)
 */
export async function getUsersSummary(tenantId: string) {
  return User.find({ tenantId })
    .select('name email role lastLogin') // Only fetch needed fields
    .lean()
    .limit(100);
}

/**
 * Batch queries to avoid N+1 problem
 */
export async function getUsersWithTenants(userIds: string[]) {
  // Fetch all users
  const users = await User.find({ _id: { $in: userIds } }).lean();

  // Extract unique tenant IDs
  const tenantIds = [...new Set(users.map(u => u.tenantId))];

  // Fetch all tenants in one query
  const tenants = await Tenant.find({ _id: { $in: tenantIds } }).lean();
  const tenantMap = new Map(tenants.map(t => [t._id.toString(), t]));

  // Combine results
  return users.map(user => ({
    ...user,
    tenant: tenantMap.get(user.tenantId.toString()),
  }));
}
```

## Indexing Strategy

### Index Design Patterns

```typescript
/**
 * Index design principles:
 * 1. Index fields used in filters first
 * 2. Index sort fields
 * 3. Index projection fields last
 */

const userSchema = new Schema(/* ... */);

// ESR Rule: Equality, Sort, Range
// Match: email (equality), createdAt (sort), status (range)
userSchema.index({
  email: 1,        // Equality
  createdAt: -1,   // Sort
  status: 1,       // Range
});

// Covering index (includes all queried fields)
userSchema.index({
  tenantId: 1,
  email: 1,
  name: 1,
  role: 1,
});

// Sparse index for optional fields
userSchema.index(
  { deletedAt: 1 },
  { sparse: true } // Only index documents where deletedAt exists
);

// TTL index for automatic cleanup
export const sessionSchema = new Schema({
  userId: ObjectId,
  token: String,
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 }, // Auto-delete after expiry
  },
});

/**
 * Index performance analysis
 */
export async function analyzeIndexPerformance(model: Model<any>) {
  const stats = await model.collection.getIndexes();
  const stats2 = await model.collection.aggregate([
    { $indexStats: {} },
  ]);

  return {
    indexes: stats,
    usage: stats2,
  };
}
```

### Index Monitoring

```typescript
// src/monitoring/indexMonitoring.ts
export class IndexMonitoring {
  /**
   * Find unused indexes
   */
  static async findUnusedIndexes(model: Model<any>) {
    const indexes = await model.collection.getIndexes();
    const stats = await model.collection.aggregate([{ $indexStats: {} }]);

    const unusedIndexes = stats.filter(
      stat => stat.accesses.ops === 0
    );

    return unusedIndexes;
  }

  /**
   * Analyze slow queries
   */
  static async getSlowQueries(db: any) {
    return db.collection('system.profile').find({
      millis: { $gt: 100 },
    });
  }

  /**
   * Recommend indexes based on query patterns
   */
  static analyzeQueryPlans(queryPlans: any[]) {
    return queryPlans
      .filter(plan => plan.executionStages.stage === 'COLLSCAN') // Full collection scans
      .map(plan => ({
        query: plan.filter,
        recommendation: `Add index for fields: ${Object.keys(plan.filter).join(', ')}`,
      }));
  }
}
```

## Data Validation

### Schema Validation

```typescript
// src/validators/schemaValidator.ts
import Joi from 'joi';

/**
 * Joi schema validation
 */
export const userValidationSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(2).max(100).required(),
  password: Joi.string().min(8).pattern(/[A-Z]/).pattern(/[0-9]/).required(),
  role: Joi.string().valid('USER', 'TENANT_USER', 'TENANT_ADMIN', 'PROJECT_ADMIN', 'SUPER_ADMIN'),
  tenantId: Joi.string().hex().length(24).required(),
});

export async function validateUserData(data: any) {
  try {
    const validated = await userValidationSchema.validateAsync(data);
    return validated;
  } catch (error) {
    throw {
      status: 422,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: error.details,
    };
  }
}

/**
 * Mongoose schema validation hooks
 */
export const productSchema = new Schema({
  name: {
    type: String,
    required: true,
    validate: {
      validator: (value: string) => value.length >= 3,
      message: 'Product name must be at least 3 characters',
    },
  },
  price: {
    type: Number,
    required: true,
    validate: {
      validator: (value: number) => value >= 0,
      message: 'Price cannot be negative',
    },
  },
  inventory: {
    type: Number,
    validate: {
      validator: (value: number) => value >= 0,
      message: 'Inventory cannot be negative',
    },
  },
});

/**
 * Pre-save validation
 */
productSchema.pre('save', function (next) {
  // Custom validation logic
  if (this.price > 1000000) {
    next(new Error('Price exceeds maximum allowed'));
  } else {
    next();
  }
});
```

## Data Consistency

### Transaction Management

```typescript
// src/services/transactionalService.ts
/**
 * Multi-document transaction
 */
export async function transferBetweenTenants(
  fromTenantId: string,
  toTenantId: string,
  productId: string,
  quantity: number
) {
  const session = await User.startSession();
  session.startTransaction();

  try {
    // Deduct from source tenant
    const fromResult = await Product.findOneAndUpdate(
      {
        _id: productId,
        tenantId: fromTenantId,
        'inventory': { $gte: quantity },
      },
      { $inc: { 'inventory': -quantity } },
      { session, new: true }
    );

    if (!fromResult) {
      throw new Error('Insufficient inventory or product not found');
    }

    // Add to destination tenant
    const toResult = await Product.findOneAndUpdate(
      { _id: productId, tenantId: toTenantId },
      { $inc: { 'inventory': quantity } },
      { session, new: true }
    );

    if (!toResult) {
      throw new Error('Destination product not found');
    }

    // Create audit log
    await AuditLog.create(
      [
        {
          action: 'transfer',
          from: fromTenantId,
          to: toTenantId,
          productId,
          quantity,
          timestamp: new Date(),
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return { success: true };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
```

## Performance Optimization

### Query Caching

```typescript
// src/services/cacheManager.ts
export class QueryCacheManager {
  private cache: Map<string, { data: any; expiry: number }> = new Map();

  private generateKey(query: any, options: any): string {
    return `${JSON.stringify(query)}:${JSON.stringify(options)}`;
  }

  async execute<T>(
    query: () => Promise<T>,
    cacheKey: string,
    ttlMs: number = 5 * 60 * 1000
  ): Promise<T> {
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }

    // Execute query
    const data = await query();

    // Cache result
    this.cache.set(cacheKey, {
      data,
      expiry: Date.now() + ttlMs,
    });

    return data;
  }

  invalidate(pattern?: string): void {
    if (pattern) {
      const regex = new RegExp(pattern);
      Array.from(this.cache.keys())
        .filter(key => regex.test(key))
        .forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }
}

// Usage
const cacheManager = new QueryCacheManager();

export async function getProductWithCache(productId: string) {
  return cacheManager.execute(
    () => Product.findById(productId).lean(),
    `product:${productId}`,
    5 * 60 * 1000
  );
}
```

## Database Patterns Best Practices Checklist

- [ ] Compound indexes for common query patterns
- [ ] Projection to fetch only needed fields
- [ ] Lean queries for read-only operations
- [ ] Batch operations instead of N+1 queries
- [ ] Proper TTL indexes for cleanup
- [ ] Validation at schema and service level
- [ ] Transaction management for multi-step operations
- [ ] Query caching for frequently accessed data
- [ ] Index monitoring and unused index cleanup
- [ ] Cursor-based pagination for large datasets
- [ ] Aggregation pipeline for complex analytics
- [ ] Sparse indexes for optional fields
- [ ] Sort indexes in descending order when appropriate
- [ ] Monitor query performance regularly
- [ ] Denormalize cautiously with update strategies

## Related Documentation

- [BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md) - Backend structure overview
- [SERVICE_PATTERNS.md](SERVICE_PATTERNS.md) - Service layer patterns
- [MIDDLEWARE_GUIDE.md](MIDDLEWARE_GUIDE.md) - Middleware patterns
- [MONGODB_SCHEMA_DESIGN.md](MONGODB_SCHEMA_DESIGN.md) - Detailed schema design guide

