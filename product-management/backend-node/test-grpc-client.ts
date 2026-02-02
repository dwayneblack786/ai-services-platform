/**
 * Test script to verify gRPC client can initialize independently
 */

console.log('🔧 Starting gRPC client test...');

try {
  console.log('📦 Importing grpcClient...');
  const { grpcClient } = require('./src/grpc/client');
  
  console.log('✅ grpcClient imported successfully');
  console.log('📊 Client status:', {
    isConnected: grpcClient.isConnected(),
    hasClient: !!grpcClient
  });
  
  console.log('🎉 Test completed successfully!');
  process.exit(0);
} catch (error: any) {
  console.error('❌ Test failed:', error);
  console.error('Stack trace:', error?.stack);
  process.exit(1);
}
