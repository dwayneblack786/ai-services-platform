// Simplified rate limiting test - test directly against Java VA service (no auth required)
const { EventSource } = require('eventsource');

const JAVA_API_URL = 'http://localhost:8136';
const SESSION_ID = 'test-session-' + Date.now();
const NUM_STREAMS = 6;

console.log('🧪 Testing Rate Limiting (Direct to Java VA)...\n');
console.log('Note: This tests the Java VA service rate limiter, not the Node.js middleware');
console.log(`Opening ${NUM_STREAMS} concurrent streams to ${JAVA_API_URL}\n`);

const activeStreams = [];
let successCount = 0;
let errorCount = 0;

function openStream(streamNumber) {
  return new Promise((resolve) => {
    const url = `${JAVA_API_URL}/chat/message/stream?sessionId=${SESSION_ID}-${streamNumber}&message=Test${streamNumber}`;
    console.log(`📡 Stream #${streamNumber}: Opening connection...`);
    
    const es = new EventSource(url);
    activeStreams.push(es);
    
    let receivedToken = false;
    const startTime = Date.now();
    
    es.addEventListener('token', (event) => {
      if (!receivedToken) {
        receivedToken = true;
        successCount++;
        const timeToFirst = Date.now() - startTime;
        console.log(`   ✅ Stream #${streamNumber}: First token received (${timeToFirst}ms)`);
      }
    });
    
    es.addEventListener('complete', (event) => {
      console.log(`   ✅ Stream #${streamNumber}: Completed successfully`);
      es.close();
      resolve({ success: true, streamNumber });
    });
    
    es.addEventListener('error', (err) => {
      if (!receivedToken) {
        errorCount++;
        console.log(`   ❌ Stream #${streamNumber}: Connection error`);
      }
      es.close();
      resolve({ success: receivedToken, streamNumber, error: true });
    });
    
    // Timeout after 15 seconds
    setTimeout(() => {
      if (!receivedToken) {
        errorCount++;
        console.log(`   ⏱️  Stream #${streamNumber}: Timeout (no token received)`);
        es.close();
        resolve({ success: false, streamNumber, timeout: true });
      }
    }, 15000);
  });
}

async function runTest() {
  console.log('Starting all streams concurrently...\n');
  
  // Start all streams at the same time
  const promises = [];
  for (let i = 1; i <= NUM_STREAMS; i++) {
    promises.push(openStream(i));
    // Small delay to ensure they stack up
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log('\nWaiting for all streams to complete...\n');
  const results = await Promise.all(promises);
  
  // Close any remaining streams
  activeStreams.forEach(es => es.close());
  
  console.log('\n=== Test Results ===\n');
  console.log(`Total streams attempted: ${NUM_STREAMS}`);
  console.log(`Successful streams: ${successCount}`);
  console.log(`Failed/Error streams: ${errorCount}`);
  
  console.log('\n=== Individual Results ===\n');
  results.forEach(r => {
    const status = r.success ? '✅ Success' : '❌ Failed';
    const reason = r.timeout ? '(timeout)' : r.error ? '(error)' : '';
    console.log(`Stream #${r.streamNumber}: ${status} ${reason}`);
  });
  
  console.log('\n=== Assessment ===\n');
  if (successCount === NUM_STREAMS) {
    console.log('✅ All streams succeeded - No rate limiting detected');
    console.log('   (This is expected if testing against Java VA directly)');
  } else if (successCount >= 1 && errorCount >= 1) {
    console.log('⚠️  Mixed results - Some streams succeeded, others failed');
    console.log('   This could indicate rate limiting or connection issues');
  } else {
    console.log('❌ All streams failed - Check service availability');
  }
  
  process.exit(0);
}

runTest().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
