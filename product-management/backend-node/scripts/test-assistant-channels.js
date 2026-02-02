/**
 * Test script for assistant_channels API
 * Run with: node scripts/test-assistant-channels.js
 * 
 * Prerequisites:
 * 1. Backend server running (npm run dev)
 * 2. MongoDB running
 * 3. Assistant channels created (run create-assistant-channels.js first)
 * 4. Valid auth token
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const AUTH_TOKEN = process.env.TEST_TOKEN || 'YOUR_JWT_TOKEN_HERE';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function testGetChannels() {
  console.log('\n📋 TEST 1: GET /api/assistant-channels');
  try {
    const response = await api.get('/api/assistant-channels');
    console.log('✅ Success:', response.status);
    console.log('  Customer ID:', response.data.customerId);
    console.log('  Voice enabled:', response.data.voice?.enabled);
    console.log('  Chat enabled:', response.data.chat?.enabled);
    return response.data;
  } catch (error) {
    console.error('❌ Failed:', error.response?.status, error.response?.data || error.message);
    return null;
  }
}

async function testToggleVoice(enabled) {
  console.log(`\n🔄 TEST 2: POST /api/assistant-channels/voice/toggle (${enabled ? 'enable' : 'disable'})`);
  try {
    const response = await api.post('/api/assistant-channels/voice/toggle', { enabled });
    console.log('✅ Success:', response.status);
    console.log('  Message:', response.data.message);
    console.log('  Enabled:', response.data.enabled);
  } catch (error) {
    console.error('❌ Failed:', error.response?.status, error.response?.data || error.message);
  }
}

async function testToggleChat(enabled) {
  console.log(`\n🔄 TEST 3: POST /api/assistant-channels/chat/toggle (${enabled ? 'enable' : 'disable'})`);
  try {
    const response = await api.post('/api/assistant-channels/chat/toggle', { enabled });
    console.log('✅ Success:', response.status);
    console.log('  Message:', response.data.message);
    console.log('  Enabled:', response.data.enabled);
  } catch (error) {
    console.error('❌ Failed:', error.response?.status, error.response?.data || error.message);
  }
}

async function testUpdateVoiceConfig() {
  console.log('\n✏️  TEST 4: PATCH /api/assistant-channels/voice');
  try {
    const voiceConfig = {
      enabled: true,
      phoneNumber: '+15551234567',
      fallbackNumber: '+15550001111',
      businessHours: {
        timezone: 'America/Los_Angeles',
        monday: { open: '08:00', close: '18:00' },
        tuesday: { open: '08:00', close: '18:00' },
        wednesday: { open: '08:00', close: '18:00' },
        thursday: { open: '08:00', close: '18:00' },
        friday: { open: '08:00', close: '18:00' }
      },
      voiceSettings: {
        language: 'en-US',
        voiceId: 'en-US-Neural2-F',
        speechRate: 1.1
      }
    };

    const response = await api.patch('/api/assistant-channels/voice', voiceConfig);
    console.log('✅ Success:', response.status);
    console.log('  Timezone updated to:', response.data.voice?.businessHours?.timezone);
    console.log('  Speech rate:', response.data.voice?.voiceSettings?.speechRate);
  } catch (error) {
    console.error('❌ Failed:', error.response?.status, error.response?.data || error.message);
  }
}

async function testUpdateChatConfig() {
  console.log('\n✏️  TEST 5: PATCH /api/assistant-channels/chat');
  try {
    const chatConfig = {
      enabled: true,
      greeting: 'Welcome! How may I assist you?',
      typingIndicator: true,
      maxTurns: 25,
      showIntent: true,
      allowFileUpload: true
    };

    const response = await api.patch('/api/assistant-channels/chat', chatConfig);
    console.log('✅ Success:', response.status);
    console.log('  Greeting:', response.data.chat?.greeting);
    console.log('  Max turns:', response.data.chat?.maxTurns);
    console.log('  Show intent:', response.data.chat?.showIntent);
  } catch (error) {
    console.error('❌ Failed:', error.response?.status, error.response?.data || error.message);
  }
}

async function testGetByPhone() {
  console.log('\n📞 TEST 6: GET /api/assistant-channels/by-phone/+15551234567 (no auth)');
  try {
    // This endpoint doesn't require authentication (used by Twilio)
    const response = await axios.get(`${BASE_URL}/api/assistant-channels/by-phone/+15551234567`);
    console.log('✅ Success:', response.status);
    console.log('  Customer ID:', response.data.customerId);
    console.log('  Voice phone:', response.data.voice?.phoneNumber);
    console.log('  Voice enabled:', response.data.voice?.enabled);
  } catch (error) {
    console.error('❌ Failed:', error.response?.status, error.response?.data || error.message);
  }
}

async function testChatSession() {
  console.log('\n💬 TEST 7: POST /api/chat/session (check chat.enabled)');
  try {
    const response = await api.post('/api/chat/session', {});
    console.log('✅ Success:', response.status);
    console.log('  Session ID:', response.data.sessionId);
    console.log('  Chat config:', response.data.chatConfig);
  } catch (error) {
    if (error.response?.status === 403) {
      console.log('⚠️  Expected: Chat channel is disabled (403)');
      console.log('  Message:', error.response.data.error);
    } else {
      console.error('❌ Failed:', error.response?.status, error.response?.data || error.message);
    }
  }
}

async function runAllTests() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║         ASSISTANT CHANNELS API TEST SUITE                ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  
  if (AUTH_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
    console.log('\n⚠️  WARNING: Please set a valid AUTH_TOKEN');
    console.log('   Get token from: POST /api/auth/login');
    console.log('   Set via: export TEST_TOKEN="your_jwt_token"');
    console.log('\n   Skipping tests that require authentication...\n');
    
    // Only run test that doesn't require auth
    await testGetByPhone();
    return;
  }

  // Run all tests
  const channels = await testGetChannels();
  
  if (channels) {
    await testToggleVoice(false);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testToggleVoice(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testToggleChat(false);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testToggleChat(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testUpdateVoiceConfig();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testUpdateChatConfig();
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  await testGetByPhone();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await testChatSession();
  
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                   TESTS COMPLETED                        ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
