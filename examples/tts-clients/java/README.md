# TTS gRPC Client - Java

Java client for the TTS (Text-to-Speech) gRPC service.

## Features

- ✅ Single text synthesis (blocking)
- ✅ Streaming synthesis for long texts (async)
- ✅ Multiple voice support (100+ voices)
- ✅ Multi-language support (50+ languages)
- ✅ Audio file saving (MP3)
- ✅ Full type safety with Protocol Buffers
- ✅ Error handling and timeouts

## Prerequisites

- **Java** 17+ (JDK)
- **Maven** 3.6+
- **va-service** running on `localhost:50051`

## Build

### Generate Proto Code and Build JAR

```bash
mvn clean package
```

This will:
1. Generate Java classes from proto file
2. Compile source code
3. Create executable JAR with dependencies

Generated files:
- `target/generated-sources/protobuf/java/` - Protocol Buffer messages
- `target/generated-sources/protobuf/grpc-java/` - gRPC service stubs
- `target/tts-grpc-client-1.0.0-jar-with-dependencies.jar` - Executable JAR

## Usage

### Run with Default Text

```bash
mvn exec:java -Dexec.mainClass="com.ai.va.examples.TtsGrpcClient"
```

Or with JAR:
```bash
java -jar target/tts-grpc-client-1.0.0-jar-with-dependencies.jar
```

### Run with Custom Text

```bash
mvn exec:java -Dexec.mainClass="com.ai.va.examples.TtsGrpcClient" \
  -Dexec.args="Your custom text here"
```

Or with JAR:
```bash
java -jar target/tts-grpc-client-1.0.0-jar-with-dependencies.jar \
  "Your custom text here"
```

## Configuration

Edit constants in `TtsGrpcClient.java`:

```java
TtsGrpcClient client = new TtsGrpcClient("localhost", 50051);
```

Or pass as constructor arguments:

```java
String host = System.getenv().getOrDefault("TTS_SERVER_HOST", "localhost");
int port = Integer.parseInt(System.getenv().getOrDefault("TTS_SERVER_PORT", "50051"));
TtsGrpcClient client = new TtsGrpcClient(host, port);
```

## Code Examples

### Basic Synthesis

```java
TtsGrpcClient client = new TtsGrpcClient("localhost", 50051);

try {
    // Synthesize with default voice (JennyNeural)
    byte[] audio = client.synthesize(
        "Hello, world!",
        "en-US",
        "en-US-JennyNeural",
        "mp3",
        "my-app"
    );
    
    TtsGrpcClient.saveAudio(audio, "output.mp3");
    System.out.println("✅ Success!");
    
} finally {
    client.shutdown();
}
```

### Custom Voice

```java
// Spanish voice
byte[] audio = client.synthesize(
    "Hola, ¿cómo estás?",
    "es-ES",
    "es-ES-ElviraNeural",
    "mp3",
    "my-app"
);
TtsGrpcClient.saveAudio(audio, "output-spanish.mp3");
```

### Streaming Synthesis (Long Text)

```java
List<String> textChunks = List.of(
    "This is the first sentence.",
    "This is the second sentence.",
    "And this is the final sentence."
);

byte[] audio = client.synthesizeStream(
    textChunks,
    "en-US",
    "en-US-AriaNeural",
    "mp3",
    "my-app"
);
TtsGrpcClient.saveAudio(audio, "output-stream.mp3");
```

### Error Handling

```java
try {
    byte[] audio = client.synthesize("Hello, world!", "en-US", "en-US-JennyNeural", "mp3", "my-app");
    TtsGrpcClient.saveAudio(audio, "output.mp3");
    System.out.println("✅ Success!");
} catch (io.grpc.StatusRuntimeException e) {
    System.err.println("❌ gRPC error: " + e.getStatus());
    // Handle error (retry, fallback, etc.)
} catch (Exception e) {
    System.err.println("❌ Error: " + e.getMessage());
}
```

## Popular Voices

### English (US)

```java
"en-US-JennyNeural"  // Friendly, conversational (female)
"en-US-GuyNeural"    // Professional, newscaster (male)
"en-US-AriaNeural"   // Natural, assistant (female)
"en-US-SaraNeural"   // Expressive, storytelling (female)
```

### Spanish

```java
"es-ES-ElviraNeural" // Spain Spanish (female)
"es-MX-DaliaNeural"  // Mexican Spanish (female)
```

### French

```java
"fr-FR-DeniseNeural" // French (female)
"fr-CA-SylvieNeural" // Canadian French (female)
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

## Project Structure

```
java/
├── pom.xml                          # Maven configuration
├── README.md                        # This file
└── src/main/java/com/ai/va/examples/
    └── TtsGrpcClient.java          # Main client implementation
```

## Troubleshooting

### "Package com.ai.va.grpc does not exist"

**Issue**: Proto code not generated

**Solution**: Run Maven build:
```bash
mvn clean compile
```

### "Connection refused"

**Issue**: va-service not running

**Solution**: Start the service:
```bash
cd ../../../services-java/va-service
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=dev
```

### "UNAUTHENTICATED"

**Issue**: Azure Speech key not configured (prod mode)

**Solution**: Use dev profile (mock TTS) or configure Azure key in va-service

### Maven errors

**Issue**: Maven dependencies not downloaded

**Solution**: Clean and rebuild:
```bash
mvn clean install
```

## Maven Commands

### Build Only
```bash
mvn clean compile
```

### Run Tests
```bash
mvn test
```

### Package JAR
```bash
mvn package
```

### Clean Build
```bash
mvn clean install
```

## Dependencies

- **gRPC** 1.60.0 - gRPC Java implementation
- **Protobuf** 3.25.1 - Protocol Buffers runtime
- **Java** 17+ - Required for modern Java features

## See Also

- [Full TTS Documentation](../../../docs/PHASE-4-COMPLETE.md)
- [Node.js Client Example](../nodejs/tts-client.ts)
- [Python Client Example](../python/tts_client.py)
- [Shell/grpcurl Examples](../shell/README.md)
