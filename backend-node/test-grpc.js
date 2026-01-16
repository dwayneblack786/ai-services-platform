// Test gRPC connectivity and streaming
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, 'proto', 'chat.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const chatProto = grpc.loadPackageDefinition(packageDefinition).com.ai.va.grpc;
const client = new chatProto.ChatService('localhost:50051', grpc.credentials.createInsecure());

console.log('🧪 Testing gRPC Connectivity...\n');

// Test 1: Start Session
console.log('Test 1: Starting chat session...');
const sessionReq = { customer_id: 'test-customer', product_id: 'test-product' };
client.StartSession(sessionReq, (error, response) => {
  if (error) {
    console.error('❌ StartSession failed:', error.message);
    process.exit(1);
  }
  
  console.log('✅ StartSession successful');
  console.log('   Session ID:', response.session_id);
  console.log('   Greeting:', response.greeting);
  
  const sessionId = response.session_id;
  
  // Test 2: Non-streaming message
  console.log('\nTest 2: Sending non-streaming message...');
  const messageReq = { session_id: sessionId, message: 'Hello', customer_id: 'test-customer' };
  client.SendMessage(messageReq, (error, response) => {
    if (error) {
      console.error('❌ SendMessage failed:', error.message);
      process.exit(1);
    }
    
    console.log('✅ SendMessage successful');
    console.log('   Response:', response.message.substring(0, 50) + '...');
    console.log('   Intent:', response.intent);
    
    // Test 3: Streaming message
    console.log('\nTest 3: Testing streaming message...');
    const streamReq = { session_id: sessionId, message: 'Tell me a joke', customer_id: 'test-customer' };
    const call = client.SendMessageStream(streamReq);
    
    let tokenCount = 0;
    let startTime = Date.now();
    let firstTokenTime = null;
    let fullMessage = '';
    
    call.on('data', (response) => {
      if (!firstTokenTime) {
        firstTokenTime = Date.now();
        const timeToFirst = firstTokenTime - startTime;
        console.log(`⚡ Time to first token: ${timeToFirst}ms`);
      }
      
      tokenCount++;
      fullMessage += response.message;
      
      if (response.is_final) {
        const totalTime = Date.now() - startTime;
        console.log('\n✅ Streaming completed');
        console.log(`   Total tokens: ${tokenCount}`);
        console.log(`   Total time: ${totalTime}ms`);
        console.log(`   Tokens/sec: ${(tokenCount / (totalTime / 1000)).toFixed(2)}`);
        console.log(`   Intent: ${response.intent}`);
        console.log(`   Message length: ${fullMessage.length} chars`);
        console.log(`   First 100 chars: ${fullMessage.substring(0, 100)}...`);
        
        console.log('\n🎉 All gRPC tests passed!');
        process.exit(0);
      } else {
        process.stdout.write('.');
      }
    });
    
    call.on('error', (error) => {
      console.error('\n❌ Stream error:', error.message);
      process.exit(1);
    });
    
    call.on('end', () => {
      console.log('\n✅ Stream ended gracefully');
    });
  });
});

// Timeout after 30 seconds
setTimeout(() => {
  console.error('\n❌ Test timeout after 30 seconds');
  process.exit(1);
}, 30000);
