package com.ai.va.grpc;

import static io.grpc.MethodDescriptor.generateFullMethodName;

/**
 * <pre>
 * Voice service with bidirectional streaming for real-time audio
 * </pre>
 */
@javax.annotation.Generated(
    value = "by gRPC proto compiler (version 1.60.0)",
    comments = "Source: voice.proto")
@io.grpc.stub.annotations.GrpcGenerated
public final class VoiceServiceGrpc {

  private VoiceServiceGrpc() {}

  public static final java.lang.String SERVICE_NAME = "com.ai.va.grpc.VoiceService";

  // Static method descriptors that strictly reflect the proto.
  private static volatile io.grpc.MethodDescriptor<com.ai.va.grpc.VoiceRequest,
      com.ai.va.grpc.VoiceResponse> getStreamVoiceConversationMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "StreamVoiceConversation",
      requestType = com.ai.va.grpc.VoiceRequest.class,
      responseType = com.ai.va.grpc.VoiceResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.BIDI_STREAMING)
  public static io.grpc.MethodDescriptor<com.ai.va.grpc.VoiceRequest,
      com.ai.va.grpc.VoiceResponse> getStreamVoiceConversationMethod() {
    io.grpc.MethodDescriptor<com.ai.va.grpc.VoiceRequest, com.ai.va.grpc.VoiceResponse> getStreamVoiceConversationMethod;
    if ((getStreamVoiceConversationMethod = VoiceServiceGrpc.getStreamVoiceConversationMethod) == null) {
      synchronized (VoiceServiceGrpc.class) {
        if ((getStreamVoiceConversationMethod = VoiceServiceGrpc.getStreamVoiceConversationMethod) == null) {
          VoiceServiceGrpc.getStreamVoiceConversationMethod = getStreamVoiceConversationMethod =
              io.grpc.MethodDescriptor.<com.ai.va.grpc.VoiceRequest, com.ai.va.grpc.VoiceResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.BIDI_STREAMING)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "StreamVoiceConversation"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.ai.va.grpc.VoiceRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.ai.va.grpc.VoiceResponse.getDefaultInstance()))
              .setSchemaDescriptor(new VoiceServiceMethodDescriptorSupplier("StreamVoiceConversation"))
              .build();
        }
      }
    }
    return getStreamVoiceConversationMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.ai.va.grpc.VoiceRequest,
      com.ai.va.grpc.VoiceResponse> getProcessVoiceMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "ProcessVoice",
      requestType = com.ai.va.grpc.VoiceRequest.class,
      responseType = com.ai.va.grpc.VoiceResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.ai.va.grpc.VoiceRequest,
      com.ai.va.grpc.VoiceResponse> getProcessVoiceMethod() {
    io.grpc.MethodDescriptor<com.ai.va.grpc.VoiceRequest, com.ai.va.grpc.VoiceResponse> getProcessVoiceMethod;
    if ((getProcessVoiceMethod = VoiceServiceGrpc.getProcessVoiceMethod) == null) {
      synchronized (VoiceServiceGrpc.class) {
        if ((getProcessVoiceMethod = VoiceServiceGrpc.getProcessVoiceMethod) == null) {
          VoiceServiceGrpc.getProcessVoiceMethod = getProcessVoiceMethod =
              io.grpc.MethodDescriptor.<com.ai.va.grpc.VoiceRequest, com.ai.va.grpc.VoiceResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "ProcessVoice"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.ai.va.grpc.VoiceRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.ai.va.grpc.VoiceResponse.getDefaultInstance()))
              .setSchemaDescriptor(new VoiceServiceMethodDescriptorSupplier("ProcessVoice"))
              .build();
        }
      }
    }
    return getProcessVoiceMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.ai.va.grpc.AudioChunk,
      com.ai.va.grpc.TranscriptionResponse> getTranscribeStreamMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "TranscribeStream",
      requestType = com.ai.va.grpc.AudioChunk.class,
      responseType = com.ai.va.grpc.TranscriptionResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.BIDI_STREAMING)
  public static io.grpc.MethodDescriptor<com.ai.va.grpc.AudioChunk,
      com.ai.va.grpc.TranscriptionResponse> getTranscribeStreamMethod() {
    io.grpc.MethodDescriptor<com.ai.va.grpc.AudioChunk, com.ai.va.grpc.TranscriptionResponse> getTranscribeStreamMethod;
    if ((getTranscribeStreamMethod = VoiceServiceGrpc.getTranscribeStreamMethod) == null) {
      synchronized (VoiceServiceGrpc.class) {
        if ((getTranscribeStreamMethod = VoiceServiceGrpc.getTranscribeStreamMethod) == null) {
          VoiceServiceGrpc.getTranscribeStreamMethod = getTranscribeStreamMethod =
              io.grpc.MethodDescriptor.<com.ai.va.grpc.AudioChunk, com.ai.va.grpc.TranscriptionResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.BIDI_STREAMING)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "TranscribeStream"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.ai.va.grpc.AudioChunk.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.ai.va.grpc.TranscriptionResponse.getDefaultInstance()))
              .setSchemaDescriptor(new VoiceServiceMethodDescriptorSupplier("TranscribeStream"))
              .build();
        }
      }
    }
    return getTranscribeStreamMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.ai.va.grpc.AudioChunk,
      com.ai.va.grpc.TranscriptionResponse> getTranscribeMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "Transcribe",
      requestType = com.ai.va.grpc.AudioChunk.class,
      responseType = com.ai.va.grpc.TranscriptionResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.ai.va.grpc.AudioChunk,
      com.ai.va.grpc.TranscriptionResponse> getTranscribeMethod() {
    io.grpc.MethodDescriptor<com.ai.va.grpc.AudioChunk, com.ai.va.grpc.TranscriptionResponse> getTranscribeMethod;
    if ((getTranscribeMethod = VoiceServiceGrpc.getTranscribeMethod) == null) {
      synchronized (VoiceServiceGrpc.class) {
        if ((getTranscribeMethod = VoiceServiceGrpc.getTranscribeMethod) == null) {
          VoiceServiceGrpc.getTranscribeMethod = getTranscribeMethod =
              io.grpc.MethodDescriptor.<com.ai.va.grpc.AudioChunk, com.ai.va.grpc.TranscriptionResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "Transcribe"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.ai.va.grpc.AudioChunk.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.ai.va.grpc.TranscriptionResponse.getDefaultInstance()))
              .setSchemaDescriptor(new VoiceServiceMethodDescriptorSupplier("Transcribe"))
              .build();
        }
      }
    }
    return getTranscribeMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.ai.va.grpc.SynthesisRequest,
      com.ai.va.grpc.AudioResponse> getSynthesizeMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "Synthesize",
      requestType = com.ai.va.grpc.SynthesisRequest.class,
      responseType = com.ai.va.grpc.AudioResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.ai.va.grpc.SynthesisRequest,
      com.ai.va.grpc.AudioResponse> getSynthesizeMethod() {
    io.grpc.MethodDescriptor<com.ai.va.grpc.SynthesisRequest, com.ai.va.grpc.AudioResponse> getSynthesizeMethod;
    if ((getSynthesizeMethod = VoiceServiceGrpc.getSynthesizeMethod) == null) {
      synchronized (VoiceServiceGrpc.class) {
        if ((getSynthesizeMethod = VoiceServiceGrpc.getSynthesizeMethod) == null) {
          VoiceServiceGrpc.getSynthesizeMethod = getSynthesizeMethod =
              io.grpc.MethodDescriptor.<com.ai.va.grpc.SynthesisRequest, com.ai.va.grpc.AudioResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "Synthesize"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.ai.va.grpc.SynthesisRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.ai.va.grpc.AudioResponse.getDefaultInstance()))
              .setSchemaDescriptor(new VoiceServiceMethodDescriptorSupplier("Synthesize"))
              .build();
        }
      }
    }
    return getSynthesizeMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.ai.va.grpc.TextChunk,
      com.ai.va.grpc.AudioResponse> getSynthesizeStreamMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "SynthesizeStream",
      requestType = com.ai.va.grpc.TextChunk.class,
      responseType = com.ai.va.grpc.AudioResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.BIDI_STREAMING)
  public static io.grpc.MethodDescriptor<com.ai.va.grpc.TextChunk,
      com.ai.va.grpc.AudioResponse> getSynthesizeStreamMethod() {
    io.grpc.MethodDescriptor<com.ai.va.grpc.TextChunk, com.ai.va.grpc.AudioResponse> getSynthesizeStreamMethod;
    if ((getSynthesizeStreamMethod = VoiceServiceGrpc.getSynthesizeStreamMethod) == null) {
      synchronized (VoiceServiceGrpc.class) {
        if ((getSynthesizeStreamMethod = VoiceServiceGrpc.getSynthesizeStreamMethod) == null) {
          VoiceServiceGrpc.getSynthesizeStreamMethod = getSynthesizeStreamMethod =
              io.grpc.MethodDescriptor.<com.ai.va.grpc.TextChunk, com.ai.va.grpc.AudioResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.BIDI_STREAMING)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "SynthesizeStream"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.ai.va.grpc.TextChunk.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.ai.va.grpc.AudioResponse.getDefaultInstance()))
              .setSchemaDescriptor(new VoiceServiceMethodDescriptorSupplier("SynthesizeStream"))
              .build();
        }
      }
    }
    return getSynthesizeStreamMethod;
  }

  /**
   * Creates a new async stub that supports all call types for the service
   */
  public static VoiceServiceStub newStub(io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<VoiceServiceStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<VoiceServiceStub>() {
        @java.lang.Override
        public VoiceServiceStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new VoiceServiceStub(channel, callOptions);
        }
      };
    return VoiceServiceStub.newStub(factory, channel);
  }

  /**
   * Creates a new blocking-style stub that supports unary and streaming output calls on the service
   */
  public static VoiceServiceBlockingStub newBlockingStub(
      io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<VoiceServiceBlockingStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<VoiceServiceBlockingStub>() {
        @java.lang.Override
        public VoiceServiceBlockingStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new VoiceServiceBlockingStub(channel, callOptions);
        }
      };
    return VoiceServiceBlockingStub.newStub(factory, channel);
  }

  /**
   * Creates a new ListenableFuture-style stub that supports unary calls on the service
   */
  public static VoiceServiceFutureStub newFutureStub(
      io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<VoiceServiceFutureStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<VoiceServiceFutureStub>() {
        @java.lang.Override
        public VoiceServiceFutureStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new VoiceServiceFutureStub(channel, callOptions);
        }
      };
    return VoiceServiceFutureStub.newStub(factory, channel);
  }

  /**
   * <pre>
   * Voice service with bidirectional streaming for real-time audio
   * </pre>
   */
  public interface AsyncService {

    /**
     * <pre>
     * Bidirectional streaming for voice conversation
     * Client sends audio chunks, server sends transcriptions and responses
     * </pre>
     */
    default io.grpc.stub.StreamObserver<com.ai.va.grpc.VoiceRequest> streamVoiceConversation(
        io.grpc.stub.StreamObserver<com.ai.va.grpc.VoiceResponse> responseObserver) {
      return io.grpc.stub.ServerCalls.asyncUnimplementedStreamingCall(getStreamVoiceConversationMethod(), responseObserver);
    }

    /**
     * <pre>
     * Single request/response for voice (non-streaming fallback)
     * </pre>
     */
    default void processVoice(com.ai.va.grpc.VoiceRequest request,
        io.grpc.stub.StreamObserver<com.ai.va.grpc.VoiceResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getProcessVoiceMethod(), responseObserver);
    }

    /**
     * <pre>
     * STT-specific: Transcribe audio chunks (streaming)
     * Client sends audio chunks, server returns transcriptions as they become available
     * </pre>
     */
    default io.grpc.stub.StreamObserver<com.ai.va.grpc.AudioChunk> transcribeStream(
        io.grpc.stub.StreamObserver<com.ai.va.grpc.TranscriptionResponse> responseObserver) {
      return io.grpc.stub.ServerCalls.asyncUnimplementedStreamingCall(getTranscribeStreamMethod(), responseObserver);
    }

    /**
     * <pre>
     * STT-specific: Transcribe single audio file (non-streaming)
     * </pre>
     */
    default void transcribe(com.ai.va.grpc.AudioChunk request,
        io.grpc.stub.StreamObserver<com.ai.va.grpc.TranscriptionResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getTranscribeMethod(), responseObserver);
    }

    /**
     * <pre>
     * TTS-specific: Synthesize text to speech (single request)
     * </pre>
     */
    default void synthesize(com.ai.va.grpc.SynthesisRequest request,
        io.grpc.stub.StreamObserver<com.ai.va.grpc.AudioResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getSynthesizeMethod(), responseObserver);
    }

    /**
     * <pre>
     * TTS-specific: Synthesize text to speech (streaming)
     * Client sends text chunks, server returns audio chunks as they become available
     * </pre>
     */
    default io.grpc.stub.StreamObserver<com.ai.va.grpc.TextChunk> synthesizeStream(
        io.grpc.stub.StreamObserver<com.ai.va.grpc.AudioResponse> responseObserver) {
      return io.grpc.stub.ServerCalls.asyncUnimplementedStreamingCall(getSynthesizeStreamMethod(), responseObserver);
    }
  }

  /**
   * Base class for the server implementation of the service VoiceService.
   * <pre>
   * Voice service with bidirectional streaming for real-time audio
   * </pre>
   */
  public static abstract class VoiceServiceImplBase
      implements io.grpc.BindableService, AsyncService {

    @java.lang.Override public final io.grpc.ServerServiceDefinition bindService() {
      return VoiceServiceGrpc.bindService(this);
    }
  }

  /**
   * A stub to allow clients to do asynchronous rpc calls to service VoiceService.
   * <pre>
   * Voice service with bidirectional streaming for real-time audio
   * </pre>
   */
  public static final class VoiceServiceStub
      extends io.grpc.stub.AbstractAsyncStub<VoiceServiceStub> {
    private VoiceServiceStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected VoiceServiceStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new VoiceServiceStub(channel, callOptions);
    }

    /**
     * <pre>
     * Bidirectional streaming for voice conversation
     * Client sends audio chunks, server sends transcriptions and responses
     * </pre>
     */
    public io.grpc.stub.StreamObserver<com.ai.va.grpc.VoiceRequest> streamVoiceConversation(
        io.grpc.stub.StreamObserver<com.ai.va.grpc.VoiceResponse> responseObserver) {
      return io.grpc.stub.ClientCalls.asyncBidiStreamingCall(
          getChannel().newCall(getStreamVoiceConversationMethod(), getCallOptions()), responseObserver);
    }

    /**
     * <pre>
     * Single request/response for voice (non-streaming fallback)
     * </pre>
     */
    public void processVoice(com.ai.va.grpc.VoiceRequest request,
        io.grpc.stub.StreamObserver<com.ai.va.grpc.VoiceResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getProcessVoiceMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     * <pre>
     * STT-specific: Transcribe audio chunks (streaming)
     * Client sends audio chunks, server returns transcriptions as they become available
     * </pre>
     */
    public io.grpc.stub.StreamObserver<com.ai.va.grpc.AudioChunk> transcribeStream(
        io.grpc.stub.StreamObserver<com.ai.va.grpc.TranscriptionResponse> responseObserver) {
      return io.grpc.stub.ClientCalls.asyncBidiStreamingCall(
          getChannel().newCall(getTranscribeStreamMethod(), getCallOptions()), responseObserver);
    }

    /**
     * <pre>
     * STT-specific: Transcribe single audio file (non-streaming)
     * </pre>
     */
    public void transcribe(com.ai.va.grpc.AudioChunk request,
        io.grpc.stub.StreamObserver<com.ai.va.grpc.TranscriptionResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getTranscribeMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     * <pre>
     * TTS-specific: Synthesize text to speech (single request)
     * </pre>
     */
    public void synthesize(com.ai.va.grpc.SynthesisRequest request,
        io.grpc.stub.StreamObserver<com.ai.va.grpc.AudioResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getSynthesizeMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     * <pre>
     * TTS-specific: Synthesize text to speech (streaming)
     * Client sends text chunks, server returns audio chunks as they become available
     * </pre>
     */
    public io.grpc.stub.StreamObserver<com.ai.va.grpc.TextChunk> synthesizeStream(
        io.grpc.stub.StreamObserver<com.ai.va.grpc.AudioResponse> responseObserver) {
      return io.grpc.stub.ClientCalls.asyncBidiStreamingCall(
          getChannel().newCall(getSynthesizeStreamMethod(), getCallOptions()), responseObserver);
    }
  }

  /**
   * A stub to allow clients to do synchronous rpc calls to service VoiceService.
   * <pre>
   * Voice service with bidirectional streaming for real-time audio
   * </pre>
   */
  public static final class VoiceServiceBlockingStub
      extends io.grpc.stub.AbstractBlockingStub<VoiceServiceBlockingStub> {
    private VoiceServiceBlockingStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected VoiceServiceBlockingStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new VoiceServiceBlockingStub(channel, callOptions);
    }

    /**
     * <pre>
     * Single request/response for voice (non-streaming fallback)
     * </pre>
     */
    public com.ai.va.grpc.VoiceResponse processVoice(com.ai.va.grpc.VoiceRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getProcessVoiceMethod(), getCallOptions(), request);
    }

    /**
     * <pre>
     * STT-specific: Transcribe single audio file (non-streaming)
     * </pre>
     */
    public com.ai.va.grpc.TranscriptionResponse transcribe(com.ai.va.grpc.AudioChunk request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getTranscribeMethod(), getCallOptions(), request);
    }

    /**
     * <pre>
     * TTS-specific: Synthesize text to speech (single request)
     * </pre>
     */
    public com.ai.va.grpc.AudioResponse synthesize(com.ai.va.grpc.SynthesisRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getSynthesizeMethod(), getCallOptions(), request);
    }
  }

  /**
   * A stub to allow clients to do ListenableFuture-style rpc calls to service VoiceService.
   * <pre>
   * Voice service with bidirectional streaming for real-time audio
   * </pre>
   */
  public static final class VoiceServiceFutureStub
      extends io.grpc.stub.AbstractFutureStub<VoiceServiceFutureStub> {
    private VoiceServiceFutureStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected VoiceServiceFutureStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new VoiceServiceFutureStub(channel, callOptions);
    }

    /**
     * <pre>
     * Single request/response for voice (non-streaming fallback)
     * </pre>
     */
    public com.google.common.util.concurrent.ListenableFuture<com.ai.va.grpc.VoiceResponse> processVoice(
        com.ai.va.grpc.VoiceRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getProcessVoiceMethod(), getCallOptions()), request);
    }

    /**
     * <pre>
     * STT-specific: Transcribe single audio file (non-streaming)
     * </pre>
     */
    public com.google.common.util.concurrent.ListenableFuture<com.ai.va.grpc.TranscriptionResponse> transcribe(
        com.ai.va.grpc.AudioChunk request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getTranscribeMethod(), getCallOptions()), request);
    }

    /**
     * <pre>
     * TTS-specific: Synthesize text to speech (single request)
     * </pre>
     */
    public com.google.common.util.concurrent.ListenableFuture<com.ai.va.grpc.AudioResponse> synthesize(
        com.ai.va.grpc.SynthesisRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getSynthesizeMethod(), getCallOptions()), request);
    }
  }

  private static final int METHODID_PROCESS_VOICE = 0;
  private static final int METHODID_TRANSCRIBE = 1;
  private static final int METHODID_SYNTHESIZE = 2;
  private static final int METHODID_STREAM_VOICE_CONVERSATION = 3;
  private static final int METHODID_TRANSCRIBE_STREAM = 4;
  private static final int METHODID_SYNTHESIZE_STREAM = 5;

  private static final class MethodHandlers<Req, Resp> implements
      io.grpc.stub.ServerCalls.UnaryMethod<Req, Resp>,
      io.grpc.stub.ServerCalls.ServerStreamingMethod<Req, Resp>,
      io.grpc.stub.ServerCalls.ClientStreamingMethod<Req, Resp>,
      io.grpc.stub.ServerCalls.BidiStreamingMethod<Req, Resp> {
    private final AsyncService serviceImpl;
    private final int methodId;

    MethodHandlers(AsyncService serviceImpl, int methodId) {
      this.serviceImpl = serviceImpl;
      this.methodId = methodId;
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("unchecked")
    public void invoke(Req request, io.grpc.stub.StreamObserver<Resp> responseObserver) {
      switch (methodId) {
        case METHODID_PROCESS_VOICE:
          serviceImpl.processVoice((com.ai.va.grpc.VoiceRequest) request,
              (io.grpc.stub.StreamObserver<com.ai.va.grpc.VoiceResponse>) responseObserver);
          break;
        case METHODID_TRANSCRIBE:
          serviceImpl.transcribe((com.ai.va.grpc.AudioChunk) request,
              (io.grpc.stub.StreamObserver<com.ai.va.grpc.TranscriptionResponse>) responseObserver);
          break;
        case METHODID_SYNTHESIZE:
          serviceImpl.synthesize((com.ai.va.grpc.SynthesisRequest) request,
              (io.grpc.stub.StreamObserver<com.ai.va.grpc.AudioResponse>) responseObserver);
          break;
        default:
          throw new AssertionError();
      }
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("unchecked")
    public io.grpc.stub.StreamObserver<Req> invoke(
        io.grpc.stub.StreamObserver<Resp> responseObserver) {
      switch (methodId) {
        case METHODID_STREAM_VOICE_CONVERSATION:
          return (io.grpc.stub.StreamObserver<Req>) serviceImpl.streamVoiceConversation(
              (io.grpc.stub.StreamObserver<com.ai.va.grpc.VoiceResponse>) responseObserver);
        case METHODID_TRANSCRIBE_STREAM:
          return (io.grpc.stub.StreamObserver<Req>) serviceImpl.transcribeStream(
              (io.grpc.stub.StreamObserver<com.ai.va.grpc.TranscriptionResponse>) responseObserver);
        case METHODID_SYNTHESIZE_STREAM:
          return (io.grpc.stub.StreamObserver<Req>) serviceImpl.synthesizeStream(
              (io.grpc.stub.StreamObserver<com.ai.va.grpc.AudioResponse>) responseObserver);
        default:
          throw new AssertionError();
      }
    }
  }

  public static final io.grpc.ServerServiceDefinition bindService(AsyncService service) {
    return io.grpc.ServerServiceDefinition.builder(getServiceDescriptor())
        .addMethod(
          getStreamVoiceConversationMethod(),
          io.grpc.stub.ServerCalls.asyncBidiStreamingCall(
            new MethodHandlers<
              com.ai.va.grpc.VoiceRequest,
              com.ai.va.grpc.VoiceResponse>(
                service, METHODID_STREAM_VOICE_CONVERSATION)))
        .addMethod(
          getProcessVoiceMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.ai.va.grpc.VoiceRequest,
              com.ai.va.grpc.VoiceResponse>(
                service, METHODID_PROCESS_VOICE)))
        .addMethod(
          getTranscribeStreamMethod(),
          io.grpc.stub.ServerCalls.asyncBidiStreamingCall(
            new MethodHandlers<
              com.ai.va.grpc.AudioChunk,
              com.ai.va.grpc.TranscriptionResponse>(
                service, METHODID_TRANSCRIBE_STREAM)))
        .addMethod(
          getTranscribeMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.ai.va.grpc.AudioChunk,
              com.ai.va.grpc.TranscriptionResponse>(
                service, METHODID_TRANSCRIBE)))
        .addMethod(
          getSynthesizeMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.ai.va.grpc.SynthesisRequest,
              com.ai.va.grpc.AudioResponse>(
                service, METHODID_SYNTHESIZE)))
        .addMethod(
          getSynthesizeStreamMethod(),
          io.grpc.stub.ServerCalls.asyncBidiStreamingCall(
            new MethodHandlers<
              com.ai.va.grpc.TextChunk,
              com.ai.va.grpc.AudioResponse>(
                service, METHODID_SYNTHESIZE_STREAM)))
        .build();
  }

  private static abstract class VoiceServiceBaseDescriptorSupplier
      implements io.grpc.protobuf.ProtoFileDescriptorSupplier, io.grpc.protobuf.ProtoServiceDescriptorSupplier {
    VoiceServiceBaseDescriptorSupplier() {}

    @java.lang.Override
    public com.google.protobuf.Descriptors.FileDescriptor getFileDescriptor() {
      return com.ai.va.grpc.VoiceProto.getDescriptor();
    }

    @java.lang.Override
    public com.google.protobuf.Descriptors.ServiceDescriptor getServiceDescriptor() {
      return getFileDescriptor().findServiceByName("VoiceService");
    }
  }

  private static final class VoiceServiceFileDescriptorSupplier
      extends VoiceServiceBaseDescriptorSupplier {
    VoiceServiceFileDescriptorSupplier() {}
  }

  private static final class VoiceServiceMethodDescriptorSupplier
      extends VoiceServiceBaseDescriptorSupplier
      implements io.grpc.protobuf.ProtoMethodDescriptorSupplier {
    private final java.lang.String methodName;

    VoiceServiceMethodDescriptorSupplier(java.lang.String methodName) {
      this.methodName = methodName;
    }

    @java.lang.Override
    public com.google.protobuf.Descriptors.MethodDescriptor getMethodDescriptor() {
      return getServiceDescriptor().findMethodByName(methodName);
    }
  }

  private static volatile io.grpc.ServiceDescriptor serviceDescriptor;

  public static io.grpc.ServiceDescriptor getServiceDescriptor() {
    io.grpc.ServiceDescriptor result = serviceDescriptor;
    if (result == null) {
      synchronized (VoiceServiceGrpc.class) {
        result = serviceDescriptor;
        if (result == null) {
          serviceDescriptor = result = io.grpc.ServiceDescriptor.newBuilder(SERVICE_NAME)
              .setSchemaDescriptor(new VoiceServiceFileDescriptorSupplier())
              .addMethod(getStreamVoiceConversationMethod())
              .addMethod(getProcessVoiceMethod())
              .addMethod(getTranscribeStreamMethod())
              .addMethod(getTranscribeMethod())
              .addMethod(getSynthesizeMethod())
              .addMethod(getSynthesizeStreamMethod())
              .build();
        }
      }
    }
    return result;
  }
}
