package com.ai.va.grpc;

import static io.grpc.MethodDescriptor.generateFullMethodName;

/**
 * <pre>
 * Chat service with streaming support for real-time LLM responses
 * </pre>
 */
@javax.annotation.Generated(
    value = "by gRPC proto compiler (version 1.60.0)",
    comments = "Source: chat.proto")
@io.grpc.stub.annotations.GrpcGenerated
public final class ChatServiceGrpc {

  private ChatServiceGrpc() {}

  public static final java.lang.String SERVICE_NAME = "com.ai.va.grpc.ChatService";

  // Static method descriptors that strictly reflect the proto.
  private static volatile io.grpc.MethodDescriptor<com.ai.va.grpc.SessionRequest,
      com.ai.va.grpc.SessionResponse> getStartSessionMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "StartSession",
      requestType = com.ai.va.grpc.SessionRequest.class,
      responseType = com.ai.va.grpc.SessionResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.ai.va.grpc.SessionRequest,
      com.ai.va.grpc.SessionResponse> getStartSessionMethod() {
    io.grpc.MethodDescriptor<com.ai.va.grpc.SessionRequest, com.ai.va.grpc.SessionResponse> getStartSessionMethod;
    if ((getStartSessionMethod = ChatServiceGrpc.getStartSessionMethod) == null) {
      synchronized (ChatServiceGrpc.class) {
        if ((getStartSessionMethod = ChatServiceGrpc.getStartSessionMethod) == null) {
          ChatServiceGrpc.getStartSessionMethod = getStartSessionMethod =
              io.grpc.MethodDescriptor.<com.ai.va.grpc.SessionRequest, com.ai.va.grpc.SessionResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "StartSession"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.ai.va.grpc.SessionRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.ai.va.grpc.SessionResponse.getDefaultInstance()))
              .setSchemaDescriptor(new ChatServiceMethodDescriptorSupplier("StartSession"))
              .build();
        }
      }
    }
    return getStartSessionMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.ai.va.grpc.ChatRequest,
      com.ai.va.grpc.ChatResponse> getSendMessageStreamMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "SendMessageStream",
      requestType = com.ai.va.grpc.ChatRequest.class,
      responseType = com.ai.va.grpc.ChatResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.SERVER_STREAMING)
  public static io.grpc.MethodDescriptor<com.ai.va.grpc.ChatRequest,
      com.ai.va.grpc.ChatResponse> getSendMessageStreamMethod() {
    io.grpc.MethodDescriptor<com.ai.va.grpc.ChatRequest, com.ai.va.grpc.ChatResponse> getSendMessageStreamMethod;
    if ((getSendMessageStreamMethod = ChatServiceGrpc.getSendMessageStreamMethod) == null) {
      synchronized (ChatServiceGrpc.class) {
        if ((getSendMessageStreamMethod = ChatServiceGrpc.getSendMessageStreamMethod) == null) {
          ChatServiceGrpc.getSendMessageStreamMethod = getSendMessageStreamMethod =
              io.grpc.MethodDescriptor.<com.ai.va.grpc.ChatRequest, com.ai.va.grpc.ChatResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.SERVER_STREAMING)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "SendMessageStream"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.ai.va.grpc.ChatRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.ai.va.grpc.ChatResponse.getDefaultInstance()))
              .setSchemaDescriptor(new ChatServiceMethodDescriptorSupplier("SendMessageStream"))
              .build();
        }
      }
    }
    return getSendMessageStreamMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.ai.va.grpc.ChatRequest,
      com.ai.va.grpc.ChatResponse> getSendMessageMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "SendMessage",
      requestType = com.ai.va.grpc.ChatRequest.class,
      responseType = com.ai.va.grpc.ChatResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.ai.va.grpc.ChatRequest,
      com.ai.va.grpc.ChatResponse> getSendMessageMethod() {
    io.grpc.MethodDescriptor<com.ai.va.grpc.ChatRequest, com.ai.va.grpc.ChatResponse> getSendMessageMethod;
    if ((getSendMessageMethod = ChatServiceGrpc.getSendMessageMethod) == null) {
      synchronized (ChatServiceGrpc.class) {
        if ((getSendMessageMethod = ChatServiceGrpc.getSendMessageMethod) == null) {
          ChatServiceGrpc.getSendMessageMethod = getSendMessageMethod =
              io.grpc.MethodDescriptor.<com.ai.va.grpc.ChatRequest, com.ai.va.grpc.ChatResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "SendMessage"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.ai.va.grpc.ChatRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.ai.va.grpc.ChatResponse.getDefaultInstance()))
              .setSchemaDescriptor(new ChatServiceMethodDescriptorSupplier("SendMessage"))
              .build();
        }
      }
    }
    return getSendMessageMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.ai.va.grpc.EndSessionRequest,
      com.ai.va.grpc.EndSessionResponse> getEndSessionMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "EndSession",
      requestType = com.ai.va.grpc.EndSessionRequest.class,
      responseType = com.ai.va.grpc.EndSessionResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.ai.va.grpc.EndSessionRequest,
      com.ai.va.grpc.EndSessionResponse> getEndSessionMethod() {
    io.grpc.MethodDescriptor<com.ai.va.grpc.EndSessionRequest, com.ai.va.grpc.EndSessionResponse> getEndSessionMethod;
    if ((getEndSessionMethod = ChatServiceGrpc.getEndSessionMethod) == null) {
      synchronized (ChatServiceGrpc.class) {
        if ((getEndSessionMethod = ChatServiceGrpc.getEndSessionMethod) == null) {
          ChatServiceGrpc.getEndSessionMethod = getEndSessionMethod =
              io.grpc.MethodDescriptor.<com.ai.va.grpc.EndSessionRequest, com.ai.va.grpc.EndSessionResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "EndSession"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.ai.va.grpc.EndSessionRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.ai.va.grpc.EndSessionResponse.getDefaultInstance()))
              .setSchemaDescriptor(new ChatServiceMethodDescriptorSupplier("EndSession"))
              .build();
        }
      }
    }
    return getEndSessionMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.ai.va.grpc.HistoryRequest,
      com.ai.va.grpc.HistoryResponse> getGetHistoryMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "GetHistory",
      requestType = com.ai.va.grpc.HistoryRequest.class,
      responseType = com.ai.va.grpc.HistoryResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.ai.va.grpc.HistoryRequest,
      com.ai.va.grpc.HistoryResponse> getGetHistoryMethod() {
    io.grpc.MethodDescriptor<com.ai.va.grpc.HistoryRequest, com.ai.va.grpc.HistoryResponse> getGetHistoryMethod;
    if ((getGetHistoryMethod = ChatServiceGrpc.getGetHistoryMethod) == null) {
      synchronized (ChatServiceGrpc.class) {
        if ((getGetHistoryMethod = ChatServiceGrpc.getGetHistoryMethod) == null) {
          ChatServiceGrpc.getGetHistoryMethod = getGetHistoryMethod =
              io.grpc.MethodDescriptor.<com.ai.va.grpc.HistoryRequest, com.ai.va.grpc.HistoryResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "GetHistory"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.ai.va.grpc.HistoryRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.ai.va.grpc.HistoryResponse.getDefaultInstance()))
              .setSchemaDescriptor(new ChatServiceMethodDescriptorSupplier("GetHistory"))
              .build();
        }
      }
    }
    return getGetHistoryMethod;
  }

  /**
   * Creates a new async stub that supports all call types for the service
   */
  public static ChatServiceStub newStub(io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<ChatServiceStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<ChatServiceStub>() {
        @java.lang.Override
        public ChatServiceStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new ChatServiceStub(channel, callOptions);
        }
      };
    return ChatServiceStub.newStub(factory, channel);
  }

  /**
   * Creates a new blocking-style stub that supports unary and streaming output calls on the service
   */
  public static ChatServiceBlockingStub newBlockingStub(
      io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<ChatServiceBlockingStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<ChatServiceBlockingStub>() {
        @java.lang.Override
        public ChatServiceBlockingStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new ChatServiceBlockingStub(channel, callOptions);
        }
      };
    return ChatServiceBlockingStub.newStub(factory, channel);
  }

  /**
   * Creates a new ListenableFuture-style stub that supports unary calls on the service
   */
  public static ChatServiceFutureStub newFutureStub(
      io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<ChatServiceFutureStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<ChatServiceFutureStub>() {
        @java.lang.Override
        public ChatServiceFutureStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new ChatServiceFutureStub(channel, callOptions);
        }
      };
    return ChatServiceFutureStub.newStub(factory, channel);
  }

  /**
   * <pre>
   * Chat service with streaming support for real-time LLM responses
   * </pre>
   */
  public interface AsyncService {

    /**
     * <pre>
     * Initialize a new chat session
     * </pre>
     */
    default void startSession(com.ai.va.grpc.SessionRequest request,
        io.grpc.stub.StreamObserver<com.ai.va.grpc.SessionResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getStartSessionMethod(), responseObserver);
    }

    /**
     * <pre>
     * Send a message and get streaming response (for token-by-token LLM responses)
     * </pre>
     */
    default void sendMessageStream(com.ai.va.grpc.ChatRequest request,
        io.grpc.stub.StreamObserver<com.ai.va.grpc.ChatResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getSendMessageStreamMethod(), responseObserver);
    }

    /**
     * <pre>
     * Send a message and get single response (fallback to non-streaming)
     * </pre>
     */
    default void sendMessage(com.ai.va.grpc.ChatRequest request,
        io.grpc.stub.StreamObserver<com.ai.va.grpc.ChatResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getSendMessageMethod(), responseObserver);
    }

    /**
     * <pre>
     * End a chat session
     * </pre>
     */
    default void endSession(com.ai.va.grpc.EndSessionRequest request,
        io.grpc.stub.StreamObserver<com.ai.va.grpc.EndSessionResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getEndSessionMethod(), responseObserver);
    }

    /**
     * <pre>
     * Get chat history
     * </pre>
     */
    default void getHistory(com.ai.va.grpc.HistoryRequest request,
        io.grpc.stub.StreamObserver<com.ai.va.grpc.HistoryResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getGetHistoryMethod(), responseObserver);
    }
  }

  /**
   * Base class for the server implementation of the service ChatService.
   * <pre>
   * Chat service with streaming support for real-time LLM responses
   * </pre>
   */
  public static abstract class ChatServiceImplBase
      implements io.grpc.BindableService, AsyncService {

    @java.lang.Override public final io.grpc.ServerServiceDefinition bindService() {
      return ChatServiceGrpc.bindService(this);
    }
  }

  /**
   * A stub to allow clients to do asynchronous rpc calls to service ChatService.
   * <pre>
   * Chat service with streaming support for real-time LLM responses
   * </pre>
   */
  public static final class ChatServiceStub
      extends io.grpc.stub.AbstractAsyncStub<ChatServiceStub> {
    private ChatServiceStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected ChatServiceStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new ChatServiceStub(channel, callOptions);
    }

    /**
     * <pre>
     * Initialize a new chat session
     * </pre>
     */
    public void startSession(com.ai.va.grpc.SessionRequest request,
        io.grpc.stub.StreamObserver<com.ai.va.grpc.SessionResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getStartSessionMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     * <pre>
     * Send a message and get streaming response (for token-by-token LLM responses)
     * </pre>
     */
    public void sendMessageStream(com.ai.va.grpc.ChatRequest request,
        io.grpc.stub.StreamObserver<com.ai.va.grpc.ChatResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncServerStreamingCall(
          getChannel().newCall(getSendMessageStreamMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     * <pre>
     * Send a message and get single response (fallback to non-streaming)
     * </pre>
     */
    public void sendMessage(com.ai.va.grpc.ChatRequest request,
        io.grpc.stub.StreamObserver<com.ai.va.grpc.ChatResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getSendMessageMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     * <pre>
     * End a chat session
     * </pre>
     */
    public void endSession(com.ai.va.grpc.EndSessionRequest request,
        io.grpc.stub.StreamObserver<com.ai.va.grpc.EndSessionResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getEndSessionMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     * <pre>
     * Get chat history
     * </pre>
     */
    public void getHistory(com.ai.va.grpc.HistoryRequest request,
        io.grpc.stub.StreamObserver<com.ai.va.grpc.HistoryResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getGetHistoryMethod(), getCallOptions()), request, responseObserver);
    }
  }

  /**
   * A stub to allow clients to do synchronous rpc calls to service ChatService.
   * <pre>
   * Chat service with streaming support for real-time LLM responses
   * </pre>
   */
  public static final class ChatServiceBlockingStub
      extends io.grpc.stub.AbstractBlockingStub<ChatServiceBlockingStub> {
    private ChatServiceBlockingStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected ChatServiceBlockingStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new ChatServiceBlockingStub(channel, callOptions);
    }

    /**
     * <pre>
     * Initialize a new chat session
     * </pre>
     */
    public com.ai.va.grpc.SessionResponse startSession(com.ai.va.grpc.SessionRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getStartSessionMethod(), getCallOptions(), request);
    }

    /**
     * <pre>
     * Send a message and get streaming response (for token-by-token LLM responses)
     * </pre>
     */
    public java.util.Iterator<com.ai.va.grpc.ChatResponse> sendMessageStream(
        com.ai.va.grpc.ChatRequest request) {
      return io.grpc.stub.ClientCalls.blockingServerStreamingCall(
          getChannel(), getSendMessageStreamMethod(), getCallOptions(), request);
    }

    /**
     * <pre>
     * Send a message and get single response (fallback to non-streaming)
     * </pre>
     */
    public com.ai.va.grpc.ChatResponse sendMessage(com.ai.va.grpc.ChatRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getSendMessageMethod(), getCallOptions(), request);
    }

    /**
     * <pre>
     * End a chat session
     * </pre>
     */
    public com.ai.va.grpc.EndSessionResponse endSession(com.ai.va.grpc.EndSessionRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getEndSessionMethod(), getCallOptions(), request);
    }

    /**
     * <pre>
     * Get chat history
     * </pre>
     */
    public com.ai.va.grpc.HistoryResponse getHistory(com.ai.va.grpc.HistoryRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getGetHistoryMethod(), getCallOptions(), request);
    }
  }

  /**
   * A stub to allow clients to do ListenableFuture-style rpc calls to service ChatService.
   * <pre>
   * Chat service with streaming support for real-time LLM responses
   * </pre>
   */
  public static final class ChatServiceFutureStub
      extends io.grpc.stub.AbstractFutureStub<ChatServiceFutureStub> {
    private ChatServiceFutureStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected ChatServiceFutureStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new ChatServiceFutureStub(channel, callOptions);
    }

    /**
     * <pre>
     * Initialize a new chat session
     * </pre>
     */
    public com.google.common.util.concurrent.ListenableFuture<com.ai.va.grpc.SessionResponse> startSession(
        com.ai.va.grpc.SessionRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getStartSessionMethod(), getCallOptions()), request);
    }

    /**
     * <pre>
     * Send a message and get single response (fallback to non-streaming)
     * </pre>
     */
    public com.google.common.util.concurrent.ListenableFuture<com.ai.va.grpc.ChatResponse> sendMessage(
        com.ai.va.grpc.ChatRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getSendMessageMethod(), getCallOptions()), request);
    }

    /**
     * <pre>
     * End a chat session
     * </pre>
     */
    public com.google.common.util.concurrent.ListenableFuture<com.ai.va.grpc.EndSessionResponse> endSession(
        com.ai.va.grpc.EndSessionRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getEndSessionMethod(), getCallOptions()), request);
    }

    /**
     * <pre>
     * Get chat history
     * </pre>
     */
    public com.google.common.util.concurrent.ListenableFuture<com.ai.va.grpc.HistoryResponse> getHistory(
        com.ai.va.grpc.HistoryRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getGetHistoryMethod(), getCallOptions()), request);
    }
  }

  private static final int METHODID_START_SESSION = 0;
  private static final int METHODID_SEND_MESSAGE_STREAM = 1;
  private static final int METHODID_SEND_MESSAGE = 2;
  private static final int METHODID_END_SESSION = 3;
  private static final int METHODID_GET_HISTORY = 4;

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
        case METHODID_START_SESSION:
          serviceImpl.startSession((com.ai.va.grpc.SessionRequest) request,
              (io.grpc.stub.StreamObserver<com.ai.va.grpc.SessionResponse>) responseObserver);
          break;
        case METHODID_SEND_MESSAGE_STREAM:
          serviceImpl.sendMessageStream((com.ai.va.grpc.ChatRequest) request,
              (io.grpc.stub.StreamObserver<com.ai.va.grpc.ChatResponse>) responseObserver);
          break;
        case METHODID_SEND_MESSAGE:
          serviceImpl.sendMessage((com.ai.va.grpc.ChatRequest) request,
              (io.grpc.stub.StreamObserver<com.ai.va.grpc.ChatResponse>) responseObserver);
          break;
        case METHODID_END_SESSION:
          serviceImpl.endSession((com.ai.va.grpc.EndSessionRequest) request,
              (io.grpc.stub.StreamObserver<com.ai.va.grpc.EndSessionResponse>) responseObserver);
          break;
        case METHODID_GET_HISTORY:
          serviceImpl.getHistory((com.ai.va.grpc.HistoryRequest) request,
              (io.grpc.stub.StreamObserver<com.ai.va.grpc.HistoryResponse>) responseObserver);
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
        default:
          throw new AssertionError();
      }
    }
  }

  public static final io.grpc.ServerServiceDefinition bindService(AsyncService service) {
    return io.grpc.ServerServiceDefinition.builder(getServiceDescriptor())
        .addMethod(
          getStartSessionMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.ai.va.grpc.SessionRequest,
              com.ai.va.grpc.SessionResponse>(
                service, METHODID_START_SESSION)))
        .addMethod(
          getSendMessageStreamMethod(),
          io.grpc.stub.ServerCalls.asyncServerStreamingCall(
            new MethodHandlers<
              com.ai.va.grpc.ChatRequest,
              com.ai.va.grpc.ChatResponse>(
                service, METHODID_SEND_MESSAGE_STREAM)))
        .addMethod(
          getSendMessageMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.ai.va.grpc.ChatRequest,
              com.ai.va.grpc.ChatResponse>(
                service, METHODID_SEND_MESSAGE)))
        .addMethod(
          getEndSessionMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.ai.va.grpc.EndSessionRequest,
              com.ai.va.grpc.EndSessionResponse>(
                service, METHODID_END_SESSION)))
        .addMethod(
          getGetHistoryMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.ai.va.grpc.HistoryRequest,
              com.ai.va.grpc.HistoryResponse>(
                service, METHODID_GET_HISTORY)))
        .build();
  }

  private static abstract class ChatServiceBaseDescriptorSupplier
      implements io.grpc.protobuf.ProtoFileDescriptorSupplier, io.grpc.protobuf.ProtoServiceDescriptorSupplier {
    ChatServiceBaseDescriptorSupplier() {}

    @java.lang.Override
    public com.google.protobuf.Descriptors.FileDescriptor getFileDescriptor() {
      return com.ai.va.grpc.ChatProto.getDescriptor();
    }

    @java.lang.Override
    public com.google.protobuf.Descriptors.ServiceDescriptor getServiceDescriptor() {
      return getFileDescriptor().findServiceByName("ChatService");
    }
  }

  private static final class ChatServiceFileDescriptorSupplier
      extends ChatServiceBaseDescriptorSupplier {
    ChatServiceFileDescriptorSupplier() {}
  }

  private static final class ChatServiceMethodDescriptorSupplier
      extends ChatServiceBaseDescriptorSupplier
      implements io.grpc.protobuf.ProtoMethodDescriptorSupplier {
    private final java.lang.String methodName;

    ChatServiceMethodDescriptorSupplier(java.lang.String methodName) {
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
      synchronized (ChatServiceGrpc.class) {
        result = serviceDescriptor;
        if (result == null) {
          serviceDescriptor = result = io.grpc.ServiceDescriptor.newBuilder(SERVICE_NAME)
              .setSchemaDescriptor(new ChatServiceFileDescriptorSupplier())
              .addMethod(getStartSessionMethod())
              .addMethod(getSendMessageStreamMethod())
              .addMethod(getSendMessageMethod())
              .addMethod(getEndSessionMethod())
              .addMethod(getGetHistoryMethod())
              .build();
        }
      }
    }
    return result;
  }
}
