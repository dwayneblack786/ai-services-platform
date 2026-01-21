// Quick test for Transcribe RPC using grpc-js
// Run: node test-transcribe.js

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const fs = require('fs');

// Load proto
const PROTO_PATH = path.join(__dirname, 'src', 'main', 'proto', 'voice.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const voiceProto = grpc.loadPackageDefinition(packageDefinition).com.ai.va.grpc;

// Create client
const client = new voiceProto.VoiceService(
    'localhost:50051',
    grpc.credentials.createInsecure()
);

// Test Transcribe RPC
function testTranscribe() {
    console.log('Testing Transcribe RPC...\n');
    
    // Create dummy audio data (in real scenario, this would be actual audio bytes)
    const dummyAudio = Buffer.from('test audio data - this is just a placeholder');
    
    const request = {
        session_id: 'test-session-' + Date.now(),
        audio_data: dummyAudio,
        format: 'webm',
        timestamp: Date.now(),
        sequence_number: 1,
        customer_id: 'test-customer',
        is_final_chunk: true
    };
    
    console.log('Sending Transcribe request:');
    console.log('  Session ID:', request.session_id);
    console.log('  Format:', request.format);
    console.log('  Audio size:', dummyAudio.length, 'bytes');
    console.log('');
    
    client.transcribe(request, (error, response) => {
        if (error) {
            console.error('❌ Error:', error.message);
            console.error('   Code:', error.code);
            console.error('   Details:', error.details);
            process.exit(1);
        } else {
            console.log('✅ Transcribe Response:');
            console.log('  Session ID:', response.session_id);
            console.log('  Text:', response.text);
            console.log('  Confidence:', response.confidence);
            console.log('  Language:', response.language);
            console.log('  Is Final:', response.is_final);
            if (response.metadata) {
                console.log('  Provider:', response.metadata.provider);
                console.log('  Model:', response.metadata.model);
            }
            console.log('\n✅ Test PASSED!');
            process.exit(0);
        }
    });
}

// Run test
console.log('═══════════════════════════════════════');
console.log('  Testing va-service Transcribe RPC    ');
console.log('═══════════════════════════════════════\n');

testTranscribe();

// Timeout after 30 seconds
setTimeout(() => {
    console.error('❌ Test timed out after 30 seconds');
    process.exit(1);
}, 30000);
