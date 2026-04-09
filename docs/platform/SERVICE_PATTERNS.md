# Backend Service Patterns Guide

## Overview

This guide covers service layer design patterns, dependency injection, error handling strategies, and service composition patterns in Node.js Express applications.

**Service Principles:**
- Single responsibility: Each service handles one domain
- Dependency injection: Loose coupling between services
- Error propagation: Consistent error handling
- Testability: Services should be easily mockable

## Service Layer Architecture

### Basic Service Structure

```typescript
// src/services/userService.ts
import { User } from '../models/User';
import { IUser, UserRole } from '../types/user';
import { AppError } from '../middleware/errorHandler';

export class UserService {
  /**
   * Create a new user with validation and defaults
   */
  async createUser(data: {
    email: string;
    name: string;
    tenantId: string;
    role?: UserRole;
  }): Promise<IUser> {
    // Validate email uniqueness
    const existing = await User.findOne({ email: data.email });
    if (existing) {
      throw {
        status: 409,
        message: 'Email already registered',
        code: 'DUPLICATE_EMAIL',
      } as AppError;
    }

    // Create user with defaults
    const user = new User({
      ...data,
      role: data.role || 'TENANT_USER',
      verified: false,
      createdAt: new Date(),
    });

    await user.save();

    // Emit event for other services
    await this.emitUserCreatedEvent(user);

    return user.toObject();
  }

  /**
   * Get user with related data
   */
  async getUserWithDetails(userId: string): Promise<IUser | null> {
    const user = await User.findById(userId)
      .populate('tenantId', 'name') // Populate tenant info
      .lean();

    if (!user) {
      return null;
    }

    // Enrich with additional data
    return {
      ...user,
      productCount: await this.getUserProductCount(userId),
    };
  }

  /**
   * Update user with validation
   */
  async updateUser(
    userId: string,
    updates: Partial<IUser>,
    tenantId: string
  ): Promise<IUser> {
    // Verify ownership
    const user = await User.findOne({
      _id: userId,
      tenantId, // Ensure tenant isolation
    });

    if (!user) {
      throw {
        status: 404,
        message: 'User not found',
        code: 'NOT_FOUND',
      } as AppError;
    }

    // Prevent role elevation
    if (updates.role && !this.canChangeRole(user.role, updates.role)) {
      throw {
        status: 403,
        message: 'Cannot change user role',
        code: 'FORBIDDEN',
      } as AppError;
    }

    // Update and save
    Object.assign(user, updates);
    user.updatedAt = new Date();
    await user.save();

    return user.toObject();
  }

  /**
   * Delete user with cascade cleanup
   */
  async deleteUser(userId: string, tenantId: string): Promise<void> {
    const session = await User.startSession();
    session.startTransaction();

    try {
      // Delete user
      await User.deleteOne({ _id: userId, tenantId }, { session });

      // Cleanup related data
      await this.cleanupUserData(userId, session);

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  private async emitUserCreatedEvent(user: IUser): Promise<void> {
    // Implementation for event bus
  }

  private async getUserProductCount(userId: string): Promise<number> {
    // Implementation
    return 0;
  }

  private canChangeRole(currentRole: UserRole, newRole: UserRole): boolean {
    // Implementation: prevent unauthorized role changes
    return true;
  }

  private async cleanupUserData(userId: string, session: any): Promise<void> {
    // Implementation: delete related data
  }
}
```

## Dependency Injection Patterns

### Constructor Injection

```typescript
// src/services/productService.ts
import { IProductRepository } from '../repositories/types';
import { ILogger } from '../types/logging';
import { IEventBus } from '../types/events';

export class ProductService {
  constructor(
    private repository: IProductRepository,
    private logger: ILogger,
    private eventBus: IEventBus
  ) {}

  async createProduct(productData: any) {
    try {
      const product = await this.repository.create(productData);
      this.logger.info('Product created', { productId: product.id });
      await this.eventBus.publish('product.created', product);
      return product;
    } catch (error) {
      this.logger.error('Failed to create product', error);
      throw error;
    }
  }
}
```

### Service Container / Factory Pattern

```typescript
// src/services/serviceFactory.ts
import { Database } from '../config/database';
import { Logger } from '../services/logger';
import { EventBus } from '../services/eventBus';

export class ServiceFactory {
  private static instance: ServiceFactory;
  private services: Map<string, any> = new Map();

  static getInstance(db: Database): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory(db);
    }
    return ServiceFactory.instance;
  }

  constructor(private db: Database) {
    this.initializeServices();
  }

  private initializeServices() {
    const logger = new Logger();
    const eventBus = new EventBus();

    // Register services with dependencies
    this.services.set(
      'UserService',
      new UserService(
        this.db.getRepository('User'),
        logger,
        eventBus
      )
    );

    this.services.set(
      'ProductService',
      new ProductService(
        this.db.getRepository('Product'),
        logger,
        eventBus
      )
    );
  }

  getService<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found`);
    }
    return service;
  }
}

// Usage in controller
export async function createProduct(req: ICustomRequest) {
  const factory = ServiceFactory.getInstance(db);
  const productService = factory.getService('ProductService');
  return productService.createProduct(req.body);
}
```

## Error Handling in Services

### Unified Error Handling

```typescript
// src/services/base/BaseService.ts
import { AppError } from '../../middleware/errorHandler';

export abstract class BaseService {
  protected async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.handleError(error, context);
    }
  }

  protected handleError(error: any, context: string): never {
    if (error.status && error.message) {
      // Already formatted error
      throw error;
    }

    if (error.code === 'ENOTFOUND') {
      throw {
        status: 503,
        message: 'Service temporarily unavailable',
        code: 'SERVICE_UNAVAILABLE',
      } as AppError;
    }

    throw {
      status: 500,
      message: `Error in ${context}`,
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    } as AppError;
  }

  protected validateInput<T>(data: any, validator: (data: any) => T): T {
    try {
      return validator(data);
    } catch (error: any) {
      throw {
        status: 400,
        message: 'Invalid input',
        code: 'VALIDATION_ERROR',
        details: error.message,
      } as AppError;
    }
  }
}
```

### Service Error Middleware

```typescript
// src/services/errorService.ts
export class ErrorService {
  static formatError(error: any) {
    if (error instanceof ValidationError) {
      return {
        status: 422,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.errors,
      };
    }

    if (error instanceof AuthenticationError) {
      return {
        status: 401,
        code: 'UNAUTHORIZED',
        message: 'Authentication failed',
      };
    }

    if (error instanceof NotFoundError) {
      return {
        status: 404,
        code: 'NOT_FOUND',
        message: error.message,
      };
    }

    // Default error
    return {
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    };
  }
}

class ValidationError extends Error {
  constructor(public errors: Record<string, string>) {
    super('Validation failed');
  }
}

class AuthenticationError extends Error {
  constructor(message: string = 'Not authenticated') {
    super(message);
  }
}

class NotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} not found`);
  }
}
```

## Service Composition

### Orchestration Pattern

```typescript
// src/services/orderService.ts
/**
 * OrderService orchestrates multiple services to complete an order
 */
export class OrderService {
  constructor(
    private userService: UserService,
    private productService: ProductService,
    private paymentService: PaymentService,
    private inventoryService: InventoryService,
    private notificationService: NotificationService
  ) {}

  async createOrder(userId: string, items: any[]): Promise<any> {
    // 1. Validate user
    const user = await this.userService.getUser(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    // 2. Validate products and get pricing
    const products = await Promise.all(
      items.map(item => this.productService.getProduct(item.productId))
    );

    // 3. Calculate total
    const total = this.calculateTotal(items, products);

    // 4. Process payment
    const payment = await this.paymentService.charge({
      userId,
      amount: total,
      currency: 'USD',
    });

    if (payment.status !== 'succeeded') {
      throw new Error('Payment failed');
    }

    // 5. Update inventory
    await this.inventoryService.updateStock(
      items.map(item => ({
        productId: item.productId,
        quantity: -item.quantity,
      }))
    );

    // 6. Create order record
    const order = {
      userId,
      items,
      total,
      payment,
      status: 'completed',
      createdAt: new Date(),
    };

    // 7. Send notification (fire and forget)
    this.notificationService.sendOrderConfirmation(user.email, order).catch(err => {
      console.error('Failed to send notification:', err);
    });

    return order;
  }

  private calculateTotal(items: any[], products: any[]): number {
    return items.reduce((sum, item) => {
      const product = products.find(p => p.id === item.productId);
      return sum + (product?.price || 0) * item.quantity;
    }, 0);
  }
}
```

### Chain of Responsibility Pattern

```typescript
// src/services/validationChain.ts
export abstract class ValidationHandler {
  protected next?: ValidationHandler;

  setNext(handler: ValidationHandler): ValidationHandler {
    this.next = handler;
    return handler;
  }

  handle(data: any): boolean {
    if (!this.validate(data)) {
      return false;
    }
    return this.next ? this.next.handle(data) : true;
  }

  protected abstract validate(data: any): boolean;
}

export class EmailValidator extends ValidationHandler {
  protected validate(data: any): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new Error('Invalid email format');
    }
    return true;
  }
}

export class PasswordValidator extends ValidationHandler {
  protected validate(data: any): boolean {
    if (data.password.length < 8) {
      throw new Error('Password too short');
    }
    return true;
  }
}

// Usage
const emailValidator = new EmailValidator();
const passwordValidator = new PasswordValidator();

emailValidator.setNext(passwordValidator);

function validateUser(userData: any) {
  emailValidator.handle(userData);
}
```

## Service Caching

### Memoization Pattern

```typescript
// src/services/cacheService.ts
export class CacheService {
  private cache: Map<string, { data: any; expiry: number }> = new Map();

  set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlMs,
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  clear(pattern?: string): void {
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

// Service with caching
export class ProductServiceWithCache {
  constructor(
    private repository: IProductRepository,
    private cache: CacheService
  ) {}

  async getProduct(productId: string): Promise<any> {
    // Check cache first
    const cached = this.cache.get(`product:${productId}`);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const product = await this.repository.findById(productId);

    // Cache for 5 minutes
    this.cache.set(`product:${productId}`, product, 5 * 60 * 1000);

    return product;
  }

  async updateProduct(productId: string, updates: any): Promise<any> {
    const product = await this.repository.update(productId, updates);

    // Invalidate cache
    this.cache.clear(`^product:${productId}`);

    return product;
  }
}
```

## Service Transaction Management

```typescript
// src/services/transactionService.ts
export class TransactionService {
  async executeInTransaction<T>(
    operations: (session: any) => Promise<T>
  ): Promise<T> {
    const session = await User.startSession();
    session.startTransaction();

    try {
      const result = await operations(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

// Usage in service
async function transferFunds(fromUserId: string, toUserId: string, amount: number) {
  return transactionService.executeInTransaction(async (session) => {
    // Deduct from source
    await User.updateOne(
      { _id: fromUserId },
      { $inc: { balance: -amount } },
      { session }
    );

    // Add to destination
    await User.updateOne(
      { _id: toUserId },
      { $inc: { balance: amount } },
      { session }
    );

    // Record transaction
    const transaction = new Transaction({
      from: fromUserId,
      to: toUserId,
      amount,
      timestamp: new Date(),
    });

    await transaction.save({ session });
    return transaction;
  });
}
```

## Service Testing Pattern

```typescript
// src/services/__tests__/userService.test.ts
import { UserService } from '../userService';

describe('UserService', () => {
  let userService: UserService;
  let mockRepository: jest.Mocked<IUserRepository>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    mockRepository = createMockRepository();
    mockLogger = createMockLogger();

    userService = new UserService(mockRepository, mockLogger);
  });

  describe('createUser', () => {
    it('should create a new user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        tenantId: 'tenant-1',
      };

      mockRepository.create.mockResolvedValue({
        id: 'user-1',
        ...userData,
      });

      const result = await userService.createUser(userData);

      expect(result.id).toBe('user-1');
      expect(mockRepository.create).toHaveBeenCalledWith(userData);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should throw error for duplicate email', async () => {
      const userData = {
        email: 'existing@example.com',
        name: 'Test User',
        tenantId: 'tenant-1',
      };

      mockRepository.findOne.mockResolvedValue({ id: 'existing' });

      await expect(userService.createUser(userData)).rejects.toThrow('DUPLICATE_EMAIL');
    });
  });
});
```

## Service Best Practices Checklist

- [ ] Single responsibility per service
- [ ] Dependency injection for all dependencies
- [ ] Consistent error handling
- [ ] Transaction management for multi-step operations
- [ ] Caching for frequently accessed data
- [ ] Event emission for side effects
- [ ] Service-level validation
- [ ] Proper logging at service level
- [ ] Type safety with TypeScript
- [ ] Unit tests with mocked dependencies
- [ ] No direct HTTP handling in services
- [ ] No circular dependencies
- [ ] Services are stateless where possible
- [ ] Clear separation from data access layer
- [ ] Documented error codes and handling

## Related Documentation

- [BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md) - Overall backend architecture
- [DATABASE_PATTERNS.md](DATABASE_PATTERNS.md) - Data access patterns
- [MIDDLEWARE_GUIDE.md](MIDDLEWARE_GUIDE.md) - Request middleware patterns
- [ERROR_HANDLING.md](ERROR_HANDLING.md) - Error handling strategies
- [TESTING_STRATEGY.md](TESTING_STRATEGY.md) - Testing approaches

