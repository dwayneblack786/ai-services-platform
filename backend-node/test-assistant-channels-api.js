const axios = require('axios');

const BACKEND_URL = 'http://localhost:5000';
const PRODUCT_ID = '69728bdb0959e1a2da517684'; // Healthcare VA
const TENANT_ID = 'ten-splendor-florida-33064';

async function testAPIEndpoints() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('TESTING ASSISTANT CHANNELS API ENDPOINTS');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Test 1: Check if backend is running
  console.log('📝 Test 1: Check Backend Health');
  console.log('─────────────────────────────────────────────────────────');
  try {
    const healthResponse = await axios.get(`${BACKEND_URL}/api/health`);
    console.log('✅ Backend is running');
    console.log('   Status:', healthResponse.status);
    console.log('   Data:', healthResponse.data);
  } catch (err) {
    console.log('❌ Backend is NOT running or health endpoint failed');
    console.log('   Error:', err.message);
    console.log('\n⚠️  CRITICAL: Backend must be running for tests to work');
    console.log('   Start backend with: cd backend-node && npm run dev\n');
    process.exit(1);
  }
  console.log('');

  // Test 2: Try to access endpoint WITHOUT authentication (should fail with 401)
  console.log('📝 Test 2: Access Without Authentication (Should Fail)');
  console.log('─────────────────────────────────────────────────────────');
  try {
    const response = await axios.get(`${BACKEND_URL}/api/assistant-channels/${PRODUCT_ID}`);
    console.log('⚠️  Unexpected: Got response without auth:', response.status);
    console.log('   This might indicate auth middleware is not working');
  } catch (err) {
    if (err.response?.status === 401) {
      console.log('✅ Correctly rejected - authentication required');
      console.log('   Status:', err.response.status);
      console.log('   Message:', err.response.data);
    } else {
      console.log('❌ Unexpected error:', err.message);
      console.log('   Status:', err.response?.status);
    }
  }
  console.log('');

  // Test 3: Check database directly
  console.log('📝 Test 3: Verify Database Has Data');
  console.log('─────────────────────────────────────────────────────────');
  const { MongoClient, ObjectId } = require('mongodb');
  const mongoClient = new MongoClient('mongodb://localhost:27017');
  
  try {
    await mongoClient.connect();
    const db = mongoClient.db('ai_platform');
    
    const channel = await db.collection('assistant_channels').findOne({
      tenantId: TENANT_ID,
      productId: new ObjectId(PRODUCT_ID)
    });
    
    if (channel) {
      console.log('✅ Database has channel data');
      console.log('   _id:', channel._id);
      console.log('   tenantId:', channel.tenantId);
      console.log('   productId:', channel.productId);
      console.log('   voice.enabled:', channel.voice?.enabled);
      console.log('   chat.enabled:', channel.chat?.enabled);
    } else {
      console.log('❌ No channel found in database');
      console.log('   This is the root cause - frontend will show no data');
    }
  } catch (err) {
    console.log('❌ Database error:', err.message);
  } finally {
    await mongoClient.close();
  }
  console.log('');

  // Summary
  console.log('═══════════════════════════════════════════════════════════');
  console.log('NEXT STEPS TO FIX FRONTEND');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('The issue is likely one of these:');
  console.log('');
  console.log('1. AUTHENTICATION ISSUE');
  console.log('   - Frontend user is not logged in properly');
  console.log('   - JWT token is missing or expired');
  console.log('   - Check browser console for 401 errors');
  console.log('   - Solution: Log out and log back in');
  console.log('');
  console.log('2. WRONG PRODUCT ID');
  console.log('   - Frontend is using a different productId');
  console.log('   - Check the URL when viewing assistant-channels tab');
  console.log('   - Should be: /products/' + PRODUCT_ID + '/configure');
  console.log('');
  console.log('3. WRONG TENANT ID');
  console.log('   - Frontend user is associated with different tenant');
  console.log('   - Check JWT token payload (user.tenantId)');
  console.log('   - Should be: ' + TENANT_ID);
  console.log('');
  console.log('4. API ROUTE NOT REGISTERED');
  console.log('   - Check backend-node/src/index.ts');
  console.log('   - Should have: app.use(\'/api/assistant-channels\', ...)');
  console.log('');
  console.log('5. BACKEND NOT RUNNING');
  console.log('   - Start backend: cd backend-node && npm run dev');
  console.log('   - Check port 5000 is available');
  console.log('');
  console.log('TO DEBUG IN BROWSER:');
  console.log('1. Open DevTools (F12)');
  console.log('2. Go to Network tab');
  console.log('3. Refresh the assistant-channels page');
  console.log('4. Look for: GET /api/assistant-channels/' + PRODUCT_ID);
  console.log('5. Check Status Code:');
  console.log('   - 401: Authentication issue (re-login)');
  console.log('   - 403: Authorization issue (wrong role)');
  console.log('   - 404: Wrong productId or route not found');
  console.log('   - 500: Server error (check backend logs)');
  console.log('   - 200: Success (data should appear)');
  console.log('');
}

testAPIEndpoints()
  .then(() => {
    console.log('✅ Tests complete\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  });
