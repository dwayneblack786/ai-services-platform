/**
 * Simple gRPC Connection Test
 * Tests bidirectional communication between Node.js and Java VA service
 */

import { grpcClient } from './src/grpc/client';

async function testGrpcConnection() {
  console.log('\n🔍 Testing gRPC Connection to Java VA Service...\n');
  
  try {
    // Test 1: Check if client is initialized
    console.log('✅ Test 1: gRPC client initialized:', grpcClient.isConnected());
    
    // Test 2: Start a chat session
    console.log('\n📝 Test 2: Starting chat session...');
    const sessionResponse = await grpcClient.startChatSession('test-customer-123', 'test-product-456');
    console.log('✅ Session started:', {
      sessionId: sessionResponse.session_id,
      greeting: sessionResponse.greeting,
      success: sessionResponse.success
    });
    
    const sessionId = sessionResponse.session_id;
    
    // Test 3: Send a simple message (non-streaming)
    console.log('\n💬 Test 3: Sending non-streaming message...');
    const messageResponse = await grpcClient.sendMessage(sessionId, 'Hello, what services do you offer?');
    console.log('✅ Message response:', {
      message: messageResponse.message.substring(0, 100) + '...',
      intent: messageResponse.intent,
      isFinal: messageResponse.is_final
    });
    
    // Test 4: Send a streaming message
    console.log('\n📡 Test 4: Testing streaming message...');
    const stream = grpcClient.sendMessageStream(sessionId, 'Tell me about your pricing');
    
    let tokenCount = 0;
    let fullResponse = '';
    
    stream.on('data', (response: any) => {
      tokenCount++;
      if (response.message) {
        fullResponse += response.message;
        process.stdout.write('.');  // Progress indicator
      }
    });
    
    stream.on('end', async () => {
      console.log('\n✅ Streaming completed:', {
        tokensReceived: tokenCount,
        responseLength: fullResponse.length,
        preview: fullResponse.substring(0, 100) + '...'
      });
      
      // Test 5: Get chat history
      console.log('\n📜 Test 5: Getting chat history...');
      const historyResponse = await grpcClient.getChatHistory(sessionId);
      console.log('✅ History retrieved:', {
        messageCount: historyResponse.messages?.length || 0,
        messages: historyResponse.messages?.map((m: any) => ({
          role: m.role,
          contentLength: m.content?.length
        }))
      });
      
      // Test 6: End session
      console.log('\n🔚 Test 6: Ending session...');
      const endResponse = await grpcClient.endChatSession(sessionId);
      console.log('✅ Session ended:', endResponse.success);
      
      console.log('\n✨ All gRPC tests completed successfully!\n');
      
      // Close client
      grpcClient.close();
      process.exit(0);
    });
    
    stream.on('error', (error: Error) => {
      console.error('\n❌ Stream error:', error.message);
      grpcClient.close();
      process.exit(1);
    });
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    grpcClient.close();
    process.exit(1);
  }
}

// Run tests
testGrpcConnection();
