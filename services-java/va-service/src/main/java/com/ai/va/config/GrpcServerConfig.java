package com.ai.va.config;

import com.ai.common.logging.LogFactory;
import com.ai.va.grpc.ChatServiceImpl;
import io.grpc.Server;
import io.grpc.ServerBuilder;
import org.slf4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.io.IOException;

/**
 * gRPC Server Configuration
 * Starts gRPC server on a separate port from HTTP REST API
 */
@Configuration
public class GrpcServerConfig {

    private static final Logger logger = LogFactory.getLogger(GrpcServerConfig.class);

    @Value("${grpc.server.port:50051}")
    private int grpcPort;

    @Autowired
    private ChatServiceImpl chatService;

    private Server grpcServer;

    public GrpcServerConfig() {
        logger.info("🔧 GrpcServerConfig constructor called - bean is being created");
    }

    @PostConstruct
    public void startGrpcServer() {
        try {
            logger.info("Initializing gRPC Server on port {}...", grpcPort);
            
            grpcServer = ServerBuilder.forPort(grpcPort)
                .addService(chatService)
                .build()
                .start();

            logger.info("✅ gRPC Server started successfully on port {}", grpcPort);

            // Graceful shutdown hook
            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                logger.info("Shutting down gRPC server");
                if (grpcServer != null) {
                    grpcServer.shutdown();
                }
            }));
        } catch (IOException e) {
            logger.error("❌ Failed to start gRPC server on port {}: {}", grpcPort, e.getMessage(), e);
            throw new RuntimeException("Failed to start gRPC server", e);
        } catch (Exception e) {
            logger.error("❌ Unexpected error starting gRPC server: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to start gRPC server", e);
        }
    }

    @PreDestroy
    public void stopGrpcServer() {
        if (grpcServer != null) {
            logger.info("Stopping gRPC server");
            grpcServer.shutdown();
        }
    }

    @Bean
    public Server grpcServer() {
        return grpcServer;
    }
}
