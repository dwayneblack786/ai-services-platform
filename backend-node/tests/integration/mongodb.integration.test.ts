/**
 * MongoDB Integration Tests
 * 
 * Tests database operations including:
 * - Connection management
 * - CRUD operations
 * - Query operations
 * - Index management
 * - Transaction support
 * 
 * Uses mongodb-memory-server for isolated testing
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db, Collection, ObjectId } from 'mongodb';

describe('MongoDB Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let client: MongoClient;
  let db: Db;
  let usersCollection: Collection;
  let productsCollection: Collection;
  let customersCollection: Collection;

  beforeAll(async () => {
    // Start in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    // Connect to in-memory database
    client = new MongoClient(uri);
    await client.connect();
    
    db = client.db('test-db');
    usersCollection = db.collection('users');
    productsCollection = db.collection('products');
    customersCollection = db.collection('customers');
  });

  afterAll(async () => {
    await client.close();
    await mongoServer.stop();
  });

  afterEach(async () => {
    // Clean up collections after each test
    await usersCollection.deleteMany({});
    await productsCollection.deleteMany({});
    await customersCollection.deleteMany({});
  });

  describe('Connection Management', () => {
    it('should successfully connect to database', async () => {
      expect(client).toBeDefined();
      expect(db).toBeDefined();
      
      const adminDb = client.db().admin();
      const serverStatus = await adminDb.serverStatus();
      expect(serverStatus.ok).toBe(1);
    });

    it('should list all collections in database', async () => {
      const collections = await db.listCollections().toArray();
      expect(Array.isArray(collections)).toBe(true);
    });

    it('should handle database ping', async () => {
      const result = await db.admin().ping();
      expect(result.ok).toBe(1);
    });
  });

  describe('User CRUD Operations', () => {
    it('should insert a new user', async () => {
      const newUser = {
        email: 'test@example.com',
        name: 'Test User',
        googleId: 'google-123',
        createdAt: new Date(),
      };

      const result = await usersCollection.insertOne(newUser);
      
      expect(result.acknowledged).toBe(true);
      expect(result.insertedId).toBeDefined();
      
      const inserted = await usersCollection.findOne({ _id: result.insertedId });
      expect(inserted?.email).toBe(newUser.email);
      expect(inserted?.name).toBe(newUser.name);
    });

    it('should find user by email', async () => {
      const user = {
        email: 'findme@example.com',
        name: 'Find Me',
        googleId: 'google-456',
      };

      await usersCollection.insertOne(user);
      
      const found = await usersCollection.findOne({ email: 'findme@example.com' });
      
      expect(found).toBeDefined();
      expect(found?.name).toBe('Find Me');
    });

    it('should update user information', async () => {
      const user = {
        email: 'update@example.com',
        name: 'Original Name',
        googleId: 'google-789',
      };

      const insertResult = await usersCollection.insertOne(user);
      
      const updateResult = await usersCollection.updateOne(
        { _id: insertResult.insertedId },
        { $set: { name: 'Updated Name' } }
      );

      expect(updateResult.modifiedCount).toBe(1);
      
      const updated = await usersCollection.findOne({ _id: insertResult.insertedId });
      expect(updated?.name).toBe('Updated Name');
    });

    it('should delete user', async () => {
      const user = {
        email: 'delete@example.com',
        name: 'To Be Deleted',
        googleId: 'google-delete',
      };

      const insertResult = await usersCollection.insertOne(user);
      
      const deleteResult = await usersCollection.deleteOne({ _id: insertResult.insertedId });
      
      expect(deleteResult.deletedCount).toBe(1);
      
      const deleted = await usersCollection.findOne({ _id: insertResult.insertedId });
      expect(deleted).toBeNull();
    });

    it('should insert multiple users', async () => {
      const users = [
        { email: 'user1@example.com', name: 'User 1', googleId: 'g1' },
        { email: 'user2@example.com', name: 'User 2', googleId: 'g2' },
        { email: 'user3@example.com', name: 'User 3', googleId: 'g3' },
      ];

      const result = await usersCollection.insertMany(users);
      
      expect(result.acknowledged).toBe(true);
      expect(Object.keys(result.insertedIds).length).toBe(3);
      
      const count = await usersCollection.countDocuments();
      expect(count).toBe(3);
    });
  });

  describe('Product Query Operations', () => {
    beforeEach(async () => {
      // Insert test products
      await productsCollection.insertMany([
        { name: 'Product A', category: 'electronics', price: 100, inStock: true },
        { name: 'Product B', category: 'electronics', price: 200, inStock: false },
        { name: 'Product C', category: 'clothing', price: 50, inStock: true },
        { name: 'Product D', category: 'clothing', price: 75, inStock: true },
        { name: 'Product E', category: 'books', price: 20, inStock: false },
      ]);
    });

    it('should find products by category', async () => {
      const electronics = await productsCollection
        .find({ category: 'electronics' })
        .toArray();
      
      expect(electronics.length).toBe(2);
      expect(electronics.every(p => p.category === 'electronics')).toBe(true);
    });

    it('should find products in stock', async () => {
      const inStock = await productsCollection
        .find({ inStock: true })
        .toArray();
      
      expect(inStock.length).toBe(3);
      expect(inStock.every(p => p.inStock === true)).toBe(true);
    });

    it('should find products with price range', async () => {
      const affordable = await productsCollection
        .find({ price: { $lte: 75 } })
        .toArray();
      
      expect(affordable.length).toBe(3);
      expect(affordable.every(p => p.price <= 75)).toBe(true);
    });

    it('should sort products by price', async () => {
      const sortedAsc = await productsCollection
        .find({})
        .sort({ price: 1 })
        .toArray();
      
      expect(sortedAsc[0].price).toBe(20);
      expect(sortedAsc[sortedAsc.length - 1].price).toBe(200);
      
      const sortedDesc = await productsCollection
        .find({})
        .sort({ price: -1 })
        .toArray();
      
      expect(sortedDesc[0].price).toBe(200);
      expect(sortedDesc[sortedDesc.length - 1].price).toBe(20);
    });

    it('should limit query results', async () => {
      const limited = await productsCollection
        .find({})
        .limit(2)
        .toArray();
      
      expect(limited.length).toBe(2);
    });

    it('should skip and limit for pagination', async () => {
      const page1 = await productsCollection
        .find({})
        .sort({ name: 1 })
        .limit(2)
        .toArray();
      
      const page2 = await productsCollection
        .find({})
        .sort({ name: 1 })
        .skip(2)
        .limit(2)
        .toArray();
      
      expect(page1.length).toBe(2);
      expect(page2.length).toBe(2);
      expect(page1[0]._id).not.toEqual(page2[0]._id);
    });

    it('should use projection to select specific fields', async () => {
      const projected = await productsCollection
        .find({}, { projection: { name: 1, price: 1, _id: 0 } })
        .toArray();
      
      expect(projected.length).toBeGreaterThan(0);
      expect(projected[0]).toHaveProperty('name');
      expect(projected[0]).toHaveProperty('price');
      expect(projected[0]).not.toHaveProperty('category');
      expect(projected[0]).not.toHaveProperty('_id');
    });
  });

  describe('Customer Advanced Operations', () => {
    it('should perform aggregation pipeline', async () => {
      await customersCollection.insertMany([
        { name: 'Alice', country: 'USA', totalSpent: 500 },
        { name: 'Bob', country: 'USA', totalSpent: 300 },
        { name: 'Charlie', country: 'UK', totalSpent: 400 },
        { name: 'David', country: 'UK', totalSpent: 600 },
      ]);

      const result = await customersCollection
        .aggregate([
          { $group: { _id: '$country', totalRevenue: { $sum: '$totalSpent' } } },
          { $sort: { totalRevenue: -1 } },
        ])
        .toArray();
      
      expect(result.length).toBe(2);
      expect(result[0]._id).toBe('UK');
      expect(result[0].totalRevenue).toBe(1000);
      expect(result[1]._id).toBe('USA');
      expect(result[1].totalRevenue).toBe(800);
    });

    it('should update multiple documents', async () => {
      await customersCollection.insertMany([
        { name: 'Customer 1', status: 'active', points: 100 },
        { name: 'Customer 2', status: 'active', points: 150 },
        { name: 'Customer 3', status: 'inactive', points: 200 },
      ]);

      const result = await customersCollection.updateMany(
        { status: 'active' },
        { $inc: { points: 50 } }
      );
      
      expect(result.modifiedCount).toBe(2);
      
      const updated = await customersCollection
        .find({ status: 'active' })
        .toArray();
      
      expect(updated.every(c => c.points >= 150)).toBe(true);
    });

    it('should use upsert operation', async () => {
      const email = 'upsert@example.com';
      
      const result = await customersCollection.updateOne(
        { email },
        { $set: { name: 'Upsert User', lastLogin: new Date() } },
        { upsert: true }
      );
      
      expect(result.upsertedCount).toBe(1);
      expect(result.upsertedId).toBeDefined();
      
      const found = await customersCollection.findOne({ email });
      expect(found?.name).toBe('Upsert User');
    });

    it('should handle array operations', async () => {
      const customerId = new ObjectId();
      
      await customersCollection.insertOne({
        _id: customerId,
        name: 'Array Test',
        tags: ['vip', 'premium'],
        purchases: [],
      });

      // Push to array
      await customersCollection.updateOne(
        { _id: customerId },
        { $push: { tags: 'verified' } as any }
      );

      let customer = await customersCollection.findOne({ _id: customerId });
      expect(customer?.tags).toContain('verified');
      expect(customer?.tags.length).toBe(3);

      // Pull from array
      await customersCollection.updateOne(
        { _id: customerId },
        { $pull: { tags: 'premium' } as any }
      );

      customer = await customersCollection.findOne({ _id: customerId });
      expect(customer?.tags).not.toContain('premium');
      expect(customer?.tags.length).toBe(2);

      // Add to set (no duplicates)
      await customersCollection.updateOne(
        { _id: customerId },
        { $addToSet: { tags: 'vip' } }
      );

      customer = await customersCollection.findOne({ _id: customerId });
      expect(customer?.tags.length).toBe(2); // Still 2, no duplicate
    });
  });

  describe('Index Management', () => {
    it('should create single field index', async () => {
      await usersCollection.createIndex({ email: 1 });
      
      const indexes = await usersCollection.indexes();
      const emailIndex = indexes.find(idx => idx.key.email === 1);
      
      expect(emailIndex).toBeDefined();
    });

    it('should create compound index', async () => {
      await productsCollection.createIndex({ category: 1, price: -1 });
      
      const indexes = await productsCollection.indexes();
      const compoundIndex = indexes.find(
        idx => idx.key.category === 1 && idx.key.price === -1
      );
      
      expect(compoundIndex).toBeDefined();
    });

    it('should create unique index', async () => {
      await usersCollection.createIndex({ email: 1 }, { unique: true });
      
      const user1 = { email: 'unique@example.com', name: 'User 1' };
      const user2 = { email: 'unique@example.com', name: 'User 2' };
      
      await usersCollection.insertOne(user1);
      
      await expect(usersCollection.insertOne(user2)).rejects.toThrow();
    });

    it('should drop index', async () => {
      await usersCollection.createIndex({ name: 1 });
      
      let indexes = await usersCollection.indexes();
      expect(indexes.some(idx => idx.key.name === 1)).toBe(true);
      
      await usersCollection.dropIndex('name_1');
      
      indexes = await usersCollection.indexes();
      expect(indexes.some(idx => idx.key.name === 1)).toBe(false);
    });
  });

  describe('Transaction Support', () => {
    it('should commit successful transaction', async () => {
      const session = client.startSession();
      
      try {
        await session.withTransaction(async () => {
          await usersCollection.insertOne(
            { email: 'tx1@example.com', name: 'TX User 1' },
            { session }
          );
          await usersCollection.insertOne(
            { email: 'tx2@example.com', name: 'TX User 2' },
            { session }
          );
        });

        const count = await usersCollection.countDocuments({
          email: { $in: ['tx1@example.com', 'tx2@example.com'] },
        });
        
        expect(count).toBe(2);
      } finally {
        await session.endSession();
      }
    });

    it('should rollback failed transaction', async () => {
      const session = client.startSession();
      
      try {
        await session.withTransaction(async () => {
          await usersCollection.insertOne(
            { email: 'rollback@example.com', name: 'Rollback User' },
            { session }
          );
          
          // Simulate error
          throw new Error('Transaction should fail');
        });
      } catch (error) {
        // Expected error
      } finally {
        await session.endSession();
      }

      const user = await usersCollection.findOne({ email: 'rollback@example.com' });
      expect(user).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle duplicate key error', async () => {
      await usersCollection.createIndex({ email: 1 }, { unique: true });
      
      const user = { email: 'duplicate@example.com', name: 'User' };
      
      await usersCollection.insertOne(user);
      
      await expect(usersCollection.insertOne(user)).rejects.toThrow();
    });

    it('should handle invalid query', async () => {
      await expect(
        usersCollection.findOne({ _id: 'invalid-object-id' } as any)
      ).rejects.toThrow();
    });

    it('should handle connection errors gracefully', async () => {
      const invalidClient = new MongoClient('mongodb://invalid-host:27017');
      
      await expect(invalidClient.connect()).rejects.toThrow();
    });
  });
});
