import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { env } from '../config/env';

// Proto file paths
const PROTO_PATH = path.join(__dirname, '../../proto');
const CHAT_PROTO = path.join(PROTO_PATH, 'chat.proto');
const VOICE_PROTO = path.join(PROTO_PATH, 'voice.proto');

// gRPC server address
const GRPC_SERVER = env.GRPC_VA_SERVICE_URL;

// Proto loader options
const packageDefinition = protoLoader.loadSync(
  [CHAT_PROTO, VOICE_PROTO],
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  }
);

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;

// Type definitions for gRPC clients
interface ChatServiceClient extends grpc.Client {
  StartSession(
    request: any,
    callback: (error: grpc.ServiceError | null, response: any) => void
  ): grpc.ClientUnaryCall;
  
  SendMessageStream(request: any): grpc.ClientReadableStream<any>;
  
  SendMessage(
    request: any,
    callback: (error: grpc.ServiceError | null, response: any) => void
  ): grpc.ClientUnaryCall;
  
  EndSession(
    request: any,
    callback: (error: grpc.ServiceError | null, response: any) => void
  ): grpc.ClientUnaryCall;
  
  GetHistory(
    request: any,
    callback: (error: grpc.ServiceError | null, response: any) => void
  ): grpc.ClientUnaryCall;
}

interface VoiceServiceClient extends grpc.Client {
  StreamVoiceConversation(): grpc.ClientDuplexStream<any, any>;
  
  ProcessVoice(
    request: any,
    callback: (error: grpc.ServiceError | null, response: any) => void
  ): grpc.ClientUnaryCall;
  
  Transcribe(
    request: any,
    callback: (error: grpc.ServiceError | null, response: any) => void
  ): grpc.ClientUnaryCall;
  
  TranscribeStream(request: any): grpc.ClientReadableStream<any>;
  
  Synthesize(
    request: any,
    callback: (error: grpc.ServiceError | null, response: any) => void
  ): grpc.ClientUnaryCall;
  
  SynthesizeStream(request: any): grpc.ClientReadableStream<any>;
}

/**
 * gRPC Client Manager
 * Provides access to Java VA Service via gRPC
 */
class GrpcClient {
  private chatClient: ChatServiceClient;
  private voiceClient: VoiceServiceClient;
  private connected: boolean = false;

  constructor() {
    // Create chat service client
    this.chatClient = new protoDescriptor.com.ai.va.grpc.ChatService(
      GRPC_SERVER,
      grpc.credentials.createInsecure()
    ) as ChatServiceClient;

    // Create voice service client
    this.voiceClient = new protoDescriptor.com.ai.va.grpc.VoiceService(
      GRPC_SERVER,
      grpc.credentials.createInsecure()
    ) as VoiceServiceClient;

    console.log(`✅ gRPC clients initialized - server: ${GRPC_SERVER}`);
    this.connected = true;
  }

  /**
   * Start a new chat session
   */
  async startChatSession(customerId: string, productId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.chatClient.StartSession(
        { customer_id: customerId, product_id: productId },
        (error: grpc.ServiceError | null, response: any) => {
          if (error) {
            console.error('gRPC StartSession error:', error);
            reject(error);
          } else {
            console.log(`gRPC session started: ${response.session_id}`);
            resolve(response);
          }
        }
      );
    });
  }

  /**
   * Send a message and get streaming response (token-by-token)
   */
  sendMessageStream(sessionId: string, message: string): grpc.ClientReadableStream<any> {
    const request = {
      session_id: sessionId,
      message: message
    };
    
    console.log(`gRPC SendMessageStream: session=${sessionId}, message length=${message.length}`);
    return this.chatClient.SendMessageStream(request);
  }

  /**
   * Send a message and get single response (non-streaming)
   */
  async sendMessage(sessionId: string, message: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.chatClient.SendMessage(
        { session_id: sessionId, message },
        (error: grpc.ServiceError | null, response: any) => {
          if (error) {
            console.error('gRPC SendMessage error:', error);
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  /**
   * End a chat session
   */
  async endChatSession(sessionId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.chatClient.EndSession(
        { session_id: sessionId },
        (error: grpc.ServiceError | null, response: any) => {
          if (error) {
            console.error('gRPC EndSession error:', error);
            reject(error);
          } else {
            console.log(`gRPC session ended: ${sessionId}`);
            resolve(response);
          }
        }
      );
    });
  }

  /**
   * Get chat history for a session
   */
  async getChatHistory(sessionId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.chatClient.GetHistory(
        { session_id: sessionId },
        (error: grpc.ServiceError | null, response: any) => {
          if (error) {
            console.error('gRPC GetHistory error:', error);
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  /**
   * Process voice audio (non-streaming)
   */
  async processVoice(sessionId: string, audioData: Buffer): Promise<any> {
    return new Promise((resolve, reject) => {
      this.voiceClient.ProcessVoice(
        { session_id: sessionId, audio_data: audioData },
        (error: grpc.ServiceError | null, response: any) => {
          if (error) {
            console.error('gRPC ProcessVoice error:', error);
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  /**
   * Stream voice conversation (bidirectional)
   * Returns a duplex stream for sending audio and receiving responses
   */
  streamVoiceConversation(): grpc.ClientDuplexStream<any, any> {
    console.log('gRPC starting voice stream');
    return this.voiceClient.StreamVoiceConversation();
  }

  /**
   * Transcribe audio (single request)
   * Converts audio to text using STT service
   */
  async transcribe(sessionId: string, audioData: Buffer, format: string = 'webm', customerId: string = 'default'): Promise<any> {
    return new Promise((resolve, reject) => {
      this.voiceClient.Transcribe(
        {
          session_id: sessionId,
          audio_data: audioData,
          format: format,
          timestamp: Date.now(),
          customer_id: customerId,
          is_final_chunk: true
        },
        (error: grpc.ServiceError | null, response: any) => {
          if (error) {
            console.error('gRPC Transcribe error:', error);
            reject(error);
          } else {
            console.log(`gRPC transcription received: ${response.text?.substring(0, 50)}...`);
            resolve(response);
          }
        }
      );
    });
  }

  /**
   * Synthesize text to speech (single request)
   * Converts text to audio using TTS service
   */
  async synthesize(
    sessionId: string,
    text: string,
    language: string = 'en-US',
    voiceName: string = 'en-US-JennyNeural',
    format: string = 'mp3',
    customerId: string = 'default'
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      this.voiceClient.Synthesize(
        {
          session_id: sessionId,
          text: text,
          language: language,
          voice_name: voiceName,
          format: format,
          customer_id: customerId
        },
        (error: grpc.ServiceError | null, response: any) => {
          if (error) {
            console.error('gRPC Synthesize error:', error);
            reject(error);
          } else {
            console.log(`gRPC TTS synthesis completed: ${response.audio_data?.length || 0} bytes`);
            resolve(response);
          }
        }
      );
    });
  }

  /**
   * Synthesize text to speech (streaming)
   * Converts text chunks to audio stream using TTS service
   */
  synthesizeStream(
    sessionId: string,
    text: string,
    language: string = 'en-US',
    voiceName: string = 'en-US-JennyNeural',
    format: string = 'mp3',
    customerId: string = 'default'
  ): grpc.ClientReadableStream<any> {
    const request = {
      session_id: sessionId,
      text: text,
      language: language,
      voice_name: voiceName,
      format: format,
      customer_id: customerId,
      sequence_number: 0,
      is_final_chunk: true
    };
    
    console.log(`gRPC SynthesizeStream: session=${sessionId}, text length=${text.length}`);
    return this.voiceClient.SynthesizeStream(request);
  }

  /**
   * Check if gRPC client is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Close all gRPC connections
   */
  close(): void {
    this.chatClient.close();
    this.voiceClient.close();
    this.connected = false;
    console.log('gRPC clients closed');
  }
}

// Export singleton instance
export const grpcClient = new GrpcClient();
