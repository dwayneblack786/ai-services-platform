# TTS gRPC Client - Python

Python client for the TTS (Text-to-Speech) gRPC service.

## Features

- ✅ Single text synthesis
- ✅ Streaming synthesis for long texts
- ✅ Multiple voice support (100+ voices)
- ✅ Multi-language support (50+ languages)
- ✅ Audio file saving (MP3)
- ✅ Type hints and docstrings
- ✅ Error handling and retry logic

## Prerequisites

- **Python** 3.8+ (with pip)
- **va-service** running on `localhost:50051`

## Installation

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

This installs:
- `grpcio` - gRPC runtime
- `grpcio-tools` - Proto compiler for Python
- `protobuf` - Protocol Buffers runtime

### 2. Generate gRPC Code

**PowerShell (Windows)**:
```powershell
.\generate_proto.ps1
```

**Bash (Linux/Mac)**:
```bash
./generate_proto.sh
```

Or manually:
```bash
python -m grpc_tools.protoc \
  -I ../../../services-java/va-service/src/main/proto \
  --python_out=generated \
  --grpc_python_out=generated \
  ../../../services-java/va-service/src/main/proto/voice_service.proto
```

This creates:
- `generated/voice_service_pb2.py` - Message classes
- `generated/voice_service_pb2_grpc.py` - Service stubs

## Usage

### Run with Default Text

```bash
python tts_client.py
```

### Run with Custom Text

```bash
python tts_client.py "Your custom text here"
```

## Configuration

Edit constants in `tts_client.py`:

```python
client = TtsGrpcClient(server_address='localhost:50051')
```

Or set environment variable:

```bash
export TTS_SERVER_HOST=yourserver:50051  # Linux/Mac
$env:TTS_SERVER_HOST="yourserver:50051"  # PowerShell
```

## Code Examples

### Basic Synthesis

```python
from tts_client import TtsGrpcClient, save_audio

client = TtsGrpcClient()

# Synthesize with default voice (JennyNeural)
audio = client.synthesize_text('Hello, world!')
save_audio(audio, 'output.mp3')

client.close()
```

### Custom Voice

```python
# Spanish voice
audio = client.synthesize_text(
    'Hola, ¿cómo estás?',
    'es-ES',
    'es-ES-ElviraNeural'
)
save_audio(audio, 'output-spanish.mp3')
```

### Streaming Synthesis (Long Text)

```python
text_chunks = [
    'This is the first sentence.',
    'This is the second sentence.',
    'And this is the final sentence.',
]

audio = client.synthesize_stream(text_chunks)
save_audio(audio, 'output-stream.mp3')
```

### Error Handling

```python
import grpc

try:
    audio = client.synthesize_text('Hello, world!')
    save_audio(audio, 'output.mp3')
    print('✅ Success!')
except grpc.RpcError as e:
    print(f'❌ Synthesis failed: {e.details()}')
    # Handle error (retry, fallback, etc.)
```

## Popular Voices

### English (US)

```python
'en-US-JennyNeural'  # Friendly, conversational (female)
'en-US-GuyNeural'    # Professional, newscaster (male)
'en-US-AriaNeural'   # Natural, assistant (female)
'en-US-SaraNeural'   # Expressive, storytelling (female)
```

### Spanish

```python
'es-ES-ElviraNeural' # Spain Spanish (female)
'es-MX-DaliaNeural'  # Mexican Spanish (female)
```

### French

```python
'fr-FR-DeniseNeural' # French (female)
'fr-CA-SylvieNeural' # Canadian French (female)
```

See [full voice list](../../../docs/PHASE-4-COMPLETE.md#voice-selection-guide) in documentation.

## Audio Formats

Supported formats:
- `mp3` (default, recommended)
- `wav`
- `ogg`
- `webm`

## Output Files

Running the example creates these files:
- `output-jenny.mp3` - Default female voice
- `output-guy.mp3` - Male voice
- `output-spanish.mp3` - Spanish voice
- `output-stream.mp3` - Streaming synthesis

## Troubleshooting

### "No module named 'generated'"

**Issue**: gRPC code not generated

**Solution**: Run proto generation:
```bash
python -m grpc_tools.protoc -I ../../../services-java/va-service/src/main/proto \
  --python_out=generated --grpc_python_out=generated \
  ../../../services-java/va-service/src/main/proto/voice_service.proto
```

### "Connection refused"

**Issue**: va-service not running

**Solution**: Start the service:
```bash
cd ../../../services-java/va-service
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=dev
```

### "ModuleNotFoundError: No module named 'grpc'"

**Solution**: Install dependencies:
```bash
pip install -r requirements.txt
```

### "UNAUTHENTICATED"

**Issue**: Azure Speech key not configured (prod mode)

**Solution**: Use dev profile (mock TTS) or configure Azure key in va-service

## Project Structure

```
python/
├── tts_client.py          # Main client implementation
├── requirements.txt       # Python dependencies
├── generate_proto.sh      # Proto generation (Bash)
├── generate_proto.ps1     # Proto generation (PowerShell)
├── README.md             # This file
└── generated/            # Generated gRPC code (create this)
    ├── voice_service_pb2.py
    └── voice_service_pb2_grpc.py
```

## See Also

- [Full TTS Documentation](../../../docs/PHASE-4-COMPLETE.md)
- [Node.js Client Example](../nodejs/tts-client.ts)
- [Java Client Example](../java/TtsGrpcClient.java)
- [Shell/grpcurl Examples](../shell/README.md)
