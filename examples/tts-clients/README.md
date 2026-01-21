# TTS gRPC Client Examples

This directory contains example clients for calling the TTS gRPC endpoints in various programming languages.

## Available Clients

1. **[Node.js/TypeScript Client](nodejs/tts-client.ts)** - Full-featured client with streaming support
2. **[Python Client](python/tts_client.py)** - Python gRPC client with examples
3. **[Java Client](java/TtsGrpcClient.java)** - Java gRPC client implementation
4. **[Shell Scripts](shell/)** - curl/grpcurl examples for testing

## Quick Start

### Node.js Client

```bash
cd nodejs
npm install
npx ts-node tts-client.ts
```

**Output**: `output.mp3`, `output_stream.mp3`

### Python Client

```bash
cd python
pip install -r requirements.txt
python tts_client.py
```

**Output**: `output_python.mp3`, `output_python_stream.mp3`

### Java Client

```bash
cd java
mvn clean package
java -jar target/tts-client-1.0.jar
```

**Output**: `output_java.mp3`, `output_java_stream.mp3`

### Shell Testing (grpcurl)

```bash
cd shell
./test-synthesize.sh "Hello, this is a test"
```

## Prerequisites

### All Clients

- Java va-service running on `localhost:50051`
- Proto files compiled (automatic with Maven build)

### Node.js

- Node.js 18+ installed
- Dependencies: `@grpc/grpc-js`, `@grpc/proto-loader`

### Python

- Python 3.8+ installed
- Dependencies: `grpcio`, `grpcio-tools`

### Java

- JDK 17+ installed
- Maven 3.8+ installed

### Shell Scripts

- `grpcurl` installed (for gRPC testing)
  - Windows: `choco install grpcurl`
  - Mac: `brew install grpcurl`
  - Linux: Download from [grpcurl releases](https://github.com/fullstorydev/grpcurl/releases)

## Examples

### Single Synthesis

**Node.js**:
```typescript
const audio = await synthesizeText('Hello, world!', 'en-US', 'en-US-JennyNeural');
fs.writeFileSync('output.mp3', audio);
```

**Python**:
```python
audio = synthesize_text('Hello, world!', 'en-US', 'en-US-JennyNeural')
with open('output.mp3', 'wb') as f:
    f.write(audio)
```

**Java**:
```java
byte[] audio = client.synthesize("Hello, world!", "en-US", "en-US-JennyNeural");
Files.write(Paths.get("output.mp3"), audio);
```

### Streaming Synthesis

**Node.js**:
```typescript
const chunks = ['First sentence. ', 'Second sentence. ', 'Third sentence.'];
const audio = await synthesizeStream(chunks, 'en-US');
```

**Python**:
```python
chunks = ['First sentence. ', 'Second sentence. ', 'Third sentence.']
audio = synthesize_stream(chunks, 'en-US')
```

**Java**:
```java
String[] chunks = {"First sentence. ", "Second sentence. ", "Third sentence."};
byte[] audio = client.synthesizeStream(chunks, "en-US", "en-US-GuyNeural");
```

## Configuration

All clients connect to `localhost:50051` by default. To change:

**Node.js**: Edit `tts-client.ts`, line 15:
```typescript
const client = new voiceService('your-server:50051', ...);
```

**Python**: Edit `tts_client.py`, line 8:
```python
channel = grpc.insecure_channel('your-server:50051')
```

**Java**: Pass host and port to constructor:
```java
TtsGrpcClient client = new TtsGrpcClient("your-server", 50051);
```

## Voice Options

See [PHASE-4-COMPLETE.md](../../docs/PHASE-4-COMPLETE.md#voice-selection-guide) for full voice list.

**Popular Voices**:
- `en-US-JennyNeural` - Friendly, warm (female)
- `en-US-GuyNeural` - Professional (male)
- `en-US-AriaNeural` - Conversational (female)
- `es-ES-ElviraNeural` - Spanish (Spain)
- `fr-FR-DeniseNeural` - French (France)

## Audio Formats

Supported formats:
- `mp3` (default) - Most compatible
- `wav` - Uncompressed, high quality
- `ogg` - Vorbis compression
- `webm` - WebM audio

Format is specified in synthesis request (see client examples).

## Troubleshooting

### "Connection refused" error

**Issue**: va-service not running

**Solution**:
```bash
cd services-java/va-service
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=dev
```

### "Method not found" error

**Issue**: Proto definitions out of sync

**Solution**: Recompile va-service:
```bash
cd services-java/va-service
.\mvnw.cmd clean compile
```

### "UNAUTHENTICATED" error

**Issue**: Azure Speech key not configured (production mode)

**Solution**: Use dev profile (mock TTS):
```bash
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=dev
```

Or set Azure key:
```bash
$env:AZURE_SPEECH_KEY="your_key"
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=prod
```

### Python proto import error

**Issue**: Proto files not generated

**Solution**:
```bash
cd python
python -m grpc_tools.protoc \
  -I../../services-java/va-service/src/main/proto \
  --python_out=. \
  --grpc_python_out=. \
  voice.proto
```

## License

MIT License - See main project LICENSE file

## Support

See main documentation: [PHASE-4-COMPLETE.md](../../docs/PHASE-4-COMPLETE.md)
