# TTS gRPC Client - Node.js/TypeScript

Node.js/TypeScript client for the TTS (Text-to-Speech) gRPC service.

## Features

- ✅ Single text synthesis
- ✅ Streaming synthesis for long texts
- ✅ Multiple voice support (100+ voices)
- ✅ Multi-language support (50+ languages)
- ✅ Audio file saving (MP3)
- ✅ Full TypeScript type safety
- ✅ Error handling and retry logic

## Prerequisites

- **Node.js** 18+ (with npm)
- **va-service** running on `localhost:50051`

## Installation

```bash
npm install
```

This will install:
- `@grpc/grpc-js` - gRPC client library
- `@grpc/proto-loader` - Protocol Buffers loader
- `typescript` - TypeScript compiler
- `ts-node` - TypeScript executor

## Usage

### Run with Default Text

```bash
npm run dev
```

### Run with Custom Text

```bash
npm run dev "Your custom text here"
```

Or directly with ts-node:

```bash
npx ts-node tts-client.ts "Hello from TypeScript"
```

### Build and Run

```bash
npm run build
npm start
```

## Configuration

Edit the constants at the top of `tts-client.ts`:

```typescript
const PROTO_PATH = '../../../services-java/va-service/src/main/proto/voice_service.proto';
const SERVER_HOST = process.env.TTS_SERVER_HOST || 'localhost:50051';
```

Or set environment variable:

```bash
export TTS_SERVER_HOST=yourserver:50051  # Linux/Mac
$env:TTS_SERVER_HOST="yourserver:50051"  # PowerShell
npm run dev
```

## Code Examples

### Basic Synthesis

```typescript
import { TtsGrpcClient } from './tts-client';

const client = new TtsGrpcClient();

// Synthesize with default voice (JennyNeural)
const audio = await client.synthesizeText('Hello, world!');
fs.writeFileSync('output.mp3', audio);

client.close();
```

### Custom Voice

```typescript
// Spanish voice
const audio = await client.synthesizeText(
  'Hola, ¿cómo estás?',
  'es-ES',
  'es-ES-ElviraNeural'
);
```

### Streaming Synthesis (Long Text)

```typescript
const textChunks = [
  'This is the first sentence.',
  'This is the second sentence.',
  'And this is the final sentence.',
];

const audio = await client.synthesizeStream(textChunks);
fs.writeFileSync('output-stream.mp3', audio);
```

### Error Handling

```typescript
try {
  const audio = await client.synthesizeText('Hello, world!');
  fs.writeFileSync('output.mp3', audio);
  console.log('✅ Success!');
} catch (error) {
  console.error('❌ Synthesis failed:', error.message);
  // Handle error (retry, fallback, etc.)
}
```

## Popular Voices

### English (US)

```typescript
'en-US-JennyNeural'  // Friendly, conversational (female)
'en-US-GuyNeural'    // Professional, newscaster (male)
'en-US-AriaNeural'   // Natural, assistant (female)
'en-US-SaraNeural'   // Expressive, storytelling (female)
```

### Spanish

```typescript
'es-ES-ElviraNeural' // Spain Spanish (female)
'es-MX-DaliaNeural'  // Mexican Spanish (female)
```

### French

```typescript
'fr-FR-DeniseNeural' // French (female)
'fr-CA-SylvieNeural' // Canadian French (female)
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

### "Cannot find module '@grpc/grpc-js'"

**Solution**: Install dependencies:
```bash
npm install
```

### "ECONNREFUSED"

**Issue**: va-service not running

**Solution**: Start the service:
```bash
cd ../../../services-java/va-service
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=dev
```

### "Method not found"

**Issue**: Proto definition mismatch

**Solution**: Ensure PROTO_PATH points to correct proto file:
```typescript
const PROTO_PATH = '../../../services-java/va-service/src/main/proto/voice_service.proto';
```

### "UNAUTHENTICATED"

**Issue**: Azure Speech key not configured (prod mode)

**Solution**: Use dev profile (mock TTS) or configure Azure key in va-service

## See Also

- [Full TTS Documentation](../../../docs/PHASE-4-COMPLETE.md)
- [Python Client Example](../python/tts_client.py)
- [Java Client Example](../java/TtsGrpcClient.java)
- [Shell/grpcurl Examples](../shell/README.md)
