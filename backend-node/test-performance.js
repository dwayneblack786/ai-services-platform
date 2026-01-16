// Performance comparison: SSE vs gRPC
const { EventSource } = require('eventsource');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const API_URL = 'http://localhost:5000';
const JAVA_API_URL = 'http://localhost:8136';
const TEST_MESSAGE = 'Tell me a short joke about programming';
const NUM_TESTS = 5;

console.log('🧪 Performance Comparison: SSE vs gRPC\n');
console.log(`Test message: "${TEST_MESSAGE}"`);
console.log(`Number of tests per method: ${NUM_TESTS}\n`);

// Setup gRPC client
const PROTO_PATH = path.join(__dirname, 'proto', 'chat.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const chatProto = grpc.loadPackageDefinition(packageDefinition).com.ai.va.grpc;
const grpcClient = new chatProto.ChatService('localhost:50051', grpc.credentials.createInsecure());

// Test SSE streaming
function testSSE(sessionId) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let firstTokenTime = null;
    let tokenCount = 0;
    let totalChars = 0;
    
    const url = `${JAVA_API_URL}/chat/message/stream?sessionId=${sessionId}&message=${encodeURIComponent(TEST_MESSAGE)}`;
    const es = new EventSource(url);
    
    es.addEventListener('token', (event) => {
      if (!firstTokenTime) {
        firstTokenTime = Date.now();
      }
      tokenCount++;
      const data = JSON.parse(event.data);
      totalChars += data.token.length;
    });
    
    es.addEventListener('complete', (event) => {
      es.close();
      const totalTime = Date.now() - startTime;
      const timeToFirstToken = firstTokenTime - startTime;
      
      resolve({
        method: 'SSE',
        totalTime,
        timeToFirstToken,
        tokenCount,
        totalChars,
        tokensPerSec: tokenCount / (totalTime / 1000),
        charsPerSec: totalChars / (totalTime / 1000)
      });
    });
    
    es.addEventListener('error', (error) => {
      es.close();
      reject(error);
    });
    
    setTimeout(() => {
      es.close();
      reject(new Error('SSE timeout'));
    }, 30000);
  });
}

// Test gRPC streaming
function testGRPC(sessionId) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let firstTokenTime = null;
    let tokenCount = 0;
    let totalChars = 0;
    
    const call = grpcClient.SendMessageStream({ 
      session_id: sessionId, 
      message: TEST_MESSAGE,
      customer_id: 'test-customer'
    });
    
    call.on('data', (response) => {
      if (!firstTokenTime) {
        firstTokenTime = Date.now();
      }
      
      if (!response.is_final) {
        tokenCount++;
        totalChars += response.message.length;
      } else {
        const totalTime = Date.now() - startTime;
        const timeToFirstToken = firstTokenTime - startTime;
        
        resolve({
          method: 'gRPC',
          totalTime,
          timeToFirstToken,
          tokenCount,
          totalChars,
          tokensPerSec: tokenCount / (totalTime / 1000),
          charsPerSec: totalChars / (totalTime / 1000)
        });
      }
    });
    
    call.on('error', (error) => {
      reject(error);
    });
    
    setTimeout(() => {
      call.cancel();
      reject(new Error('gRPC timeout'));
    }, 30000);
  });
}

async function runTests() {
  // Create session first
  console.log('Creating test session...');
  const sessionId = await new Promise((resolve, reject) => {
    grpcClient.StartSession({ customer_id: 'test', product_id: 'test' }, (error, response) => {
      if (error) reject(error);
      else resolve(response.session_id);
    });
  });
  console.log(`Session created: ${sessionId}\n`);
  
  // Test SSE
  console.log('Testing SSE streaming...');
  const sseResults = [];
  for (let i = 0; i < NUM_TESTS; i++) {
    process.stdout.write(`  Test ${i + 1}/${NUM_TESTS}...`);
    try {
      const result = await testSSE(sessionId);
      sseResults.push(result);
      console.log(` ✅ ${result.timeToFirstToken}ms to first token, ${result.totalTime}ms total`);
      await new Promise(r => setTimeout(r, 1000)); // Wait 1s between tests
    } catch (error) {
      console.log(` ❌ ${error.message}`);
    }
  }
  
  // Test gRPC
  console.log('\nTesting gRPC streaming...');
  const grpcResults = [];
  for (let i = 0; i < NUM_TESTS; i++) {
    process.stdout.write(`  Test ${i + 1}/${NUM_TESTS}...`);
    try {
      const result = await testGRPC(sessionId);
      grpcResults.push(result);
      console.log(` ✅ ${result.timeToFirstToken}ms to first token, ${result.totalTime}ms total`);
      await new Promise(r => setTimeout(r, 1000)); // Wait 1s between tests
    } catch (error) {
      console.log(` ❌ ${error.message}`);
    }
  }
  
  // Calculate averages
  const avg = (arr, key) => arr.reduce((sum, r) => sum + r[key], 0) / arr.length;
  
  const sseAvg = {
    timeToFirstToken: avg(sseResults, 'timeToFirstToken'),
    totalTime: avg(sseResults, 'totalTime'),
    tokenCount: avg(sseResults, 'tokenCount'),
    tokensPerSec: avg(sseResults, 'tokensPerSec'),
    charsPerSec: avg(sseResults, 'charsPerSec')
  };
  
  const grpcAvg = {
    timeToFirstToken: avg(grpcResults, 'timeToFirstToken'),
    totalTime: avg(grpcResults, 'totalTime'),
    tokenCount: avg(grpcResults, 'tokenCount'),
    tokensPerSec: avg(grpcResults, 'tokensPerSec'),
    charsPerSec: avg(grpcResults, 'charsPerSec')
  };
  
  // Print results
  console.log('\n=== Performance Results ===\n');
  
  console.log('SSE (Server-Sent Events):');
  console.log(`  Time to first token: ${sseAvg.timeToFirstToken.toFixed(2)}ms`);
  console.log(`  Total time: ${sseAvg.totalTime.toFixed(2)}ms`);
  console.log(`  Tokens received: ${sseAvg.tokenCount.toFixed(1)}`);
  console.log(`  Tokens/sec: ${sseAvg.tokensPerSec.toFixed(2)}`);
  console.log(`  Chars/sec: ${sseAvg.charsPerSec.toFixed(2)}`);
  
  console.log('\ngRPC:');
  console.log(`  Time to first token: ${grpcAvg.timeToFirstToken.toFixed(2)}ms`);
  console.log(`  Total time: ${grpcAvg.totalTime.toFixed(2)}ms`);
  console.log(`  Tokens received: ${grpcAvg.tokenCount.toFixed(1)}`);
  console.log(`  Tokens/sec: ${grpcAvg.tokensPerSec.toFixed(2)}`);
  console.log(`  Chars/sec: ${grpcAvg.charsPerSec.toFixed(2)}`);
  
  // Compare
  console.log('\n=== Comparison ===\n');
  
  const ttftDiff = ((sseAvg.timeToFirstToken - grpcAvg.timeToFirstToken) / sseAvg.timeToFirstToken * 100);
  const totalDiff = ((sseAvg.totalTime - grpcAvg.totalTime) / sseAvg.totalTime * 100);
  const tpsDiff = ((grpcAvg.tokensPerSec - sseAvg.tokensPerSec) / sseAvg.tokensPerSec * 100);
  
  console.log(`Time to first token: gRPC is ${Math.abs(ttftDiff).toFixed(1)}% ${ttftDiff < 0 ? 'slower' : 'faster'}`);
  console.log(`Total time: gRPC is ${Math.abs(totalDiff).toFixed(1)}% ${totalDiff < 0 ? 'slower' : 'faster'}`);
  console.log(`Throughput: gRPC is ${Math.abs(tpsDiff).toFixed(1)}% ${tpsDiff < 0 ? 'slower' : 'faster'}`);
  
  // Winner
  console.log('\n=== Winner ===\n');
  if (grpcAvg.timeToFirstToken < sseAvg.timeToFirstToken && grpcAvg.tokensPerSec > sseAvg.tokensPerSec) {
    console.log('🏆 gRPC is the clear winner!');
    console.log('   - Faster first token');
    console.log('   - Higher throughput');
  } else if (sseAvg.timeToFirstToken < grpcAvg.timeToFirstToken && sseAvg.tokensPerSec > grpcAvg.tokensPerSec) {
    console.log('🏆 SSE is the clear winner!');
    console.log('   - Faster first token');
    console.log('   - Higher throughput');
  } else {
    console.log('🤝 It\'s a tie!');
    console.log('   - Performance is comparable');
    console.log('   - Choose based on other factors (complexity, compatibility, etc.)');
  }
  
  process.exit(0);
}

runTests().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
