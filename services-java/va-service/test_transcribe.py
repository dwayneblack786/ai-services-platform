"""
Simple Python test for Transcribe RPC
Run: python test_transcribe.py
"""
import grpc
import sys
from google.protobuf import timestamp_pb2

# Import generated proto files
sys.path.insert(0, 'target/generated-sources/protobuf/python')
try:
    import voice_pb2
    import voice_pb2_grpc
except ImportError:
    print("❌ Proto files not found. Need to generate them first.")
    print("   Run: pip install grpcio grpcio-tools protobuf")
    print("   Then: python -m grpc_tools.protoc -I=src/main/proto --python_out=target/generated-sources/protobuf/python --grpc_python_out=target/generated-sources/protobuf/python src/main/proto/voice.proto")
    sys.exit(1)

def test_transcribe():
    print("═" * 60)
    print("  Testing va-service Transcribe RPC")
    print("═" * 60)
    print()
    
    # Create channel
    channel = grpc.insecure_channel('localhost:50051')
    stub = voice_pb2_grpc.VoiceServiceStub(channel)
    
    # Create dummy audio data
    dummy_audio = b'test audio data - placeholder'
    
    # Create request
    request = voice_pb2.AudioChunk(
        session_id=f'test-session-python',
        audio_data=dummy_audio,
        format='webm',
        timestamp=1234567890,
        sequence_number=1,
        customer_id='test-customer',
        is_final_chunk=True
    )
    
    print("Sending Transcribe request:")
    print(f"  Session ID: {request.session_id}")
    print(f"  Format: {request.format}")
    print(f"  Audio size: {len(dummy_audio)} bytes")
    print()
    
    try:
        # Make RPC call
        response = stub.Transcribe(request, timeout=30)
        
        print("✅ Transcribe Response:")
        print(f"  Session ID: {response.session_id}")
        print(f"  Text: {response.text}")
        print(f"  Confidence: {response.confidence}")
        print(f"  Language: {response.language}")
        print(f"  Is Final: {response.is_final}")
        if response.metadata:
            print(f"  Provider: {response.metadata.provider}")
            print(f"  Model: {response.metadata.model}")
        print()
        print("✅ Test PASSED!")
        return True
        
    except grpc.RpcError as e:
        print(f"❌ Error: {e.code()}")
        print(f"   Details: {e.details()}")
        return False
    finally:
        channel.close()

if __name__ == '__main__':
    success = test_transcribe()
    sys.exit(0 if success else 1)
