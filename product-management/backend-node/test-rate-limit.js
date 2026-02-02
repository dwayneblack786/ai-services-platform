// Test rate limiting with concurrent streams
const { EventSource } = require('eventsource');

const API_URL = 'http://localhost:5000';
const TEST_USER_TOKEN = 'test-jwt-token'; // You'll need a real token
const SESSION_ID = 'test-session-' + Date.now();

console.log('🧪 Testing Rate Limiting...\n');
console.log('Config:');
console.log('  - Max concurrent streams: 5');
console.log('  - Testing with: 6 concurrent streams');
console.log('  - Expected: 6th stream should fail with 429\n');

let successCount = 0;
let failedCount = 0;
let completedCount = 0;

function testStream(streamNumber) {
  return new Promise((resolve) => {
    console.log(`📡 Opening stream #${streamNumber}...`);
    
    const url = `${API_URL}/api/chat/message/stream?sessionId=${SESSION_ID}&message=Test${streamNumber}`;
    const es = new EventSource(url, {
      headers: {
        'Authorization': `Bearer ${TEST_USER_TOKEN}`
      }
    });
    
    let tokenCount = 0;
    const startTime = Date.now();
    
    es.addEventListener('token', (event) => {
      tokenCount++;
      if (tokenCount === 1) {
        const timeToFirst = Date.now() - startTime;
        console.log(`   ✅ Stream #${streamNumber} first token: ${timeToFirst}ms`);
        successCount++;
      }
    });
    
    es.addEventListener('complete', (event) => {
      es.close();
      completedCount++;
      console.log(`   ✅ Stream #${streamNumber} completed (${tokenCount} tokens)`);
      resolve({ success: true, streamNumber, tokenCount });
    });
    
    es.addEventListener('error', (event) => {
      es.close();
      completedCount++;
      
      // Check if it's a rate limit error (429)
      if (event.status === 429) {
        failedCount++;
        console.log(`   ❌ Stream #${streamNumber} RATE LIMITED (429) - Expected! ✓`);
        resolve({ success: false, streamNumber, rateLimited: true });
      } else {
        console.error(`   ❌ Stream #${streamNumber} error:`, event.message);
        resolve({ success: false, streamNumber, error: event.message });
      }
    });
    
    // Timeout after 10 seconds
    setTimeout(() => {
      if (tokenCount === 0) {
        es.close();
        completedCount++;
        console.error(`   ⏱️ Stream #${streamNumber} timeout`);
        resolve({ success: false, streamNumber, timeout: true });
      }
    }, 10000);
  });
}

async function runTests() {
  console.log('Starting 6 concurrent streams...\n');
  
  // Start all 6 streams at once
  const promises = [];
  for (let i = 1; i <= 6; i++) {
    promises.push(testStream(i));
  }
  
  const results = await Promise.all(promises);
  
  console.log('\n=== Test Results ===\n');
  console.log(`Successful streams: ${successCount}`);
  console.log(`Rate limited (429): ${failedCount}`);
  console.log(`Total completed: ${completedCount}`);
  
  const rateLimitedStreams = results.filter(r => r.rateLimited);
  const successfulStreams = results.filter(r => r.success);
  
  console.log('\n=== Verification ===\n');
  
  if (successfulStreams.length === 5 && rateLimitedStreams.length === 1) {
    console.log('✅ PASS: Exactly 5 streams succeeded and 1 was rate limited');
    console.log(`   Rate limited stream: #${rateLimitedStreams[0].streamNumber}`);
    console.log('\n🎉 Rate limiting works correctly!');
    process.exit(0);
  } else {
    console.log('❌ FAIL: Unexpected results');
    console.log(`   Expected: 5 successful, 1 rate limited`);
    console.log(`   Got: ${successfulStreams.length} successful, ${rateLimitedStreams.length} rate limited`);
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
