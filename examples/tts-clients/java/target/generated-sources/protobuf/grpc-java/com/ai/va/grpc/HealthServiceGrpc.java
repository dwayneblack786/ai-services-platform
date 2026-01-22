package com.ai.va.grpc;

import static io.grpc.MethodDescriptor.generateFullMethodName;

/**
 * <pre>
 * Health check service
 * </pre>
 */
@javax.annotation.Generated(
    value = "by gRPC proto compiler (version 1.60.0)",
    comments = "Source: voice.proto")
@io.grpc.stub.annotations.GrpcGenerated
public final class HealthServiceGrpc {

  private HealthServiceGrpc() {}

  public static final java.lang.String SERVICE_NAME = "com.ai.va.grpc.HealthService";

  // Static method descriptors that strictly reflect the proto.
  private static volatile io.grpc.MethodDescriptor<com.ai.va.grpc.HealthCheckRequest,
      com.ai.va.grpc.HealthCheckResponse> getCheckMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "Check",
      requestType = com.ai.va.grpc.HealthCheckRequest.class,
      responseType = com.ai.va.grpc.HealthCheckResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.ai.va.grpc.HealthCheckRequest,
      com.ai.va.grpc.HealthCheckResponse> getCheckMethod() {
    io.grpc.MethodDescriptor<com.ai.va.grpc.HealthCheckRequest, com.ai.va.grpc.HealthCheckResponse> getCheckMethod;
    if ((getCheckMethod = HealthServiceGrpc.getCheckMethod) == null) {
      synchronized (HealthServiceGrpc.class) {
        if ((getCheckMethod = HealthServiceGrpc.getCheckMethod) == null) {
          HealthServiceGrpc.getCheckMethod = getCheckMethod =
              io.grpc.MethodDescriptor.<com.ai.va.grpc.HealthCheckRequest, com.ai.va.grpc.HealthCheckResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "Check"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.ai.va.grpc.HealthCheckRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.ai.va.grpc.HealthCheckResponse.getDefaultInstance()))
              .setSchemaDescriptor(new HealthServiceMethodDescriptorSupplier("Check"))
              .build();
        }
      }
    }
    return getCheckMethod;
  }

  /**
   * Creates a new async stub that supports all call types for the service
   */
  public static HealthServiceStub newStub(io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<HealthServiceStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<HealthServiceStub>() {
        @java.lang.Override
        public HealthServiceStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new HealthServiceStub(channel, callOptions);
        }
      };
    return HealthServiceStub.newStub(factory, channel);
  }

  /**
   * Creates a new blocking-style stub that supports unary and streaming output calls on the service
   */
  public static HealthServiceBlockingStub newBlockingStub(
      io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<HealthServiceBlockingStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<HealthServiceBlockingStub>() {
        @java.lang.Override
        public HealthServiceBlockingStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new HealthServiceBlockingStub(channel, callOptions);
        }
      };
    return HealthServiceBlockingStub.newStub(factory, channel);
  }

  /**
   * Creates a new ListenableFuture-style stub that supports unary calls on the service
   */
  public static HealthServiceFutureStub newFutureStub(
      io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<HealthServiceFutureStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<HealthServiceFutureStub>() {
        @java.lang.Override
        public HealthServiceFutureStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new HealthServiceFutureStub(channel, callOptions);
        }
      };
    return HealthServiceFutureStub.newStub(factory, channel);
  }

  /**
   * <pre>
   * Health check service
   * </pre>
   */
  public interface AsyncService {

    /**
     * <pre>
     * Check health of voice service components
     * </pre>
     */
    default void check(com.ai.va.grpc.HealthCheckRequest request,
        io.grpc.stub.StreamObserver<com.ai.va.grpc.HealthCheckResponse> responseObserver) {
      io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall(getCheckMethod(), responseObserver);
    }
  }

  /**
   * Base class for the server implementation of the service HealthService.
   * <pre>
   * Health check service
   * </pre>
   */
  public static abstract class HealthServiceImplBase
      implements io.grpc.BindableService, AsyncService {

    @java.lang.Override public final io.grpc.ServerServiceDefinition bindService() {
      return HealthServiceGrpc.bindService(this);
    }
  }

  /**
   * A stub to allow clients to do asynchronous rpc calls to service HealthService.
   * <pre>
   * Health check service
   * </pre>
   */
  public static final class HealthServiceStub
      extends io.grpc.stub.AbstractAsyncStub<HealthServiceStub> {
    private HealthServiceStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected HealthServiceStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new HealthServiceStub(channel, callOptions);
    }

    /**
     * <pre>
     * Check health of voice service components
     * </pre>
     */
    public void check(com.ai.va.grpc.HealthCheckRequest request,
        io.grpc.stub.StreamObserver<com.ai.va.grpc.HealthCheckResponse> responseObserver) {
      io.grpc.stub.ClientCalls.asyncUnaryCall(
          getChannel().newCall(getCheckMethod(), getCallOptions()), request, responseObserver);
    }
  }

  /**
   * A stub to allow clients to do synchronous rpc calls to service HealthService.
   * <pre>
   * Health check service
   * </pre>
   */
  public static final class HealthServiceBlockingStub
      extends io.grpc.stub.AbstractBlockingStub<HealthServiceBlockingStub> {
    private HealthServiceBlockingStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected HealthServiceBlockingStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new HealthServiceBlockingStub(channel, callOptions);
    }

    /**
     * <pre>
     * Check health of voice service components
     * </pre>
     */
    public com.ai.va.grpc.HealthCheckResponse check(com.ai.va.grpc.HealthCheckRequest request) {
      return io.grpc.stub.ClientCalls.blockingUnaryCall(
          getChannel(), getCheckMethod(), getCallOptions(), request);
    }
  }

  /**
   * A stub to allow clients to do ListenableFuture-style rpc calls to service HealthService.
   * <pre>
   * Health check service
   * </pre>
   */
  public static final class HealthServiceFutureStub
      extends io.grpc.stub.AbstractFutureStub<HealthServiceFutureStub> {
    private HealthServiceFutureStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected HealthServiceFutureStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new HealthServiceFutureStub(channel, callOptions);
    }

    /**
     * <pre>
     * Check health of voice service components
     * </pre>
     */
    public com.google.common.util.concurrent.ListenableFuture<com.ai.va.grpc.HealthCheckResponse> check(
        com.ai.va.grpc.HealthCheckRequest request) {
      return io.grpc.stub.ClientCalls.futureUnaryCall(
          getChannel().newCall(getCheckMethod(), getCallOptions()), request);
    }
  }

  private static final int METHODID_CHECK = 0;

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
        case METHODID_CHECK:
          serviceImpl.check((com.ai.va.grpc.HealthCheckRequest) request,
              (io.grpc.stub.StreamObserver<com.ai.va.grpc.HealthCheckResponse>) responseObserver);
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
          getCheckMethod(),
          io.grpc.stub.ServerCalls.asyncUnaryCall(
            new MethodHandlers<
              com.ai.va.grpc.HealthCheckRequest,
              com.ai.va.grpc.HealthCheckResponse>(
                service, METHODID_CHECK)))
        .build();
  }

  private static abstract class HealthServiceBaseDescriptorSupplier
      implements io.grpc.protobuf.ProtoFileDescriptorSupplier, io.grpc.protobuf.ProtoServiceDescriptorSupplier {
    HealthServiceBaseDescriptorSupplier() {}

    @java.lang.Override
    public com.google.protobuf.Descriptors.FileDescriptor getFileDescriptor() {
      return com.ai.va.grpc.VoiceProto.getDescriptor();
    }

    @java.lang.Override
    public com.google.protobuf.Descriptors.ServiceDescriptor getServiceDescriptor() {
      return getFileDescriptor().findServiceByName("HealthService");
    }
  }

  private static final class HealthServiceFileDescriptorSupplier
      extends HealthServiceBaseDescriptorSupplier {
    HealthServiceFileDescriptorSupplier() {}
  }

  private static final class HealthServiceMethodDescriptorSupplier
      extends HealthServiceBaseDescriptorSupplier
      implements io.grpc.protobuf.ProtoMethodDescriptorSupplier {
    private final java.lang.String methodName;

    HealthServiceMethodDescriptorSupplier(java.lang.String methodName) {
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
      synchronized (HealthServiceGrpc.class) {
        result = serviceDescriptor;
        if (result == null) {
          serviceDescriptor = result = io.grpc.ServiceDescriptor.newBuilder(SERVICE_NAME)
              .setSchemaDescriptor(new HealthServiceFileDescriptorSupplier())
              .addMethod(getCheckMethod())
              .build();
        }
      }
    }
    return result;
  }
}
