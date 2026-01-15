package com.ai.va.config;

import com.ai.common.logging.LogFactory;
import com.ai.va.grpc.ChatServiceImpl;
import com.ai.va.grpc.VoiceServiceImpl;
import io.grpc.Server;
import io.grpc.ServerBuilder;
import org.slf4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;
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

    @Autowired
    private VoiceServiceImpl voiceService;

    private Server grpcServer;

    @PostConstruct
    public void startGrpcServer() throws IOException {
        grpcServer = ServerBuilder.forPort(grpcPort)
            .addService(chatService)
            .addService(voiceService)
            .build()
            .start();

        logger.info("✅ gRPC Server started on port {}", grpcPort);

        // Graceful shutdown hook
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            logger.info("Shutting down gRPC server");
            if (grpcServer != null) {
                grpcServer.shutdown();
            }
        }));
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
