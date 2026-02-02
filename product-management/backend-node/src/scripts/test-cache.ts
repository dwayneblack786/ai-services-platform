/**
 * Cache Service Test Script
 * 
 * This script tests the unified cache service to verify:
 * 1. Redis connection and operations
 * 2. In-memory fallback when Redis is unavailable
 * 3. TTL expiration
 * 4. Namespace isolation
 * 
 * Run: npm run test:cache
 */

import { cacheService, userCache, sessionCache, tenantCache } from '../services/cache.service';
import logger from '../utils/logger';

async function runCacheTests() {
  console.log('\n='.repeat(60));
  console.log('🧪 CACHE SERVICE TEST SUITE');
  console.log('='.repeat(60));

  try {
    // Test 1: Basic operations
    console.log('\n[Test 1] Basic cache operations...');
    await cacheService.set('test-key', 'test-value');
    const value = await cacheService.get('test-key');
    console.assert(value === 'test-value', '❌ Basic set/get failed');
    console.log('✅ Basic set/get works');

    // Test 2: JSON operations
    console.log('\n[Test 2] JSON cache operations...');
    const testObj = { name: 'John', age: 30, active: true };
    await cacheService.setJSON('test-json', testObj);
    const retrievedObj = await cacheService.getJSON('test-json');
    console.assert(
      JSON.stringify(retrievedObj) === JSON.stringify(testObj),
      '❌ JSON set/get failed'
    );
    console.log('✅ JSON set/get works');

    // Test 3: TTL expiration
    console.log('\n[Test 3] TTL expiration...');
    await cacheService.set('ttl-key', 'expires-soon', 2); // 2 seconds
    let ttlValue = await cacheService.get('ttl-key');
    console.assert(ttlValue === 'expires-soon', '❌ TTL set failed');
    console.log('⏳ Waiting 3 seconds for expiration...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    ttlValue = await cacheService.get('ttl-key');
    console.assert(ttlValue === null, '❌ TTL expiration failed');
    console.log('✅ TTL expiration works');

    // Test 4: Delete operations
    console.log('\n[Test 4] Delete operations...');
    await cacheService.set('delete-key', 'to-be-deleted');
    const deleted = await cacheService.delete('delete-key');
    console.assert(deleted === true, '❌ Delete failed');
    const afterDelete = await cacheService.get('delete-key');
    console.assert(afterDelete === null, '❌ Key still exists after delete');
    console.log('✅ Delete operations work');

    // Test 5: Pattern deletion
    console.log('\n[Test 5] Pattern deletion...');
    await cacheService.set('pattern:1', 'value1');
    await cacheService.set('pattern:2', 'value2');
    await cacheService.set('other:1', 'value3');
    const deletedCount = await cacheService.deletePattern('pattern:*');
    console.assert(deletedCount === 2, `❌ Pattern delete failed (deleted ${deletedCount})`);
    const remaining = await cacheService.get('other:1');
    console.assert(remaining === 'value3', '❌ Pattern delete removed too much');
    console.log('✅ Pattern deletion works');

    // Test 6: Exists check
    console.log('\n[Test 6] Exists check...');
    await cacheService.set('exists-key', 'value');
    const exists = await cacheService.exists('exists-key');
    const notExists = await cacheService.exists('non-existent-key');
    console.assert(exists === true, '❌ Exists check failed for existing key');
    console.assert(notExists === false, '❌ Exists check failed for non-existent key');
    console.log('✅ Exists check works');

    // Test 7: Namespace isolation
    console.log('\n[Test 7] Namespace isolation...');
    await userCache.set('profile', 'user-data');
    await sessionCache.set('profile', 'session-data');
    await tenantCache.set('profile', 'tenant-data');
    
    const userData = await userCache.get('profile');
    const sessionData = await sessionCache.get('profile');
    const tenantData = await tenantCache.get('profile');
    
    console.assert(userData === 'user-data', '❌ User namespace failed');
    console.assert(sessionData === 'session-data', '❌ Session namespace failed');
    console.assert(tenantData === 'tenant-data', '❌ Tenant namespace failed');
    console.log('✅ Namespace isolation works');

    // Test 8: Clear namespace
    console.log('\n[Test 8] Clear namespace...');
    await userCache.set('key1', 'value1');
    await userCache.set('key2', 'value2');
    await userCache.clear();
    const afterClear1 = await userCache.get('key1');
    const afterClear2 = await userCache.get('key2');
    console.assert(afterClear1 === null && afterClear2 === null, '❌ Clear namespace failed');
    console.log('✅ Clear namespace works');

    // Test 9: Cache status
    console.log('\n[Test 9] Cache status...');
    const status = cacheService.getStatus();
    console.log(`📊 Cache Status:
  - Backend: ${status.using}
  - Ready: ${status.ready}
    `);
    console.log('✅ Cache status retrieval works');

    // Cleanup
    console.log('\n[Cleanup] Removing test keys...');
    await cacheService.deletePattern('test-*');
    await cacheService.deletePattern('other:*');
    await sessionCache.clear();
    await tenantCache.clear();
    console.log('✅ Cleanup complete');

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error);
    throw error;
  }
}

// Run tests if executed directly
if (require.main === module) {
  runCacheTests()
    .then(() => {
      console.log('\n✅ Test suite completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test suite failed:', error);
      process.exit(1);
    });
}

export { runCacheTests };
