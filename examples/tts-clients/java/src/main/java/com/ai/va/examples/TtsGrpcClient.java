package com.ai.va.examples;

import com.ai.va.grpc.*;
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.stub.StreamObserver;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/**
 * TTS gRPC Client - Java
 * <p>
 * Client for TTS (Text-to-Speech) gRPC service
 */
public class TtsGrpcClient {
    
    private final ManagedChannel channel;
    private final VoiceServiceGrpc.VoiceServiceBlockingStub blockingStub;
    private final VoiceServiceGrpc.VoiceServiceStub asyncStub;
    
    /**
     * Create TTS client
     */
    public TtsGrpcClient(String host, int port) {
        this.channel = ManagedChannelBuilder.forAddress(host, port)
                .usePlaintext()
                .build();
        this.blockingStub = VoiceServiceGrpc.newBlockingStub(channel);
        this.asyncStub = VoiceServiceGrpc.newStub(channel);
    }
    
    /**
     * Synthesize text to speech (single request)
     */
    public byte[] synthesize(
            String text,
            String language,
            String voiceName,
            String format,
            String customerId
    ) {
        String sessionId = "java-" + System.currentTimeMillis();
        
        SynthesisRequest request = SynthesisRequest.newBuilder()
                .setSessionId(sessionId)
                .setText(text)
                .setLanguage(language)
                .setVoiceName(voiceName)
                .setFormat(format)
                .setCustomerId(customerId)
                .build();
        
        String textPreview = text.length() > 50 ? text.substring(0, 50) + "..." : text;
        System.out.println("[TTS] Synthesizing: \"" + textPreview + "\"");
        System.out.printf("[TTS] Voice: %s, Language: %s, Format: %s%n", voiceName, language, format);
        
        try {
            AudioResponse response = blockingStub.synthesize(request);
            
            byte[] audioData = response.getAudioData().toByteArray();
            AudioMetadata metadata = response.getMetadata();
            
            System.out.println("[TTS] ✅ Synthesis successful:");
            System.out.println("       Session ID: " + response.getSessionId());
            System.out.println("       Audio size: " + audioData.length + " bytes");
            System.out.println("       Duration: " + metadata.getDurationMs() + "ms");
            System.out.println("       Voice: " + metadata.getVoiceName());
            System.out.println("       Provider: " + metadata.getProvider());
            System.out.println("       Processing time: " + metadata.getProcessingTimeMs() + "ms");
            
            return audioData;
            
        } catch (Exception e) {
            System.err.println("[TTS] ❌ Synthesis failed: " + e.getMessage());
            throw new RuntimeException(e);
        }
    }
    
    /**
     * Synthesize text with streaming (for long texts)
     */
    public byte[] synthesizeStream(
            List<String> textChunks,
            String language,
            String voiceName,
            String format,
            String customerId
    ) throws InterruptedException {
        String sessionId = "java-stream-" + System.currentTimeMillis();
        List<byte[]> audioChunks = new ArrayList<>();
        CountDownLatch finishLatch = new CountDownLatch(1);
        
        System.out.println("[TTS Stream] Streaming " + textChunks.size() + " text chunks");
        
        // Response observer
        StreamObserver<AudioResponse> responseObserver = new StreamObserver<>() {
            @Override
            public void onNext(AudioResponse response) {
                byte[] audioData = response.getAudioData().toByteArray();
                audioChunks.add(audioData);
                System.out.println("[TTS Stream] Received audio chunk: " + audioData.length + " bytes");
            }
            
            @Override
            public void onError(Throwable t) {
                System.err.println("[TTS Stream] ❌ Stream failed: " + t.getMessage());
                finishLatch.countDown();
            }
            
            @Override
            public void onCompleted() {
                int totalSize = audioChunks.stream().mapToInt(chunk -> chunk.length).sum();
                System.out.println("[TTS Stream] ✅ Stream complete: " + totalSize + " bytes total");
                finishLatch.countDown();
            }
        };
        
        // Request observer
        StreamObserver<TextChunk> requestObserver = asyncStub.synthesizeStream(responseObserver);
        
        try {
            // Send text chunks
            for (int i = 0; i < textChunks.size(); i++) {
                TextChunk chunk = TextChunk.newBuilder()
                        .setSessionId(sessionId)
                        .setText(textChunks.get(i))
                        .setLanguage(language)
                        .setVoiceName(voiceName)
                        .setFormat(format)
                        .setCustomerId(customerId)
                        .setSequenceNumber(i)
                        .setIsFinalChunk(i == textChunks.size() - 1)
                        .build();
                
                requestObserver.onNext(chunk);
                System.out.printf("[TTS Stream] Sent chunk %d/%d%n", i + 1, textChunks.size());
                
                // Check if request observer has errors
                if (finishLatch.getCount() == 0) {
                    throw new RuntimeException("Stream terminated early");
                }
            }
            
            // Signal completion
            requestObserver.onCompleted();
            
            // Wait for response completion
            if (!finishLatch.await(30, TimeUnit.SECONDS)) {
                throw new RuntimeException("Stream timeout");
            }
            
            // Combine audio chunks
            int totalSize = audioChunks.stream().mapToInt(chunk -> chunk.length).sum();
            byte[] fullAudio = new byte[totalSize];
            int offset = 0;
            for (byte[] chunk : audioChunks) {
                System.arraycopy(chunk, 0, fullAudio, offset, chunk.length);
                offset += chunk.length;
            }
            
            return fullAudio;
            
        } catch (Exception e) {
            requestObserver.onError(e);
            throw e;
        }
    }
    
    /**
     * Shutdown client
     */
    public void shutdown() throws InterruptedException {
        channel.shutdown().awaitTermination(5, TimeUnit.SECONDS);
    }
    
    /**
     * Save audio to file
     */
    public static void saveAudio(byte[] audioData, String filename) throws IOException {
        Path path = Paths.get(filename);
        Files.write(path, audioData);
        System.out.println("[File] 💾 Saved audio to: " + filename);
    }
    
    /**
     * Main method - Examples
     */
    public static void main(String[] args) {
        TtsGrpcClient client = new TtsGrpcClient("localhost", 50051);
        
        try {
            // Get text from command line or use default
            String text = args.length > 0 ? 
                    String.join(" ", args) : 
                    "Hello, this is a test of text-to-speech synthesis";
            
            System.out.println("=== TTS gRPC Client - Java ===\n");
            
            // Example 1: Single synthesis (default voice)
            System.out.println("--- Example 1: Single Synthesis (JennyNeural) ---");
            byte[] audio1 = client.synthesize(
                    text,
                    "en-US",
                    "en-US-JennyNeural",
                    "mp3",
                    "java-client"
            );
            saveAudio(audio1, "output-jenny.mp3");
            System.out.println();
            
            // Example 2: Different voice
            System.out.println("--- Example 2: Male Voice (GuyNeural) ---");
            byte[] audio2 = client.synthesize(
                    "This is GuyNeural speaking",
                    "en-US",
                    "en-US-GuyNeural",
                    "mp3",
                    "java-client"
            );
            saveAudio(audio2, "output-guy.mp3");
            System.out.println();
            
            // Example 3: Spanish voice
            System.out.println("--- Example 3: Spanish Voice (ElviraNeural) ---");
            byte[] audio3 = client.synthesize(
                    "Hola, esta es una prueba de síntesis de voz",
                    "es-ES",
                    "es-ES-ElviraNeural",
                    "mp3",
                    "java-client"
            );
            saveAudio(audio3, "output-spanish.mp3");
            System.out.println();
            
            // Example 4: Streaming synthesis (for long text)
            System.out.println("--- Example 4: Streaming Synthesis ---");
            List<String> longText = List.of(
                    "This is the first part of a long text.",
                    "This is the second part, demonstrating streaming.",
                    "And this is the final part of our streaming example."
            );
            byte[] audio4 = client.synthesizeStream(
                    longText,
                    "en-US",
                    "en-US-AriaNeural",
                    "mp3",
                    "java-client"
            );
            saveAudio(audio4, "output-stream.mp3");
            System.out.println();
            
            System.out.println("✅ All examples completed successfully!");
            System.out.println("Audio files saved in current directory.");
            
        } catch (Exception e) {
            System.err.println("❌ Error: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        } finally {
            try {
                client.shutdown();
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
    }
}
