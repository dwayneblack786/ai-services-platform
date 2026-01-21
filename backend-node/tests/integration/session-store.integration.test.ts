/**
 * Session Store Integration Tests
 * 
 * Tests session storage mechanisms including:
 * - Memory store (development)
 * - Redis store (production)
 * - Session lifecycle
 * - Session persistence
 * - Concurrent session handling
 * 
 * Prerequisites for Redis tests: Redis server running on localhost:6379
 */

import session from 'express-session';
import { createClient } from 'redis';
import RedisStore from 'connect-redis';

describe('Session Store Integration Tests', () => {
  describe('Memory Store Tests', () => {
    let memoryStore: session.MemoryStore;

    beforeEach(() => {
      memoryStore = new session.MemoryStore();
    });

    afterEach((done) => {
      memoryStore.clear(() => done());
    });

    it('should store a session', (done) => {
      const sessionId = 'test-session-123';
      const sessionData: session.SessionData = {
        cookie: {
          maxAge: 3600000,
          httpOnly: true,
          secure: false,
        } as any,
        user: { id: 'user-1', email: 'test@example.com' },
      } as any;

      memoryStore.set(sessionId, sessionData, (error) => {
        expect(error).toBeNull();
        done();
      });
    });

    it('should retrieve a stored session', (done) => {
      const sessionId = 'test-session-retrieve';
      const sessionData: session.SessionData = {
        cookie: { maxAge: 3600000 } as any,
        user: { id: 'user-2', email: 'retrieve@example.com' },
      } as any;

      memoryStore.set(sessionId, sessionData, () => {
        memoryStore.get(sessionId, (error, retrievedSession) => {
          expect(error).toBeNull();
          expect(retrievedSession).toBeDefined();
          expect((retrievedSession as any).user.id).toBe('user-2');
          done();
        });
      });
    });

    it('should return undefined for non-existent session', (done) => {
      memoryStore.get('non-existent-session', (error, session) => {
        expect(error).toBeNull();
        expect(session).toBeUndefined();
        done();
      });
    });

    it('should update an existing session', (done) => {
      const sessionId = 'test-session-update';
      const initialData: session.SessionData = {
        cookie: { maxAge: 3600000 } as any,
        user: { id: 'user-3', email: 'update@example.com' },
      } as any;

      memoryStore.set(sessionId, initialData, () => {
        const updatedData: session.SessionData = {
          cookie: { maxAge: 3600000 } as any,
          user: { id: 'user-3', email: 'updated@example.com' },
        } as any;

        memoryStore.set(sessionId, updatedData, () => {
          memoryStore.get(sessionId, (error, session) => {
            expect(error).toBeNull();
            expect((session as any).user.email).toBe('updated@example.com');
            done();
          });
        });
      });
    });

    it('should destroy a session', (done) => {
      const sessionId = 'test-session-destroy';
      const sessionData: session.SessionData = {
        cookie: { maxAge: 3600000 } as any,
        user: { id: 'user-4' },
      } as any;

      memoryStore.set(sessionId, sessionData, () => {
        memoryStore.destroy(sessionId, (error) => {
          expect(error).toBeUndefined();

          memoryStore.get(sessionId, (getError, session) => {
            expect(getError).toBeNull();
            expect(session).toBeUndefined();
            done();
          });
        });
      });
    });

    it('should handle concurrent session operations', (done) => {
      const sessions = [
        { id: 'concurrent-1', user: { id: 'user-1' } },
        { id: 'concurrent-2', user: { id: 'user-2' } },
        { id: 'concurrent-3', user: { id: 'user-3' } },
        { id: 'concurrent-4', user: { id: 'user-4' } },
        { id: 'concurrent-5', user: { id: 'user-5' } },
      ];

      const promises = sessions.map((sessionInfo) => {
        return new Promise<void>((resolve, reject) => {
          const sessionData: session.SessionData = {
            cookie: { maxAge: 3600000 } as any,
            user: sessionInfo.user,
          } as any;

          memoryStore.set(sessionInfo.id, sessionData, (error) => {
            if (error) reject(error);
            else resolve();
          });
        });
      });

      Promise.all(promises).then(() => {
        memoryStore.length((error, length) => {
          expect(error).toBeNull();
          expect(length).toBe(5);
          done();
        });
      });
    });

    it('should clear all sessions', (done) => {
      const sessionData: session.SessionData = {
        cookie: { maxAge: 3600000 } as any,
        user: { id: 'user-clear' },
      } as any;

      Promise.all([
        new Promise<void>((resolve) => memoryStore.set('clear-1', sessionData, () => resolve())),
        new Promise<void>((resolve) => memoryStore.set('clear-2', sessionData, () => resolve())),
        new Promise<void>((resolve) => memoryStore.set('clear-3', sessionData, () => resolve())),
      ]).then(() => {
        memoryStore.clear(() => {
          memoryStore.length((error, length) => {
            expect(error).toBeNull();
            expect(length).toBe(0);
            done();
          });
        });
      });
    });

    it('should get session count', (done) => {
      const sessionData: session.SessionData = {
        cookie: { maxAge: 3600000 } as any,
        user: { id: 'user-count' },
      } as any;

      memoryStore.set('count-1', sessionData, () => {
        memoryStore.set('count-2', sessionData, () => {
          memoryStore.length((error, length) => {
            expect(error).toBeNull();
            expect(length).toBe(2);
            done();
          });
        });
      });
    });
  });

  describe('Redis Store Tests', () => {
    let redisClient: ReturnType<typeof createClient>;
    let redisStore: RedisStore;
    const isRedisAvailable = process.env.REDIS_AVAILABLE === 'true' || process.env.NODE_ENV !== 'ci';

    beforeAll(async () => {
      if (!isRedisAvailable) {
        console.warn('⏭️ Redis not available, skipping Redis store tests');
        return;
      }

      try {
        redisClient = createClient({
          url: process.env.REDIS_URL || 'redis://localhost:6379',
        });

        redisClient.on('error', (err) => {
          console.error('Redis Client Error:', err);
        });

        await redisClient.connect();
        redisStore = new RedisStore({ client: redisClient, prefix: 'test:sess:' });
      } catch (error) {
        console.warn('⏭️ Could not connect to Redis, skipping Redis tests:', error);
      }
    });

    afterAll(async () => {
      if (redisClient?.isOpen) {
        await redisClient.quit();
      }
    });

    afterEach(async () => {
      if (redisClient?.isOpen) {
        // Clear test sessions
        const keys = await redisClient.keys('test:sess:*');
        if (keys.length > 0) {
          await redisClient.del(keys);
        }
      }
    });

    const skipIfRedisUnavailable = isRedisAvailable ? it : it.skip;

    skipIfRedisUnavailable('should store a session in Redis', (done) => {
      const sessionId = 'redis-test-session-123';
      const sessionData: session.SessionData = {
        cookie: { maxAge: 3600000 } as any,
        user: { id: 'redis-user-1', email: 'redis@example.com' },
      } as any;

      redisStore.set(sessionId, sessionData, (error) => {
        expect(error).toBeNull();
        done();
      });
    });

    skipIfRedisUnavailable('should retrieve a session from Redis', (done) => {
      const sessionId = 'redis-retrieve';
      const sessionData: session.SessionData = {
        cookie: { maxAge: 3600000 } as any,
        user: { id: 'redis-user-2', email: 'redis-retrieve@example.com' },
      } as any;

      redisStore.set(sessionId, sessionData, () => {
        redisStore.get(sessionId, (error, retrievedSession) => {
          expect(error).toBeNull();
          expect(retrievedSession).toBeDefined();
          expect((retrievedSession as any).user.id).toBe('redis-user-2');
          done();
        });
      });
    });

    skipIfRedisUnavailable('should persist session across reconnections', (done) => {
      const sessionId = 'redis-persist';
      const sessionData: session.SessionData = {
        cookie: { maxAge: 3600000 } as any,
        user: { id: 'persist-user' },
        persistentData: 'This should survive',
      } as any;

      redisStore.set(sessionId, sessionData, () => {
        // Simulate reconnection by creating new store instance
        const newStore = new RedisStore({ client: redisClient, prefix: 'test:sess:' });
        
        newStore.get(sessionId, (error, session) => {
          expect(error).toBeNull();
          expect(session).toBeDefined();
          expect((session as any).persistentData).toBe('This should survive');
          done();
        });
      });
    });

    skipIfRedisUnavailable('should handle session expiration', (done) => {
      const sessionId = 'redis-expire';
      const sessionData: session.SessionData = {
        cookie: { maxAge: 1000 } as any, // 1 second
        user: { id: 'expire-user' },
      } as any;

      redisStore.set(sessionId, sessionData, () => {
        // Wait for expiration
        setTimeout(() => {
          redisStore.get(sessionId, (error, session) => {
            expect(error).toBeNull();
            expect(session).toBeNull();
            done();
          });
        }, 1500);
      });
    }, 5000);

    skipIfRedisUnavailable('should destroy session in Redis', (done) => {
      const sessionId = 'redis-destroy';
      const sessionData: session.SessionData = {
        cookie: { maxAge: 3600000 } as any,
        user: { id: 'destroy-user' },
      } as any;

      redisStore.set(sessionId, sessionData, () => {
        redisStore.destroy(sessionId, (error) => {
          expect(error).toBeUndefined();

          redisStore.get(sessionId, (getError, session) => {
            expect(getError).toBeNull();
            expect(session).toBeNull();
            done();
          });
        });
      });
    });

    skipIfRedisUnavailable('should handle concurrent Redis operations', async () => {
      const sessions = Array.from({ length: 10 }, (_, i) => ({
        id: `redis-concurrent-${i}`,
        user: { id: `user-${i}` },
      }));

      const setPromises = sessions.map((sessionInfo) => {
        return new Promise<void>((resolve, reject) => {
          const sessionData: session.SessionData = {
            cookie: { maxAge: 3600000 } as any,
            user: sessionInfo.user,
          } as any;

          redisStore.set(sessionInfo.id, sessionData, (error) => {
            if (error) reject(error);
            else resolve();
          });
        });
      });

      await Promise.all(setPromises);

      const getPromises = sessions.map((sessionInfo) => {
        return new Promise<void>((resolve, reject) => {
          redisStore.get(sessionInfo.id, (error, session) => {
            if (error) reject(error);
            expect(session).toBeDefined();
            expect((session as any).user.id).toBe(sessionInfo.user.id);
            resolve();
          });
        });
      });

      await Promise.all(getPromises);
    });

    skipIfRedisUnavailable('should handle large session data', (done) => {
      const sessionId = 'redis-large-data';
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        data: `Item ${i}`,
        timestamp: new Date().toISOString(),
      }));

      const sessionData: session.SessionData = {
        cookie: { maxAge: 3600000 } as any,
        user: { id: 'large-data-user' },
        largeData: largeArray,
      } as any;

      redisStore.set(sessionId, sessionData, (setError) => {
        expect(setError).toBeNull();

        redisStore.get(sessionId, (getError, session) => {
          expect(getError).toBeNull();
          expect(session).toBeDefined();
          expect((session as any).largeData.length).toBe(1000);
          done();
        });
      });
    });
  });

  describe('Session Lifecycle Tests', () => {
    let store: session.MemoryStore;

    beforeEach(() => {
      store = new session.MemoryStore();
    });

    it('should handle session touch/renewal', (done) => {
      const sessionId = 'touch-test';
      const sessionData: session.SessionData = {
        cookie: { maxAge: 3600000 } as any,
        user: { id: 'touch-user' },
        lastAccess: Date.now(),
      } as any;

      store.set(sessionId, sessionData, () => {
        setTimeout(() => {
          const updatedData: session.SessionData = {
            ...sessionData,
            lastAccess: Date.now(),
          } as any;

          store.touch(sessionId, updatedData, () => {
            store.get(sessionId, (getError, session) => {
              expect(getError).toBeNull();
              expect(session).toBeDefined();
              expect((session as any).lastAccess).toBeGreaterThan((sessionData as any).lastAccess);
              done();
            });
          });
        }, 100);
      });
    });

    it('should handle session regeneration', (done) => {
      const oldSessionId = 'old-session';
      const newSessionId = 'new-session';
      const sessionData: session.SessionData = {
        cookie: { maxAge: 3600000 } as any,
        user: { id: 'regen-user' },
      } as any;

      store.set(oldSessionId, sessionData, () => {
        // Destroy old session
        store.destroy(oldSessionId, () => {
          // Create new session with same user
          store.set(newSessionId, sessionData, () => {
            store.get(oldSessionId, (oldError, oldSession) => {
              expect(oldSession).toBeUndefined();

              store.get(newSessionId, (newError, newSession) => {
                expect(newSession).toBeDefined();
                expect((newSession as any).user.id).toBe('regen-user');
                done();
              });
            });
          });
        });
      });
    });
  });

  describe('Error Handling', () => {
    let store: session.MemoryStore;

    beforeEach(() => {
      store = new session.MemoryStore();
    });

    it('should handle malformed session data gracefully', (done) => {
      const sessionId = 'malformed-test';
      
      // Try to set invalid data
      try {
        (store as any).sessions[sessionId] = 'invalid-json-string';
        
        store.get(sessionId, (error, session) => {
          // Should either return undefined or throw error
          expect(session === undefined || error !== null).toBe(true);
          done();
        });
      } catch (error) {
        // Expected error
        done();
      }
    });

    it('should handle concurrent destroy operations', (done) => {
      const sessionId = 'concurrent-destroy';
      const sessionData: session.SessionData = {
        cookie: { maxAge: 3600000 } as any,
        user: { id: 'destroy-user' },
      } as any;

      store.set(sessionId, sessionData, () => {
        Promise.all([
          new Promise<void>((resolve) => store.destroy(sessionId, () => resolve())),
          new Promise<void>((resolve) => store.destroy(sessionId, () => resolve())),
          new Promise<void>((resolve) => store.destroy(sessionId, () => resolve())),
        ]).then(() => {
          store.get(sessionId, (error, session) => {
            expect(session).toBeUndefined();
            done();
          });
        });
      });
    });
  });
});
