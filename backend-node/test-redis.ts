import { createClient } from 'redis';

async function testRedis() {
  console.log('🔍 Testing Redis connection at redis://127.0.0.1:6379...\n');
  
  const client = createClient({
    url: 'redis://127.0.0.1:6379'
  });

  client.on('error', (err) => {
    console.error('❌ Redis Client Error:', err);
  });

  try {
    await client.connect();
    console.log('✅ Successfully connected to Redis!\n');

    // Test basic operations
    console.log('Testing SET operation...');
    await client.set('test:key', 'Hello Redis!');
    console.log('✅ SET successful\n');

    console.log('Testing GET operation...');
    const value = await client.get('test:key');
    console.log('✅ GET successful - Value:', value, '\n');

    console.log('Testing Redis info...');
    const info = await client.info('server');
    const versionMatch = info.match(/redis_version:([^\r\n]+)/);
    if (versionMatch) {
      console.log('✅ Redis version:', versionMatch[1]);
    }

    // Test session key pattern
    console.log('\nTesting session key creation...');
    await client.set('sess:test-session-id', JSON.stringify({ user: 'test', timestamp: Date.now() }));
    const sessionData = await client.get('sess:test-session-id');
    console.log('✅ Session data stored:', sessionData);

    // Cleanup
    await client.del('test:key');
    await client.del('sess:test-session-id');
    console.log('\n✅ Cleanup complete');

    await client.disconnect();
    console.log('\n🎉 Redis connection test passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Redis connection failed:', error);
    process.exit(1);
  }
}

testRedis();
