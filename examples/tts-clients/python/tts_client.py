#!/usr/bin/env python3
"""
TTS gRPC Client - Python
Text-to-Speech client for va-service
"""

import grpc
import sys
import os
from pathlib import Path
from datetime import datetime

# Add generated proto files to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'generated'))

# Import generated gRPC code (after generation)
try:
    from generated import voice_service_pb2
    from generated import voice_service_pb2_grpc
except ImportError:
    print("❌ Error: gRPC proto files not generated")
    print("Run: python -m grpc_tools.protoc --python_out=generated --grpc_python_out=generated ...")
    print("See README.md for instructions")
    sys.exit(1)


class TtsGrpcClient:
    """TTS gRPC Client"""
    
    def __init__(self, server_address='localhost:50051'):
        """Initialize client with server address"""
        self.server_address = server_address
        self.channel = grpc.insecure_channel(server_address)
        self.stub = voice_service_pb2_grpc.VoiceServiceStub(self.channel)
        
    def synthesize_text(
        self,
        text: str,
        language: str = 'en-US',
        voice_name: str = 'en-US-JennyNeural',
        format: str = 'mp3',
        customer_id: str = 'python-client'
    ) -> bytes:
        """
        Synthesize text to speech (single request)
        
        Args:
            text: Text to synthesize
            language: Language code (e.g., 'en-US', 'es-ES')
            voice_name: Azure voice name (e.g., 'en-US-JennyNeural')
            format: Audio format ('mp3', 'wav', 'ogg')
            customer_id: Customer identifier
            
        Returns:
            Audio data as bytes
        """
        session_id = f'python-{datetime.now().timestamp()}'
        
        request = voice_service_pb2.SynthesisRequest(
            session_id=session_id,
            text=text,
            language=language,
            voice_name=voice_name,
            format=format,
            customer_id=customer_id
        )
        
        text_preview = text[:50] + '...' if len(text) > 50 else text
        print(f'[TTS] Synthesizing: "{text_preview}"')
        print(f'[TTS] Voice: {voice_name}, Language: {language}, Format: {format}')
        
        try:
            response = self.stub.Synthesize(request)
            
            audio_data = response.audio_data
            metadata = response.metadata
            
            print('[TTS] ✅ Synthesis successful:')
            print(f'       Session ID: {response.session_id}')
            print(f'       Audio size: {len(audio_data)} bytes')
            print(f'       Duration: {metadata.duration_ms}ms')
            print(f'       Voice: {metadata.voice_name}')
            print(f'       Provider: {metadata.provider}')
            print(f'       Processing time: {metadata.processing_time_ms}ms')
            
            return audio_data
            
        except grpc.RpcError as e:
            print(f'[TTS] ❌ Synthesis failed: {e.details()}')
            raise
            
    def synthesize_stream(
        self,
        text_chunks: list,
        language: str = 'en-US',
        voice_name: str = 'en-US-JennyNeural',
        format: str = 'mp3',
        customer_id: str = 'python-client'
    ) -> bytes:
        """
        Synthesize text with streaming (for long texts)
        
        Args:
            text_chunks: List of text chunks to stream
            language: Language code
            voice_name: Azure voice name
            format: Audio format
            customer_id: Customer identifier
            
        Returns:
            Complete audio data as bytes
        """
        session_id = f'python-stream-{datetime.now().timestamp()}'
        audio_chunks = []
        
        print(f'[TTS Stream] Streaming {len(text_chunks)} text chunks')
        
        def request_generator():
            """Generate streaming requests"""
            for index, chunk in enumerate(text_chunks):
                yield voice_service_pb2.TextChunk(
                    session_id=session_id,
                    text=chunk,
                    language=language,
                    voice_name=voice_name,
                    format=format,
                    customer_id=customer_id,
                    sequence_number=index,
                    is_final_chunk=(index == len(text_chunks) - 1)
                )
                print(f'[TTS Stream] Sent chunk {index + 1}/{len(text_chunks)}')
        
        try:
            responses = self.stub.SynthesizeStream(request_generator())
            
            for response in responses:
                audio_chunk = response.audio_data
                audio_chunks.append(audio_chunk)
                print(f'[TTS Stream] Received audio chunk: {len(audio_chunk)} bytes')
            
            full_audio = b''.join(audio_chunks)
            print(f'[TTS Stream] ✅ Stream complete: {len(full_audio)} bytes total')
            
            return full_audio
            
        except grpc.RpcError as e:
            print(f'[TTS Stream] ❌ Stream failed: {e.details()}')
            raise
            
    def close(self):
        """Close client connection"""
        self.channel.close()


def save_audio(audio_data: bytes, filename: str):
    """Save audio data to file"""
    with open(filename, 'wb') as f:
        f.write(audio_data)
    print(f'[File] 💾 Saved audio to: {filename}')


def main():
    """Main function - Examples"""
    client = TtsGrpcClient()
    
    try:
        # Get text from command line or use default
        text = sys.argv[1] if len(sys.argv) > 1 else 'Hello, this is a test of text-to-speech synthesis'
        
        print('=== TTS gRPC Client - Python ===\n')
        
        # Example 1: Single synthesis (default voice)
        print('--- Example 1: Single Synthesis (JennyNeural) ---')
        audio1 = client.synthesize_text(text, 'en-US', 'en-US-JennyNeural')
        save_audio(audio1, 'output-jenny.mp3')
        print()
        
        # Example 2: Different voice
        print('--- Example 2: Male Voice (GuyNeural) ---')
        audio2 = client.synthesize_text(
            'This is GuyNeural speaking',
            'en-US',
            'en-US-GuyNeural'
        )
        save_audio(audio2, 'output-guy.mp3')
        print()
        
        # Example 3: Spanish voice
        print('--- Example 3: Spanish Voice (ElviraNeural) ---')
        audio3 = client.synthesize_text(
            'Hola, esta es una prueba de síntesis de voz',
            'es-ES',
            'es-ES-ElviraNeural'
        )
        save_audio(audio3, 'output-spanish.mp3')
        print()
        
        # Example 4: Streaming synthesis (for long text)
        print('--- Example 4: Streaming Synthesis ---')
        long_text = [
            'This is the first part of a long text.',
            'This is the second part, demonstrating streaming.',
            'And this is the final part of our streaming example.',
        ]
        audio4 = client.synthesize_stream(long_text)
        save_audio(audio4, 'output-stream.mp3')
        print()
        
        print('✅ All examples completed successfully!')
        print('Audio files saved in current directory.')
        
    except Exception as e:
        print(f'❌ Error: {e}')
        sys.exit(1)
    finally:
        client.close()


if __name__ == '__main__':
    main()
