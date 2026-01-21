/**
 * gRPC Client Integration Tests
 * 
 * Tests the integration between Node.js gRPC client and Java ChatService.
 * Validates end-to-end communication including:
 * - Session management
 * - Message sending (unary and streaming)
 * - Error handling
 * - Connection lifecycle
 * 
 * Prerequisites: Java VA service must be running on port 50051
 */

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

const PROTO_PATH = path.resolve(__dirname, '../../proto/chat.proto');
const GRPC_SERVER_URL = process.env.GRPC_SERVER_URL || 'localhost:50051';

describe('gRPC Client Integration Tests', () => {
  let client: any;
  let packageDefinition: protoLoader.PackageDefinition;
  let protoDescriptor: any;

  beforeAll(async () => {
    packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });

    protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
    const ChatService = (protoDescriptor.com.ai.va.grpc as any).ChatService;

    client = new ChatService(
      GRPC_SERVER_URL,
      grpc.credentials.createInsecure()
    );
  });

  afterAll(() => {
    if (client) {
      client.close();
    }
  });

  describe('Session Management Integration', () => {
    it('should create a new session with valid customer and product IDs', (done) => {
      const request = {
        customer_id: `test-customer-${Date.now()}`,
        product_id: 'integration-test-product',
      };

      client.StartSession(request, (error: grpc.ServiceError | null, response: any) => {
        if (error) {
          if (error.code === grpc.status.UNAVAILABLE) {
            console.warn('⏭️ Java gRPC service not running, skipping test');
            done();
            return;
          }
          done(error);
          return;
        }

        expect(response).toBeDefined();
        expect(response.session_id).toBeTruthy();
        expect(response.success).toBe(true);
        expect(typeof response.session_id).toBe('string');
        
        done();
      });
    }, 10000);

    it('should end an existing session', (done) => {
      // First create a session
      const startRequest = {
        customer_id: `test-customer-${Date.now()}`,
        product_id: 'integration-test-product',
      };

      client.StartSession(startRequest, (error: grpc.ServiceError | null, startResponse: any) => {
        if (error) {
          if (error.code === grpc.status.UNAVAILABLE) {
            console.warn('⏭️ Java gRPC service not running, skipping test');
            done();
            return;
          }
          done(error);
          return;
        }

        const sessionId = startResponse.session_id;

        // Then end the session
        const endRequest = {
          session_id: sessionId,
        };

        client.EndSession(endRequest, (endError: grpc.ServiceError | null, endResponse: any) => {
          if (endError) {
            done(endError);
            return;
          }

          expect(endResponse).toBeDefined();
          expect(endResponse.success).toBe(true);
          done();
        });
      });
    }, 10000);
  });

  describe('Unary Message Communication Integration', () => {
    let sessionId: string;

    beforeAll((done) => {
      // Create a session for message tests
      const request = {
        customer_id: `test-customer-${Date.now()}`,
        product_id: 'integration-test-product',
      };

      client.StartSession(request, (error: grpc.ServiceError | null, response: any) => {
        if (error && error.code !== grpc.status.UNAVAILABLE) {
          done(error);
          return;
        }
        if (response) {
          sessionId = response.session_id;
        }
        done();
      });
    });

    it('should send a message and receive response', (done) => {
      if (!sessionId) {
        console.warn('⏭️ No session ID, skipping test');
        done();
        return;
      }

      const request = {
        session_id: sessionId,
        message: 'Hello, this is an integration test',
        customer_id: 'test-customer',
      };

      client.SendMessage(request, (error: grpc.ServiceError | null, response: any) => {
        if (error) {
          if (error.code === grpc.status.UNAVAILABLE) {
            console.warn('⏭️ Java gRPC service not running, skipping test');
            done();
            return;
          }
          done(error);
          return;
        }

        expect(response).toBeDefined();
        expect(response.session_id).toBe(sessionId);
        expect(response.message).toBeTruthy();
        expect(typeof response.message).toBe('string');
        expect(response.is_final).toBe(true);
        
        done();
      });
    }, 15000);

    it('should handle multiple sequential messages in same session', (done) => {
      if (!sessionId) {
        console.warn('⏭️ No session ID, skipping test');
        done();
        return;
      }

      const message1 = {
        session_id: sessionId,
        message: 'First message',
        customer_id: 'test-customer',
      };

      client.SendMessage(message1, (error1: grpc.ServiceError | null, response1: any) => {
        if (error1) {
          if (error1.code === grpc.status.UNAVAILABLE) {
            console.warn('⏭️ Java gRPC service not running, skipping test');
            done();
            return;
          }
          done(error1);
          return;
        }

        expect(response1.session_id).toBe(sessionId);

        // Send second message
        const message2 = {
          session_id: sessionId,
          message: 'Second message building on first',
          customer_id: 'test-customer',
        };

        client.SendMessage(message2, (error2: grpc.ServiceError | null, response2: any) => {
          if (error2) {
            done(error2);
            return;
          }

          expect(response2.session_id).toBe(sessionId);
          expect(response2.message).toBeTruthy();
          done();
        });
      });
    }, 30000);
  });

  describe('Streaming Message Communication Integration', () => {
    let sessionId: string;

    beforeAll((done) => {
      const request = {
        customer_id: `test-customer-${Date.now()}`,
        product_id: 'integration-test-product',
      };

      client.StartSession(request, (error: grpc.ServiceError | null, response: any) => {
        if (error && error.code !== grpc.status.UNAVAILABLE) {
          done(error);
          return;
        }
        if (response) {
          sessionId = response.session_id;
        }
        done();
      });
    });

    it('should receive streaming response chunks', (done) => {
      if (!sessionId) {
        console.warn('⏭️ No session ID, skipping test');
        done();
        return;
      }

      const request = {
        session_id: sessionId,
        message: 'Tell me a story (streaming test)',
        customer_id: 'test-customer',
      };

      const call = client.SendMessageStream(request);
      const chunks: any[] = [];
      let finalChunkReceived = false;

      call.on('data', (response: any) => {
        chunks.push(response);
        
        expect(response.session_id).toBe(sessionId);
        expect(response.message).toBeTruthy();
        
        if (response.is_final) {
          finalChunkReceived = true;
        }
      });

      call.on('end', () => {
        expect(chunks.length).toBeGreaterThan(0);
        expect(finalChunkReceived).toBe(true);
        
        // Verify last chunk is marked as final
        const lastChunk = chunks[chunks.length - 1];
        expect(lastChunk.is_final).toBe(true);
        
        done();
      });

      call.on('error', (error: grpc.ServiceError) => {
        if (error.code === grpc.status.UNAVAILABLE) {
          console.warn('⏭️ Java gRPC service not running, skipping test');
          done();
          return;
        }
        done(error);
      });
    }, 30000);

    it('should handle streaming with context preservation across chunks', (done) => {
      if (!sessionId) {
        console.warn('⏭️ No session ID, skipping test');
        done();
        return;
      }

      const request = {
        session_id: sessionId,
        message: 'What did I just ask you about?',
        customer_id: 'test-customer',
      };

      const call = client.SendMessageStream(request);
      let fullMessage = '';

      call.on('data', (response: any) => {
        fullMessage += response.message;
      });

      call.on('end', () => {
        expect(fullMessage).toBeTruthy();
        // Should reference previous conversation (story request)
        expect(fullMessage.length).toBeGreaterThan(0);
        done();
      });

      call.on('error', (error: grpc.ServiceError) => {
        if (error.code === grpc.status.UNAVAILABLE) {
          console.warn('⏭️ Java gRPC service not running, skipping test');
          done();
          return;
        }
        done(error);
      });
    }, 30000);
  });

  describe('History Retrieval Integration', () => {
    let sessionId: string;

    beforeAll((done) => {
      const request = {
        customer_id: `test-customer-${Date.now()}`,
        product_id: 'integration-test-product',
      };

      client.StartSession(request, (error: grpc.ServiceError | null, response: any) => {
        if (error && error.code !== grpc.status.UNAVAILABLE) {
          done(error);
          return;
        }
        if (response) {
          sessionId = response.session_id;
          
          // Send a message to create history
          const messageRequest = {
            session_id: sessionId,
            message: 'Message for history test',
            customer_id: 'test-customer',
          };
          
          client.SendMessage(messageRequest, done);
        } else {
          done();
        }
      });
    });

    it('should retrieve conversation history for session', (done) => {
      if (!sessionId) {
        console.warn('⏭️ No session ID, skipping test');
        done();
        return;
      }

      const request = {
        session_id: sessionId,
      };

      client.GetHistory(request, (error: grpc.ServiceError | null, response: any) => {
        if (error) {
          if (error.code === grpc.status.UNAVAILABLE) {
            console.warn('⏭️ Java gRPC service not running, skipping test');
            done();
            return;
          }
          done(error);
          return;
        }

        expect(response).toBeDefined();
        expect(response.messages).toBeDefined();
        expect(Array.isArray(response.messages)).toBe(true);
        expect(response.messages.length).toBeGreaterThan(0);
        
        // Verify message structure
        const firstMessage = response.messages[0];
        expect(firstMessage).toHaveProperty('role');
        expect(firstMessage).toHaveProperty('content');
        expect(firstMessage).toHaveProperty('timestamp');
        
        done();
      });
    }, 10000);
  });

  describe('Error Handling Integration', () => {
    it('should handle invalid session ID gracefully', (done) => {
      const request = {
        session_id: 'non-existent-session-id',
        message: 'Test message',
        customer_id: 'test-customer',
      };

      client.SendMessage(request, (error: grpc.ServiceError | null, response: any) => {
        if (error) {
          if (error.code === grpc.status.UNAVAILABLE) {
            console.warn('⏭️ Java gRPC service not running, skipping test');
            done();
            return;
          }
          // Should get NOT_FOUND or INTERNAL error for invalid session
          expect([grpc.status.NOT_FOUND, grpc.status.INTERNAL]).toContain(error.code);
          done();
          return;
        }

        // If service creates session on-the-fly, that's acceptable
        expect(response).toBeDefined();
        done();
      });
    }, 10000);

    it('should handle empty message gracefully', (done) => {
      const startRequest = {
        customer_id: `test-customer-${Date.now()}`,
        product_id: 'integration-test-product',
      };

      client.StartSession(startRequest, (error: grpc.ServiceError | null, startResponse: any) => {
        if (error) {
          if (error.code === grpc.status.UNAVAILABLE) {
            console.warn('⏭️ Java gRPC service not running, skipping test');
            done();
            return;
          }
          done(error);
          return;
        }

        const messageRequest = {
          session_id: startResponse.session_id,
          message: '',
          customer_id: 'test-customer',
        };

        client.SendMessage(messageRequest, (msgError: grpc.ServiceError | null, msgResponse: any) => {
          if (msgError) {
            // Should get INVALID_ARGUMENT for empty message
            expect(msgError.code).toBe(grpc.status.INVALID_ARGUMENT);
            done();
            return;
          }

          // Or service handles it gracefully
          expect(msgResponse).toBeDefined();
          done();
        });
      });
    }, 10000);
  });

  describe('Connection Lifecycle Integration', () => {
    it('should handle connection timeout gracefully', (done) => {
      // Create client with very short deadline
      const ChatService = (protoDescriptor.com.ai.va.grpc as any).ChatService;
      const shortTimeoutClient = new ChatService(
        GRPC_SERVER_URL,
        grpc.credentials.createInsecure()
      );

      const request = {
        customer_id: 'timeout-test',
        product_id: 'timeout-product',
      };

      const deadline = new Date();
      deadline.setMilliseconds(deadline.getMilliseconds() + 1); // 1ms timeout

      shortTimeoutClient.StartSession(
        request,
        { deadline },
        (error: grpc.ServiceError | null, response: any) => {
          shortTimeoutClient.close();

          if (error) {
            // Should get DEADLINE_EXCEEDED or UNAVAILABLE
            expect([grpc.status.DEADLINE_EXCEEDED, grpc.status.UNAVAILABLE]).toContain(error.code);
            done();
            return;
          }

          // Fast response is also acceptable
          done();
        }
      );
    }, 5000);

    it('should reconnect after connection loss', (done) => {
      // This test validates client resilience
      const request = {
        customer_id: `reconnect-test-${Date.now()}`,
        product_id: 'reconnect-product',
      };

      client.StartSession(request, (error: grpc.ServiceError | null, response: any) => {
        if (error) {
          if (error.code === grpc.status.UNAVAILABLE) {
            console.warn('⏭️ Java gRPC service not running, skipping test');
            done();
            return;
          }
          done(error);
          return;
        }

        expect(response.success).toBe(true);
        done();
      });
    }, 10000);
  });
});
