#!/bin/bash
# TTS gRPC Testing with grpcurl
# Usage: ./test-synthesize.sh "Text to synthesize"

TEXT="${1:-Hello, this is a test of text-to-speech}"
HOST="${2:-localhost:50051}"

echo "=== TTS Synthesis Test with grpcurl ==="
echo "Text: $TEXT"
echo "Host: $HOST"
echo ""

# Test 1: Synthesize (single request)
echo "Test 1: Single synthesis request"
grpcurl -plaintext \
  -d "{
    \"session_id\": \"test-$(date +%s)\",
    \"text\": \"$TEXT\",
    \"language\": \"en-US\",
    \"voice_name\": \"en-US-JennyNeural\",
    \"format\": \"mp3\",
    \"customer_id\": \"test-customer\"
  }" \
  $HOST \
  com.ai.va.grpc.VoiceService/Synthesize | jq '{ 
    session_id: .session_id,
    format: .format,
    audio_size: (.audio_data | length),
    metadata: {
      voice: .metadata.voice_name,
      duration_ms: .metadata.duration_ms,
      provider: .metadata.provider,
      success: .metadata.success
    }
  }'

echo ""
echo "✅ Test complete"
echo ""
echo "Note: Audio data is base64 encoded in the response."
echo "To save audio, use a proper gRPC client (Node.js, Python, or Java)."
